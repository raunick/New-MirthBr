"use client";

import React, { useState, useCallback, useEffect } from 'react';
import { useFlowStore } from '@/stores/useFlowStore'; // Import store
import ReactFlow, {
    Background,
    Controls,
    MiniMap,
    useNodesState,
    useEdgesState,
    addEdge,
    Connection,
    Edge,
    Node,
    BackgroundVariant,
} from 'reactflow';
import 'reactflow/dist/style.css';

// Source Nodes
import HTTPSourceNode from './nodes/HTTPSourceNode';
import TCPSourceNode from './nodes/TCPSourceNode';
import FileReaderNode from './nodes/FileReaderNode';
import DatabasePollerNode from './nodes/DatabasePollerNode';

// Processor Nodes
import LuaScriptNode from './nodes/LuaScriptNode';
import MapperNode from './nodes/MapperNode';
import FilterNode from './nodes/FilterNode';
import RouterNode from './nodes/RouterNode';
import HL7ParserNode from './nodes/HL7ParserNode';

// Destination Nodes
import FileWriterNode from './nodes/FileWriterNode';
import HTTPSenderNode from './nodes/HTTPSenderNode';
import DatabaseWriterNode from './nodes/DatabaseWriterNode';
import TCPSenderNode from './nodes/TCPSenderNode';

import TestNode from './nodes/TestNode';

import LuaEditorModal from '../editor/LuaEditorModal';
import { Button } from '@/components/ui/button';
import { exportToRust } from '@/lib/flow-compiler';
import { deployChannel } from '@/lib/api';
import { Play, Save } from 'lucide-react';
import axios from 'axios';

const nodeTypes = {
    // Sources
    httpListener: HTTPSourceNode,
    tcpListener: TCPSourceNode,
    fileReader: FileReaderNode,
    databasePoller: DatabasePollerNode,
    // Processors
    luaScript: LuaScriptNode,
    mapper: MapperNode,
    filter: FilterNode,
    router: RouterNode,
    hl7Parser: HL7ParserNode,
    // Destinations
    fileWriter: FileWriterNode,
    httpSender: HTTPSenderNode,
    databaseWriter: DatabaseWriterNode,
    tcpSender: TCPSenderNode,
    // Special
    testNode: TestNode,
};

type NodeData = {
    label: string;
    [key: string]: any;
};

interface FlowCanvasProps {
    nodeToAdd?: string | null;
    onDeploySuccess?: () => void;
    onDeployError?: () => void;
}

// Initial data moved to store
// const initialNodesList ...
// const initialEdges ...

export default function FlowCanvas({ onDeploySuccess, onDeployError }: FlowCanvasProps) { // Removed nodeToAdd
    // Use Store
    const {
        nodes, edges, onNodesChange, onEdgesChange, onConnect,
        setNodes, updateNodeData
    } = useFlowStore();

    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
    const [editorCode, setEditorCode] = useState("");
    const [isDeploying, setIsDeploying] = useState(false);

    // handleDataChange uses store action now
    const handleDataChange = useCallback((nodeId: string, field: string, value: any) => {
        updateNodeData(nodeId, field, value);
    }, [updateNodeData]);

    const handleEditCode = useCallback((nodeId: string, currentCode: string) => {
        setEditingNodeId(nodeId);
        setEditorCode(currentCode);
        setIsEditorOpen(true);
    }, []);

    const handleSaveScript = (newCode: string) => {
        if (editingNodeId) {
            updateNodeData(editingNodeId, 'code', newCode);
        }
        setIsEditorOpen(false);
        setEditingNodeId(null);
    };

    const [channelId] = useState(() => crypto.randomUUID());

    const handleDeploy = async () => {
        setIsDeploying(true);
        // Use consistent Channel ID
        const payload = exportToRust(nodes, edges, "My Channel");
        payload.id = channelId;

        console.log("Deploying:", payload);
        try {
            await deployChannel(payload);
            onDeploySuccess?.();
            // Show success toast or log?
        } catch (e) {
            onDeployError?.();
            console.error(e);
        } finally {
            setIsDeploying(false);
        }
    };

    const handleTest = useCallback(async (payloadType: string, payloadContent: string) => {
        try {
            await axios.post(`http://localhost:3001/api/channels/${channelId}/test`, {
                payload_type: payloadType,
                payload: payloadContent
            });
        } catch (e: any) {
            console.error(e);
            throw e; // Let node handle error display
        }
    }, [channelId]);

    // Callback injection Effect
    // Replaces the old useEffect that mutated nodes deeply.
    // To avoid infinite loops, we only update if callback is missing.
    // However, since handleTest and handleEditCode depend on local state (editor open, channelId),
    // we need to be careful.

    // Ideally, we shouldn't mute nodes in store for callbacks.
    // But for this refactor, let's keep it but ensure reference stability.
    // Or simpler: Just update the specific node that needs it?

    // Actually, updateNodeData in store merges data. 
    // We can use a simpler approach: Just pass these handlers to the Context Provider? 
    // But ReactFlow nodes don't easily consume context without wrapper.

    // Let's stick to the Effect but optimize it: only update if missing.
    useEffect(() => {
        let changed = false;
        const newNodes = nodes.map(node => {
            const data = node.data;
            let newData = { ...data };
            let modified = false;

            // Base Callbacks
            if (!data.onDataChange) {
                newData.onDataChange = (field: string, value: any) => handleDataChange(node.id, field, value);
                modified = true;
            }

            // Edit Callbacks
            if (['luaScript', 'filter', 'databasePoller', 'databaseWriter'].includes(node.type || '')) {
                if (!data.onEdit) {
                    newData.onEdit = (code: string) => handleEditCode(node.id, code);
                    modified = true;
                }
                // ... others omitted for brevity, assuming standard edit is main one. 
                // Full impl:
                if (!data.onEditCondition) { newData.onEditCondition = (c: string) => handleEditCode(node.id, c); modified = true; }
                if (!data.onEditQuery) { newData.onEditQuery = (q: string) => handleEditCode(node.id, q); modified = true; }
            }

            // Test Callback
            if (node.type === 'testNode') {
                // Check if onTest reference is stale? Hard to know. 
                // We'll just overwrite it if we believe handleTest changed (it depends on channelId).
                // But overwriting triggers store update -> render -> effect loop.
                // We need handleTest to be stable or reference-independent.
                // handleTest depends on channelId, which is stable (useState 1-time).
                if (!data.onTest) {
                    newData.onTest = handleTest;
                    modified = true;
                }
            }

            if (modified) {
                changed = true;
                return { ...node, data: newData };
            }
            return node;
        });

        if (changed) {
            // Bulk update to avoid multiple renders
            // setNodes from store replaces everything.
            setNodes(newNodes);
        }
    }, [nodes, handleDataChange, handleEditCode, handleTest, setNodes]); // Dependencies need to be stable!

    return (
        <div className="w-full h-full relative">
            {/* Toolbar */}
            <div className="absolute top-4 right-4 z-10 flex gap-2">
                <Button
                    variant="outline"
                    size="sm"
                    className="glass border-[var(--glass-border)] text-[var(--foreground)] hover:bg-[var(--glass-bg)]"
                >
                    <Save size={16} className="mr-2" />
                    Save
                </Button>
                <Button
                    onClick={handleDeploy}
                    disabled={isDeploying}
                    size="sm"
                    className="bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] hover:opacity-90 transition-opacity"
                >
                    <Play size={16} className="mr-2" />
                    {isDeploying ? 'Deploying...' : 'Deploy Channel'}
                </Button>
            </div>

            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                nodeTypes={nodeTypes}
                fitView
                defaultEdgeOptions={{
                    type: 'smoothstep',
                    animated: true,
                }}
            >
                <Background
                    variant={BackgroundVariant.Dots}
                    gap={20}
                    size={1}
                    color="rgba(148, 163, 184, 0.15)"
                />
                <Controls />
                <MiniMap
                    nodeColor={(node) => {
                        const type = node.type || '';
                        if (type.includes('http') || type.includes('tcp') || type.includes('file') || type.includes('database')) {
                            if (type.includes('Sender') || type.includes('Writer')) {
                                return 'var(--node-destination)';
                            }
                            return 'var(--node-source)';
                        }
                        if (type.includes('lua') || type.includes('mapper') || type.includes('filter') || type.includes('router') || type.includes('hl7')) {
                            return 'var(--node-processor)';
                        }
                        return 'var(--primary)';
                    }}
                    maskColor="rgba(15, 23, 42, 0.8)"
                />
            </ReactFlow>

            <LuaEditorModal
                isOpen={isEditorOpen}
                initialCode={editorCode}
                onClose={() => setIsEditorOpen(false)}
                onSave={handleSaveScript}
            />
        </div>
    );
}
