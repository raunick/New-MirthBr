import { create } from 'zustand';
import {
    Connection,
    Edge,
    EdgeChange,
    Node,
    NodeChange,
    addEdge,
    OnNodesChange,
    OnEdgesChange,
    OnConnect,
    applyNodeChanges,
    applyEdgeChanges,
} from 'reactflow';

export type NodeData = {
    label: string;
    [key: string]: any;
};

interface FlowState {
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
    loadFlow: () => void;
    exportFlow: () => void;
    importFlow: (data: { nodes: Node<NodeData>[]; edges: Edge[]; channelName?: string }) => void;

    // Callbacks injection (for editor modal etc)
    callbacks: Record<string, Function>;
    setCallback: (name: string, fn: Function) => void;

    // Channel configuration
    channelName: string;
    setChannelName: (name: string) => void;
}

const nodeDefaults: Record<string, NodeData> = {
    // ... defaults ...
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
    // Special
    testNode: { label: 'Test Node', payloadType: 'hl7', payload: 'MSH|^~\\&|...' },
    // Utility Nodes
    ipNode: { label: 'IP Address', ip: '127.0.0.1', subnet: '255.255.255.0' },
    portNode: { label: 'Port', port: 8080, protocol: 'TCP' },
    textNode: { label: 'Text', text: '', isTemplate: false },
    variableNode: { label: 'Variables', variables: [] },
    commentNode: { label: 'Comment', text: 'Add notes here...', color: '#fef3c7' },
    delayNode: { label: 'Delay', delay: 1000, unit: 'ms' },
    loggerNode: { label: 'Logger', level: 'info', prefix: '' },
    counterNode: { label: 'Counter', count: 0, resetInterval: 0 },
    timestampNode: { label: 'Timestamp', field: 'timestamp', format: 'ISO' },
    mergeNode: { label: 'Merge', mode: 'first', separator: '' },
};

// Complete example workflow demonstrating MirthBR capabilities
const initialNodes: Node<NodeData>[] = [
    // Source
    {
        id: 'source-1',
        type: 'httpListener',
        position: { x: 50, y: 200 },
        data: { label: 'HTTP Listener', port: 8080, path: '/api/hl7' }
    },
    // Comment/Documentation
    {
        id: 'comment-1',
        type: 'commentNode',
        position: { x: 50, y: 50 },
        data: { label: 'Workflow de Exemplo', text: 'Este workflow recebe mensagens HL7 via HTTP, processa com parser HL7, transforma com Lua script, e salva em arquivo.', color: '#dbeafe' }
    },
    // Processors
    {
        id: 'proc-1',
        type: 'hl7Parser',
        position: { x: 300, y: 200 },
        data: { label: 'HL7 Parser', inputFormat: 'hl7v2', outputFormat: 'json' }
    },
    {
        id: 'proc-2',
        type: 'luaScript',
        position: { x: 550, y: 200 },
        data: { label: 'Transform', code: '-- Add processing timestamp\nlocal data = json.decode(msg.content)\ndata.processedAt = os.date("%Y-%m-%dT%H:%M:%S")\nlog.info("Processing message: " .. (data.MSH and data.MSH[10] or "unknown"))\nreturn json.encode(data)' }
    },
    // Logger for monitoring
    {
        id: 'util-1',
        type: 'loggerNode',
        position: { x: 550, y: 350 },
        data: { label: 'Logger', level: 'info', prefix: '[HL7-PROC]' }
    },
    // Destination
    {
        id: 'dest-1',
        type: 'fileWriter',
        position: { x: 800, y: 200 },
        data: { label: 'File Writer', path: './output/hl7', filename: '${timestamp}_msg.json' }
    },
    // Alternative HTTP destination
    {
        id: 'dest-2',
        type: 'httpSender',
        position: { x: 800, y: 350 },
        data: { label: 'HTTP Sender', url: 'https://api.example.com/webhook', method: 'POST' }
    },
];

const initialEdges: Edge[] = [
    { id: 'e1-2', source: 'source-1', target: 'proc-1', animated: true },
    { id: 'e2-3', source: 'proc-1', target: 'proc-2', animated: true },
    { id: 'e3-4', source: 'proc-2', target: 'dest-1', animated: true },
    { id: 'e3-5', source: 'proc-2', target: 'util-1', animated: true },
    { id: 'e5-6', source: 'util-1', target: 'dest-2', animated: true },
];

export const useFlowStore = create<FlowState>((set, get) => ({
    nodes: initialNodes,
    edges: initialEdges,
    channelName: 'My Channel',
    callbacks: {},

    setChannelName: (name) => set({ channelName: name }),
    onNodesChange: (changes: NodeChange[]) => {
        set({
            nodes: applyNodeChanges(changes, get().nodes),
        });
    },
    onEdgesChange: (changes: EdgeChange[]) => {
        set({
            edges: applyEdgeChanges(changes, get().edges),
        });
    },
    onConnect: (connection: Connection) => {
        set({
            edges: addEdge({ ...connection, animated: true }, get().edges),
        });
    },
    setNodes: (nodes) => set({ nodes }),
    setEdges: (edges) => set({ edges }),

    addNode: (type: string) => {
        const newId = `node-${Date.now()}`;
        const basePosition = { x: 300, y: 200 + Math.random() * 50 };
        const defaultData = nodeDefaults[type] || { label: 'New Node' };

        // Attach dynamic callbacks if needed logic (can be handled in Component via store subscriptions or re-attached)
        // Ideally we keep data pure and attach callbacks in the Node Component itself using hooks, OR we pass generic handlers.
        // For now, we initialize data. Handlers like onEdit need to be connected.
        // Zustand strategy: The Node Component should access the store to trigger 'openEditor'.

        const newNode: Node<NodeData> = {
            id: newId,
            type,
            position: basePosition,
            data: { ...defaultData }
        };

        set({ nodes: [...get().nodes, newNode] });
    },

    updateNodeData: (id: string, field: string, value: any) => {
        set({
            nodes: get().nodes.map((node) => {
                if (node.id === id) {
                    return {
                        ...node,
                        data: {
                            ...node.data,
                            [field]: value,
                        },
                    };
                }
                return node;
            }),
        });
    },

    addNodeAtPosition: (type: string, position: { x: number; y: number }) => {
        const newId = `node-${Date.now()}`;
        const defaultData = nodeDefaults[type] || { label: 'New Node' };

        const newNode: Node<NodeData> = {
            id: newId,
            type,
            position,
            data: { ...defaultData }
        };

        set({ nodes: [...get().nodes, newNode] });
    },

    deleteNode: (id: string) => {
        set({
            nodes: get().nodes.filter((node) => node.id !== id),
            edges: get().edges.filter((edge) => edge.source !== id && edge.target !== id),
        });
    },

    deleteNodeAndReconnect: (id: string) => {
        const { nodes, edges } = get();
        const node = nodes.find((n) => n.id === id);
        if (!node) return;

        // Find incoming and outgoing edges
        const incomingEdges = edges.filter((e) => e.target === id);
        const outgoingEdges = edges.filter((e) => e.source === id);

        // Create new edges to reconnect
        const newEdges: Edge[] = [];
        incomingEdges.forEach((inEdge) => {
            outgoingEdges.forEach((outEdge) => {
                newEdges.push({
                    id: `edge-${Date.now()}-${Math.random()}`,
                    source: inEdge.source,
                    target: outEdge.target,
                    sourceHandle: inEdge.sourceHandle,
                    targetHandle: outEdge.targetHandle,
                    animated: true,
                });
            });
        });

        // Filter out old edges and add new ones
        const remainingEdges = edges.filter(
            (e) => e.source !== id && e.target !== id
        );

        set({
            nodes: nodes.filter((n) => n.id !== id),
            edges: [...remainingEdges, ...newEdges],
        });
    },

    duplicateNode: (id: string) => {
        const node = get().nodes.find((n) => n.id === id);
        if (!node) return;

        const newId = `node-${Date.now()}`;
        const newNode: Node<NodeData> = {
            ...node,
            id: newId,
            position: {
                x: node.position.x + 50,
                y: node.position.y + 50,
            },
            data: { ...node.data },
            selected: false,
        };

        set({ nodes: [...get().nodes, newNode] });
    },

    deleteEdge: (id: string) => {
        set({
            edges: get().edges.filter((edge) => edge.id !== id),
        });
    },

    saveFlow: () => {
        const { nodes, edges, channelName } = get();
        const flowData = {
            nodes: nodes.map(n => ({
                ...n,
                data: { ...n.data, onDataChange: undefined, onEdit: undefined, onEditCondition: undefined, onEditQuery: undefined, onTest: undefined }
            })),
            edges,
            channelName,
            savedAt: new Date().toISOString(),
        };
        localStorage.setItem('mirth-flow', JSON.stringify(flowData));
    },

    loadFlow: () => {
        const saved = localStorage.getItem('mirth-flow');
        if (saved) {
            try {
                const flowData = JSON.parse(saved);
                set({
                    nodes: flowData.nodes || [],
                    edges: flowData.edges || [],
                    channelName: flowData.channelName || 'My Channel',
                });
            } catch (e) {
                console.error('Failed to load flow:', e);
            }
        }
    },

    exportFlow: () => {
        const { nodes, edges, channelName } = get();
        const flowData = {
            version: '1.0',
            name: channelName || 'MirthBR Workflow',
            exportedAt: new Date().toISOString(),
            channelName,
            nodes: nodes.map(n => ({
                ...n,
                data: {
                    ...n.data,
                    onDataChange: undefined,
                    onEdit: undefined,
                    onEditCondition: undefined,
                    onEditQuery: undefined,
                    onTest: undefined
                }
            })),
            edges,
        };

        const blob = new Blob([JSON.stringify(flowData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `mirthbr-workflow-${(channelName || 'workflow').replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    },

    importFlow: (data: { nodes: Node<NodeData>[]; edges: Edge[]; channelName?: string }) => {
        if (data.nodes && Array.isArray(data.nodes)) {
            set({
                nodes: data.nodes,
                edges: data.edges || [],
                channelName: data.channelName || 'Imported Channel',
            });
            // Also save to localStorage
            localStorage.setItem('mirth-flow', JSON.stringify({
                nodes: data.nodes,
                edges: data.edges || [],
                channelName: data.channelName || 'Imported Channel',
                savedAt: new Date().toISOString(),
            }));
        }
    },

    setCallback: (name, fn) => set((state) => ({ callbacks: { ...state.callbacks, [name]: fn } })),
}));
