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
// Destination Nodes
import FileWriterNode from './nodes/FileWriterNode';
import HTTPSenderNode from './nodes/HTTPSenderNode';
import DatabaseWriterNode from './nodes/DatabaseWriterNode';
import TCPSenderNode from './nodes/TCPSenderNode';
import LuaDestinationNode from './nodes/LuaDestinationNode';

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
import { deployChannel, testChannel, deleteChannel } from '@/lib/api';
import { validateConnection } from '@/lib/connectionValidation';
import { Play, Save, Layout, Download, Upload, Settings, FilePlus, Trash2, AlertTriangle } from 'lucide-react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
    // Destinations
    fileWriter: FileWriterNode,
    httpSender: HTTPSenderNode,
    databaseWriter: DatabaseWriterNode,
    tcpSender: TCPSenderNode,
    luaDestination: LuaDestinationNode,
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
}

interface MenuState {
    show: boolean;
    type: 'node' | 'edge' | 'pane';
    id: string;
    x: number;
    y: number;
}

function FlowCanvasInner({ }: FlowCanvasProps) {
    const reactFlowWrapper = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { screenToFlowPosition } = useReactFlow();

    const {
        nodes, edges, onNodesChange, onEdgesChange, onConnect,
        setNodes, updateNodeData, deleteNode, duplicateNode, deleteEdge,
        addNodeAtPosition, saveFlow, loadFlow, exportFlow, importFlow,
        channelName, setChannelName, channelId,
        maxRetries, setMaxRetries,
        isRunning, setRunning,
        errorDestinationId, setErrorDestinationId,
        resetFlow,
        // Editor modal state from store (replaces callback injection)
        editorState, closeEditor, saveEditorCode
    } = useFlowStore();

    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
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

    const handleDeleteChannelClick = () => {
        setIsDeleteDialogOpen(true);
    };

    const handleConfirmDeleteChannel = useCallback(async () => {
        try {
            if (channelId) {
                await deleteChannel(channelId);
            }
            // Reset flow ONLY after successful deletion
            resetFlow();
            setIsDeleteDialogOpen(false);
        } catch (error: any) {
            console.error("Failed to delete channel", error);
            const msg = error.response?.data?.error || error.message || "Unknown error";
            alert(`Failed to delete channel: ${msg}`);
            // Do NOT reset flow if deletion fails, so user can see it's still there
            setIsDeleteDialogOpen(false);
        }
    }, [channelId, resetFlow]);

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
            <div className="absolute top-4 right-4 z-10 flex flex-col gap-2 items-end">
                {/* Channel Name */}
                <div className="flex gap-2 items-center p-1.5 rounded-lg glass border border-[var(--glass-border)] shadow-sm">
                    <input
                        type="text"
                        value={channelName}
                        onChange={(e) => setChannelName(e.target.value)}
                        placeholder="Nome do Canal"
                        className="h-8 px-3 rounded-md bg-[var(--background-secondary)]/50 border border-transparent focus:border-[var(--primary)] text-[var(--foreground)] placeholder-[var(--foreground-muted)] focus:outline-none focus:ring-0 w-56 text-sm transition-all"
                    />
                </div>

                {/* Actions Row */}
                <div className="flex gap-2">
                    {/* File Actions */}
                    <div className="flex items-center p-1 gap-0.5 rounded-lg glass border border-[var(--glass-border)] shadow-sm">
                        <Button variant="ghost" size="icon" onClick={handleNewChannel} title="New Channel" className="h-8 w-8 text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--glass-border)]">
                            <FilePlus size={16} />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={handleUpload} title="Upload" className="h-8 w-8 text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--glass-border)]">
                            <Upload size={16} />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={handleDownload} title="Download" className="h-8 w-8 text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--glass-border)]">
                            <Download size={16} />
                        </Button>
                    </div>

                    {/* Settings */}
                    <div className="flex items-center p-1 rounded-lg glass border border-[var(--glass-border)] shadow-sm">
                        <Button variant="ghost" size="icon" onClick={() => setIsSettingsOpen(true)} title="Settings" className="h-8 w-8 text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--glass-border)]">
                            <Settings size={16} />
                        </Button>
                    </div>

                    {/* Delete */}
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleDeleteChannelClick}
                        className="h-10 w-10 glass border border-red-500/20 text-red-500 hover:text-red-600 hover:bg-red-500/10 hover:border-red-500/40 transition-all shadow-sm rounded-lg"
                        title="Delete Channel"
                    >
                        <Trash2 size={16} />
                    </Button>
                </div>
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

            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent className="glass-card border-red-500/20">
                    <AlertDialogHeader>
                        <div className="flex items-center gap-2 text-red-500 mb-2">
                            <AlertTriangle className="h-5 w-5" />
                            <AlertDialogTitle>Delete Channel?</AlertDialogTitle>
                        </div>
                        <AlertDialogDescription className="text-[var(--foreground-muted)]">
                            Are you sure you want to delete this channel? This action cannot be undone and will stop the channel if it is currently running.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="bg-transparent border-[var(--glass-border)] text-[var(--foreground)] hover:bg-[var(--glass-border)] hover:text-white">Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleConfirmDeleteChannel} className="bg-red-500 hover:bg-red-600 text-white border-none">Delete Channel</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

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
