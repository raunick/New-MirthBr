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
    channelId: string;
    setChannelName: (name: string) => void;
    setChannelId: (id: string) => void;
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
    // Documentation
    {
        id: 'comment-1',
        type: 'commentNode',
        position: { x: 40, y: 40 },
        data: {
            label: 'Demo: Configuração Dinâmica',
            text: 'Este fluxo demonstra a interconexão de nodes!\n\n1. O "Porta Serviço" (9090) configura o Listener.\n2. O "Caminho Base" configura a rota do Listener.\n3. O "URL Template" monta uma URL dinâmica usando variáveis ${Porta Serviço} e ${Caminho Base}.\n4. O Sender envia para a URL montada.',
            color: '#dbeafe'
        }
    },
    // Configuration Nodes
    {
        id: 'config-port',
        type: 'portNode',
        position: { x: 40, y: 250 },
        data: { label: 'Porta Serviço', port: 9090 }
    },
    {
        id: 'config-path',
        type: 'textNode',
        position: { x: 40, y: 380 },
        data: { label: 'Caminho Base', text: '/api/v1', isTemplate: false }
    },
    // Source
    {
        id: 'source-1',
        type: 'httpListener',
        position: { x: 320, y: 250 },
        data: { label: 'API Gateway', port: 8080, path: '/' }
    },
    // Processor
    {
        id: 'proc-1',
        type: 'luaScript',
        position: { x: 600, y: 250 },
        data: { label: 'Logger', code: 'log.info("Recebido na porta: " .. (msg.port or "configurada"))\nreturn msg' }
    },
    // Template for Dynamic Destination
    {
        id: 'template-url',
        type: 'textNode',
        position: { x: 600, y: 400 },
        data: {
            label: 'URL Template',
            text: 'http://localhost:${Porta Serviço}${Caminho Base}/callback',
            isTemplate: true
        }
    },
    // Destination
    {
        id: 'dest-1',
        type: 'httpSender',
        position: { x: 900, y: 250 },
        data: { label: 'Callback Sender', url: 'http://placeholder', method: 'POST' }
    }
];

const initialEdges: Edge[] = [
    // Flow Edges (Standard)
    { id: 'flow-1', source: 'source-1', target: 'proc-1', animated: true },
    { id: 'flow-2', source: 'proc-1', target: 'dest-1', animated: true },

    // Config Edges (Dotted/Colored)
    { id: 'cfg-1', source: 'config-port', target: 'source-1', targetHandle: 'config-port', animated: true, style: { stroke: '#fbbf24', strokeDasharray: '5 5' } },
    { id: 'cfg-2', source: 'config-path', target: 'source-1', targetHandle: 'config-path', animated: true, style: { stroke: '#fbbf24', strokeDasharray: '5 5' } },

    // Template Inputs
    { id: 'tpl-1', source: 'config-port', target: 'template-url', animated: true, style: { stroke: '#fbbf24', strokeDasharray: '5 5' } },
    { id: 'tpl-2', source: 'config-path', target: 'template-url', animated: true, style: { stroke: '#fbbf24', strokeDasharray: '5 5' } },

    // Dynamic Destination Config
    { id: 'cfg-3', source: 'template-url', target: 'dest-1', targetHandle: 'config-url', animated: true, style: { stroke: '#fbbf24', strokeDasharray: '5 5' } }
];

export const useFlowStore = create<FlowState>((set, get) => ({
    nodes: initialNodes,
    edges: initialEdges,
    channelName: 'My Channel',
    channelId: crypto.randomUUID(), // Initialize with a valid UUID
    callbacks: {},

    setChannelName: (name) => set({ channelName: name }),
    setChannelId: (id) => set({ channelId: id }),
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
        const { nodes, edges, channelName, channelId } = get();
        const flowData = {
            nodes,
            edges,
            channelName,
            channelId,
            savedAt: new Date().toISOString(),
        };
        localStorage.setItem('mirth-flow', JSON.stringify(flowData));
    },

    loadFlow: () => {
        const saved = localStorage.getItem('mirth-flow');
        if (saved) {
            try {
                const flowData = JSON.parse(saved);

                // Validate UUID
                let cid = flowData.channelId;
                const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                if (!cid || !uuidRegex.test(cid)) {
                    cid = crypto.randomUUID();
                }

                set({
                    nodes: flowData.nodes || [],
                    edges: flowData.edges || [],
                    channelName: flowData.channelName || 'My Channel',
                    channelId: cid
                });
            } catch (e) {
                console.error('Failed to load flow', e);
            }
        }
    },

    exportFlow: () => {
        const { nodes, edges, channelName, channelId } = get();
        const flowData = {
            version: '1.0',
            name: channelName || 'MirthBR Workflow',
            channelName,
            channelId,
            nodes,
            edges,
            exportedAt: new Date().toISOString(),
        };

        const blob = new Blob([JSON.stringify(flowData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${(channelName || 'workflow').toLowerCase().replace(/\s+/g, '_')}.json`;
        a.click();
        URL.revokeObjectURL(url);
    },

    importFlow: (data: { nodes: Node<NodeData>[]; edges: Edge[]; channelName?: string; channelId?: string }) => {
        if (data.nodes && Array.isArray(data.nodes)) {
            // Validate imported channelId
            let cid = data.channelId;
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (!cid || !uuidRegex.test(cid)) {
                cid = crypto.randomUUID();
            }

            set({
                nodes: data.nodes,
                edges: data.edges || [],
                channelName: data.channelName || 'Imported Channel',
                channelId: cid
            });
            get().saveFlow();
        }
    },

    setCallback: (name, fn) => set((state) => ({ callbacks: { ...state.callbacks, [name]: fn } })),
}));
