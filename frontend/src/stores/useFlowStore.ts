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
    updateNodeData: (id: string, field: string, value: any) => void;

    // Callbacks injection (for editor modal etc)
    callbacks: Record<string, Function>;
    setCallback: (name: string, fn: Function) => void;
}

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
    // Special
    testNode: { label: 'Test Node', payloadType: 'hl7', payload: 'MSH|^~\\&|...' },
};

const initialNodes: Node<NodeData>[] = [
    {
        id: '1',
        type: 'httpListener',
        position: { x: 100, y: 150 },
        data: { label: 'HTTP Listener', port: 8080, path: '/api/messages' }
    },
    {
        id: '4',
        type: 'fileWriter',
        position: { x: 750, y: 150 },
        data: { label: 'File Writer', path: './output', filename: '${timestamp}.json' }
    },
];

export const useFlowStore = create<FlowState>((set, get) => ({
    nodes: initialNodes,
    edges: [],
    callbacks: {},

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

    setCallback: (name, fn) => set((state) => ({ callbacks: { ...state.callbacks, [name]: fn } })),
}));
