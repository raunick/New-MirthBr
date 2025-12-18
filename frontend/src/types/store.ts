import { Node, Edge, OnNodesChange, OnEdgesChange, OnConnect } from 'reactflow';
import { NodeData } from './node';

// Editor modal state type
export interface EditorState {
    isOpen: boolean;
    nodeId: string | null;
    field: string;
    initialCode: string;
}

export interface FlowState {
    // Flow Slice
    nodes: Node<NodeData>[];
    edges: Edge[];
    onNodesChange: OnNodesChange;
    onEdgesChange: OnEdgesChange;
    onConnect: OnConnect;
    setNodes: (nodes: Node<NodeData>[]) => void;
    setEdges: (edges: Edge[]) => void;
    addNode: (type: string) => void;
    addNodeAtPosition: (type: string, position: { x: number; y: number }) => void;
    updateNodeData: (id: string, field: string, value: any) => void;
    deleteNode: (id: string) => void;
    deleteNodeAndReconnect: (id: string) => void;
    duplicateNode: (id: string) => void;
    deleteEdge: (id: string) => void;
    saveFlow: () => void;
    loadFlow: (data?: any) => void;
    exportFlow: () => void;
    importFlow: (data: { nodes: Node<NodeData>[]; edges: Edge[]; channelName?: string }) => void;
    resetFlow: () => void;

    // UI/Editor Slice
    editorState: EditorState;
    openEditor: (nodeId: string, field: string, initialCode: string) => void;
    closeEditor: () => void;
    saveEditorCode: (code: string) => void;

    // Channel/Deploy Slice
    channelName: string;
    channelId: string;
    errorDestinationId?: string;
    maxRetries?: number;
    setChannelName: (name: string) => void;
    setChannelId: (id: string) => void;
    setErrorDestinationId: (id: string | undefined) => void;
    setMaxRetries: (count: number | undefined) => void;

    // Runtime/Status
    isRunning: boolean;
    setRunning: (running: boolean) => void;
    stopCurrentChannel: () => Promise<void>;
    deployStatus: Record<string, 'initial' | 'loading' | 'success' | 'error' | 'stopped'>;
    deployErrorMessage: string | null;
    setDeployError: (message: string | null) => void;
    channelStatus: 'offline' | 'online';
    executeDeploy: (nodeId: string) => Promise<void>;
    toggleChannelStatus: (nodeId: string, status: 'online' | 'offline') => Promise<void>;
    testChannel: (payloadType: string, payload: string) => Promise<void>;

    // Legacy
    callbacks: Record<string, Function>;
    setCallback: (name: string, fn: Function) => void;
}
