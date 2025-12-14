"use client";

import React, { useState, useCallback, useEffect } from 'react';
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

import LuaEditorModal from '../editor/LuaEditorModal';
import { Button } from '@/components/ui/button';
import { exportToRust } from '@/lib/flow-compiler';
import { deployChannel } from '@/lib/api';
import { Play, Save } from 'lucide-react';

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

const initialNodesList: Node<NodeData>[] = [
    {
        id: '1',
        type: 'httpListener',
        position: { x: 100, y: 150 },
        data: { label: 'HTTP Listener', port: 8080, path: '/api/messages' }
    },
    {
        id: '2',
        type: 'hl7Parser',
        position: { x: 400, y: 100 },
        data: { label: 'HL7 Parser', inputFormat: 'hl7v2', outputFormat: 'fhir' }
    },
    {
        id: '3',
        type: 'luaScript',
        position: { x: 400, y: 280 },
        data: {
            label: 'Transform Data',
            code: '-- Transform message\nlocal json = require("json")\nlocal data = json.decode(msg.content)\ndata.processed = true\nreturn json.encode(data)',
        }
    },
    {
        id: '4',
        type: 'fileWriter',
        position: { x: 750, y: 150 },
        data: { label: 'File Writer', path: './output', filename: '${timestamp}.json' }
    },
];

const initialEdges: Edge[] = [
    { id: 'e1-2', source: '1', target: '2', animated: true },
    { id: 'e2-3', source: '2', target: '3', animated: true },
    { id: 'e3-4', source: '3', target: '4', animated: true },
];

export default function FlowCanvas({ nodeToAdd, onDeploySuccess, onDeployError }: FlowCanvasProps) {
    const [nodes, setNodes, onNodesChange] = useNodesState<NodeData>(initialNodesList);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
    const [editorCode, setEditorCode] = useState("");
    const [isDeploying, setIsDeploying] = useState(false);

    const onConnect = useCallback(
        (params: Connection) => setEdges((eds) => addEdge({ ...params, animated: true }, eds)),
        [setEdges],
    );

    // Handle inline data changes for any node
    const handleDataChange = useCallback((nodeId: string, field: string, value: any) => {
        setNodes((nds) => nds.map((node) => {
            if (node.id === nodeId) {
                return {
                    ...node,
                    data: {
                        ...node.data,
                        [field]: value,
                    }
                };
            }
            return node;
        }));
    }, [setNodes]);

    const handleEditCode = useCallback((nodeId: string, currentCode: string) => {
        setEditingNodeId(nodeId);
        setEditorCode(currentCode);
        setIsEditorOpen(true);
    }, []);

    const handleSaveScript = (newCode: string) => {
        if (editingNodeId) {
            setNodes((nds) => nds.map((node) => {
                if (node.id === editingNodeId) {
                    return {
                        ...node,
                        data: {
                            ...node.data,
                            code: newCode,
                        }
                    };
                }
                return node;
            }));
        }
        setIsEditorOpen(false);
        setEditingNodeId(null);
    };

    const handleDeploy = async () => {
        setIsDeploying(true);
        const payload = exportToRust(nodes, edges, "My Channel");
        console.log("Deploying:", payload);
        try {
            await deployChannel(payload);
            onDeploySuccess?.();
        } catch (e) {
            onDeployError?.();
            console.error(e);
        } finally {
            setIsDeploying(false);
        }
    };

    // Attach callbacks to all nodes
    useEffect(() => {
        setNodes((nds) => nds.map(node => {
            const baseCallbacks = {
                onDataChange: (field: string, value: any) => handleDataChange(node.id, field, value),
            };

            // Add code editing callback for nodes that need it
            if (['luaScript', 'filter', 'databasePoller', 'databaseWriter'].includes(node.type || '')) {
                return {
                    ...node,
                    data: {
                        ...node.data,
                        ...baseCallbacks,
                        onEdit: (code: string) => handleEditCode(node.id, code),
                        onEditCondition: (condition: string) => handleEditCode(node.id, condition),
                        onEditQuery: (query: string) => handleEditCode(node.id, query),
                    }
                };
            }

            return {
                ...node,
                data: {
                    ...node.data,
                    ...baseCallbacks,
                }
            };
        }));
    }, [handleDataChange, handleEditCode, setNodes]);

    // Handle adding new nodes from sidebar
    useEffect(() => {
        if (nodeToAdd) {
            const newId = `node-${Date.now()}`;
            const basePosition = { x: 300, y: 200 + Math.random() * 100 };

            const nodeDefaults: Record<string, NodeData> = {
                // Sources
                httpListener: { label: 'HTTP Listener', port: 8080, path: '/' },
                tcpListener: { label: 'TCP Listener', port: 9090 },
                fileReader: { label: 'File Reader', path: '/data/input', pattern: '*.txt' },
                databasePoller: { label: 'Database Poller', query: 'SELECT * FROM messages', interval: 60 },
                // Processors
                luaScript: { label: 'Lua Script', code: '-- Your code here\nreturn msg.content' },
                mapper: { label: 'Field Mapper', mappings: [{ source: 'field1', target: 'newField1' }] },
                filter: { label: 'Message Filter', condition: 'msg.type == "HL7"' },
                router: { label: 'Content Router', routes: [{ name: 'Route A', condition: '' }] },
                hl7Parser: { label: 'HL7 Parser', inputFormat: 'hl7v2', outputFormat: 'fhir' },
                // Destinations
                fileWriter: { label: 'File Writer', path: './output', filename: '${timestamp}.txt' },
                httpSender: { label: 'HTTP Sender', url: 'https://api.example.com', method: 'POST' },
                databaseWriter: { label: 'Database Writer', table: 'messages', mode: 'insert' },
                tcpSender: { label: 'TCP Sender', host: '127.0.0.1', port: 9000 },
            };

            const defaultData = nodeDefaults[nodeToAdd] || { label: 'New Node' };

            const newNode: Node<NodeData> = {
                id: newId,
                type: nodeToAdd,
                position: basePosition,
                data: {
                    ...defaultData,
                    onDataChange: (field: string, value: any) => handleDataChange(newId, field, value),
                }
            };

            // Add code editing callbacks if needed
            if (['luaScript', 'filter', 'databasePoller', 'databaseWriter'].includes(nodeToAdd)) {
                newNode.data.onEdit = (code: string) => handleEditCode(newId, code);
                newNode.data.onEditCondition = (condition: string) => handleEditCode(newId, condition);
                newNode.data.onEditQuery = (query: string) => handleEditCode(newId, query);
            }

            setNodes((nds) => [...nds, newNode]);
        }
    }, [nodeToAdd, handleDataChange, handleEditCode, setNodes]);

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
