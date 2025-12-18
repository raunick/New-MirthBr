"use client";

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useFlowStore } from '@/stores/useFlowStore';
import ReactFlow, {
    Background,
    Controls,
    MiniMap,
    Connection,
    BackgroundVariant,
    useReactFlow,
    ReactFlowProvider,
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
import LuaDestinationNode from './nodes/LuaDestinationNode';
import DeployNode from './nodes/DeployNode';

// Special Nodes
import TestNode from './nodes/TestNode';

// Utility Nodes
import IPNode from './nodes/IPNode';
import PortNode from './nodes/PortNode';
import TextNode from './nodes/TextNode';
import VariableNode from './nodes/VariableNode';
import CommentNode from './nodes/CommentNode';
import DelayNode from './nodes/DelayNode';
import LoggerNode from './nodes/LoggerNode';
import CounterNode from './nodes/CounterNode';
import TimestampNode from './nodes/TimestampNode';
import MergeNode from './nodes/MergeNode';

import ContextMenu from './ContextMenu';
import LuaEditorModal from '../editor/LuaEditorModal';
import ChannelSettingsModal from './ChannelSettingsModal';
import { Button } from '@/components/ui/button';
import { exportToRust } from '@/lib/flow-compiler';
import { deployChannel, testChannel } from '@/lib/api';
import { validateConnection } from '@/lib/connectionValidation';
import { Play, Save, Layout, Download, Upload, Settings, FilePlus } from 'lucide-react';
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
    luaDestination: LuaDestinationNode,
    // Special
    testNode: TestNode,
    deployNode: DeployNode,
    // Utility Nodes
    ipNode: IPNode,
    portNode: PortNode,
    textNode: TextNode,
    variableNode: VariableNode,
    commentNode: CommentNode,
    delayNode: DelayNode,
    loggerNode: LoggerNode,
    counterNode: CounterNode,
    timestampNode: TimestampNode,
    mergeNode: MergeNode,
};

interface FlowCanvasProps {
    onDeploySuccess?: () => void;
    onDeployError?: () => void;
}

interface MenuState {
    show: boolean;
    type: 'node' | 'edge' | 'pane';
    id: string;
    x: number;
    y: number;
}

function FlowCanvasInner({ onDeploySuccess, onDeployError }: FlowCanvasProps) {
    const reactFlowWrapper = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { screenToFlowPosition } = useReactFlow();

    const {
        nodes, edges, onNodesChange, onEdgesChange, onConnect,
        setNodes, updateNodeData, deleteNode, duplicateNode, deleteEdge,
        addNodeAtPosition, saveFlow, loadFlow, exportFlow, importFlow,
        channelName, setChannelName,
        maxRetries, setMaxRetries,
        isRunning, setRunning,
        errorDestinationId, setErrorDestinationId,
        resetFlow,
        // Editor modal state from store (replaces callback injection)
        editorState, closeEditor, saveEditorCode
    } = useFlowStore();

    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isDeploying, setIsDeploying] = useState(false);
    const [menu, setMenu] = useState<MenuState | null>(null);

    // Close menu on click outside
    const onPaneClick = useCallback(() => setMenu(null), []);

    // Context menu handlers
    const onNodeContextMenu = useCallback(
        (event: React.MouseEvent, node: { id: string }) => {
            event.preventDefault();
            setMenu({
                show: true,
                type: 'node',
                id: node.id,
                x: event.clientX,
                y: event.clientY,
            });
        },
        []
    );

    const onEdgeContextMenu = useCallback(
        (event: React.MouseEvent, edge: { id: string }) => {
            event.preventDefault();
            setMenu({
                show: true,
                type: 'edge',
                id: edge.id,
                x: event.clientX,
                y: event.clientY,
            });
        },
        []
    );

    const onPaneContextMenu = useCallback(
        (event: React.MouseEvent) => {
            event.preventDefault();
            setMenu({
                show: true,
                type: 'pane',
                id: '',
                x: event.clientX,
                y: event.clientY,
            });
        },
        []
    );

    // Drag and Drop handlers
    const onDragOver = useCallback((event: React.DragEvent) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    }, []);

    const onDrop = useCallback(
        (event: React.DragEvent) => {
            event.preventDefault();

            const type = event.dataTransfer.getData('application/reactflow');
            if (!type) return;

            const position = screenToFlowPosition({
                x: event.clientX,
                y: event.clientY,
            });

            addNodeAtPosition(type, position);
        },
        [screenToFlowPosition, addNodeAtPosition]
    );

    // Connection validation
    const isValidConnection = useCallback(
        (connection: Connection) => {
            const result = validateConnection(connection, nodes, edges);
            return result.valid;
        },
        [nodes, edges]
    );

    // Data change handler - still needed for inline edits
    const handleDataChange = useCallback((nodeId: string, field: string, value: any) => {
        updateNodeData(nodeId, field, value);
    }, [updateNodeData]);

    // handleEditCode and handleSaveScript removed - now handled via store.openEditor/saveEditorCode

    const handleNewChannel = useCallback(() => {
        if (confirm('Create new channel? Any unsaved changes will be lost.')) {
            resetFlow();
        }
    }, [resetFlow]);

    const handleDownload = useCallback(() => {
        exportFlow();
    }, [exportFlow]);

    const handleUpload = useCallback(() => {
        fileInputRef.current?.click();
    }, []);

    const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target?.result as string);
                if (data.nodes && Array.isArray(data.nodes)) {
                    importFlow(data);
                } else {
                    alert('Arquivo de workflow inválido');
                }
            } catch (err) {
                alert('Erro ao ler arquivo: ' + err);
            }
        };
        reader.readAsText(file);

        // Reset input so same file can be selected again
        event.target.value = '';
    }, [importFlow]);

    // Load flow on mount
    useEffect(() => {
        loadFlow();
    }, [loadFlow]);

    // Callback injection REMOVED - nodes now access store.openEditor/updateNodeData directly
    // This eliminates the O(n²) re-render issue where callbacks were injected on every nodes change

    return (
        <div className="w-full h-full relative" ref={reactFlowWrapper}>
            {/* Hidden file input for upload */}
            <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileChange}
                className="hidden"
            />

            {/* Toolbar */}
            <div className="absolute top-4 right-4 z-10 flex gap-2 items-center">
                <input
                    type="text"
                    value={channelName}
                    onChange={(e) => setChannelName(e.target.value)}
                    placeholder="Nome do Canal"
                    className="h-9 px-3 rounded-md bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[var(--foreground)] placeholder-[var(--foreground-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] w-48 text-sm"
                />
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNewChannel}
                    className="glass border-[var(--glass-border)] text-[var(--foreground)] hover:bg-[var(--glass-bg)]"
                    title="Create New Channel"
                >
                    <FilePlus size={16} className="mr-2" />
                    New Channel
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleUpload}
                    className="glass border-[var(--glass-border)] text-[var(--foreground)] hover:bg-[var(--glass-bg)]"
                    title="Carregar workflow de arquivo"
                >
                    <Upload size={16} className="mr-2" />
                    Upload
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownload}
                    className="glass border-[var(--glass-border)] text-[var(--foreground)] hover:bg-[var(--glass-bg)]"
                    title="Baixar workflow como arquivo"
                >
                    <Download size={16} className="mr-2" />
                    Download
                </Button>
                {/* Save button removed */}
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsSettingsOpen(true)}
                    className="glass border-[var(--glass-border)] text-[var(--foreground)] hover:bg-[var(--glass-bg)]"
                    title="Channel Settings (DLQ)"
                >
                    <Settings size={16} className="mr-2" />
                    Settings
                </Button>
                {/* Deploy button removed (replaced by DeployNode) */}
            </div>

            <ChannelSettingsModal
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                nodes={nodes}
                currentErrorDestinationId={errorDestinationId}
                currentMaxRetries={maxRetries}
                onSave={(destId, retries) => {
                    setErrorDestinationId(destId);
                    setMaxRetries(retries);
                }}
            />

            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onNodeContextMenu={onNodeContextMenu}
                onEdgeContextMenu={onEdgeContextMenu}
                onPaneContextMenu={onPaneContextMenu}
                onPaneClick={onPaneClick}
                onDragOver={onDragOver}
                onDrop={onDrop}
                isValidConnection={isValidConnection}
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
                        // Utility nodes
                        if (['ipNode', 'portNode', 'textNode', 'variableNode', 'commentNode', 'delayNode', 'loggerNode', 'counterNode', 'timestampNode', 'mergeNode'].includes(type)) {
                            return 'var(--warning)';
                        }
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

            {/* Context Menu */}
            {menu?.show && (
                <ContextMenu
                    id={menu.id}
                    type={menu.type}
                    top={menu.y}
                    left={menu.x}
                    onClose={() => setMenu(null)}
                    onDelete={(id) => menu.type === 'edge' ? deleteEdge(id) : deleteNode(id)}
                    onDuplicate={(id) => duplicateNode(id)}
                    onAddNode={(type) => {
                        const position = screenToFlowPosition({ x: menu.x, y: menu.y });
                        addNodeAtPosition(type, position);
                    }}
                />
            )}

            <LuaEditorModal
                isOpen={editorState.isOpen}
                initialCode={editorState.initialCode}
                onClose={closeEditor}
                onSave={saveEditorCode}
            />
        </div>
    );
}

// Wrap with ReactFlowProvider
export default function FlowCanvas(props: FlowCanvasProps) {
    return (
        <ReactFlowProvider>
            <FlowCanvasInner {...props} />
        </ReactFlowProvider>
    );
}
