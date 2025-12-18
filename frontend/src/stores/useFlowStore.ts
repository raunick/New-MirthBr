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

// Editor modal state type
export interface EditorState {
    isOpen: boolean;
    nodeId: string | null;
    field: string; // 'code', 'condition', 'query', etc.
    initialCode: string;
}

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
    loadFlow: (data?: any) => void;
    exportFlow: () => void;
    importFlow: (data: { nodes: Node<NodeData>[]; edges: Edge[]; channelName?: string }) => void;

    // Editor modal state (replaces callback injection)
    editorState: EditorState;
    openEditor: (nodeId: string, field: string, initialCode: string) => void;
    closeEditor: () => void;
    saveEditorCode: (code: string) => void;

    // Test handler (for TestNode)
    testChannel: (payloadType: string, payload: string) => Promise<void>;

    // Legacy callbacks (kept for backward compatibility during migration)
    callbacks: Record<string, Function>;
    setCallback: (name: string, fn: Function) => void;

    // Channel configuration
    channelName: string;
    channelId: string;
    errorDestinationId?: string;
    maxRetries?: number;
    setChannelName: (name: string) => void;
    setChannelId: (id: string) => void;
    setErrorDestinationId: (id: string | undefined) => void;
    setMaxRetries: (count: number | undefined) => void;

    // Runtime Status
    isRunning: boolean;
    setRunning: (running: boolean) => void;
    stopCurrentChannel: () => Promise<void>;

    // Deploy Status
    deployStatus: Record<string, 'initial' | 'loading' | 'success' | 'error' | 'stopped'>;
    channelStatus: 'offline' | 'online';

    executeDeploy: (nodeId: string) => Promise<void>;
    resetFlow: () => void;
    toggleChannelStatus: (nodeId: string, status: 'online' | 'offline') => Promise<void>;
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
    deployNode: { label: 'Channel Terminal' },
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

// HL7 to JSON Workflow - Workflow padrão demonstrando conversão HL7 para JSON
const initialNodes: Node<NodeData>[] = [
    // Documentação do Workflow
    {
        id: 'documentation-node',
        type: 'textNode',
        position: { x: -380, y: -100 },
        data: {
            label: '📋 Documentação do Workflow',
            text: '## HL7 to JSON Workflow\n\n**Objetivo:** Converter mensagens HL7 v2.x para JSON, validar e enriquecer os dados.\n\n### Fluxo de Processamento:\n\n1. **HTTP Receiver** - Recebe mensagens HL7 via HTTP POST na porta 8080\n\n2. **HL7 Parser** - Converte a mensagem HL7 para formato JSON estruturado\n\n3. **Validador** - Valida campos obrigatórios (PID-3, PID-5)\n\n4. **Enriquecimento** - Adiciona metadados do sistema\n\n5. **File Writer** - Salva o JSON no diretório de saída\n\n### Tipos de Mensagem Suportados:\n- ADT^A01 (Admissão)\n- ADT^A02 (Transferência)\n- ADT^A03 (Alta)',
            isTemplate: false,
            value: 'Documentação'
        }
    },
    // Test Node
    {
        id: 'test-node',
        type: 'testNode',
        position: { x: 958.35, y: 440.39 },
        data: {
            label: 'Test HL7 Message',
            payloadType: 'hl7',
            payload: 'MSH|^~\\&|HIS|HOSPITAL|MIRTHBR|ENGINE|202312140800||ADT^A01|MSG00001|P|2.3\nEVN|A01|202312140800\nPID|1||123456||SILVA^MARIA^LUIZA||19850315|F|||RUA DAS FLORES 123^^SAO PAULO^SP^01234567^BR||5511912345678\nPV1|1|I|UTI^101^A^HOSPITAL||||1234^ALMEIDA^CARLOS^EDUARDO^DR|||MED||||||||1234567890|||||||||||||202312140800',
            sendMode: 'http',
            tcpHost: 'localhost',
            tcpPort: '6500',
            tcpTimeout: '30'
        }
    },
    // HTTP Source
    {
        id: 'source-http',
        type: 'httpListener',
        position: { x: 350, y: 250 },
        data: {
            label: 'HTTP HL7 Receiver',
            port: 8080,
            path: 'api/messages'
        }
    },
    // HL7 Parser
    {
        id: 'proc-hl7-parser',
        type: 'hl7Parser',
        position: { x: 650, y: 250 },
        data: {
            label: 'HL7 to JSON',
            inputFormat: 'hl7v2',
            outputFormat: 'json'
        }
    },
    // Validador Lua
    {
        id: 'proc-validator',
        type: 'luaScript',
        position: { x: 950, y: 250 },
        data: {
            label: 'Validador de Dados',
            code: '-- Validação de campos obrigatórios\nlocal json = require(\'json\')\nlocal data = json.decode(msg.content)\n\nlocal errors = {}\n\n-- Validar PID (Patient Identification)\nif not data.PID then\n    table.insert(errors, \'Segmento PID ausente\')\nelse\n    if not data.PID[3] or data.PID[3] == \'\' then\n        table.insert(errors, \'ID do paciente (PID-3) é obrigatório\')\n    end\n    if not data.PID[5] or data.PID[5] == \'\' then\n        table.insert(errors, \'Nome do paciente (PID-5) é obrigatório\')\n    end\nend\n\nif #errors > 0 then\n    log.error(\'Validação falhou: \' .. table.concat(errors, \'; \'))\n    data[\'_validationErrors\'] = errors\n    data[\'_isValid\'] = false\nelse\n    log.info(\'Validação OK\')\n    data[\'_isValid\'] = true\nend\n\nreturn json.encode(data)'
        }
    },
    // Enriquecimento Lua
    {
        id: 'proc-enrich',
        type: 'luaScript',
        position: { x: 1250, y: 250 },
        data: {
            label: 'Enriquecimento',
            code: '-- Enriquecer dados com metadados do sistema\nlocal json = require(\'json\')\nlocal data = json.decode(msg.content)\n\n-- Adicionar metadados de processamento\ndata[\'_metadata\'] = {\n    processedAt = os.date(\'%Y-%m-%dT%H:%M:%SZ\'),\n    processedBy = \'MirthBR Engine\',\n    version = \'1.0.0\',\n    channelId = \'hl7-admission-complete\'\n}\n\nlog.info(\'Dados enriquecidos com metadados\')\n\nreturn json.encode(data)'
        }
    },
    // File Writer
    {
        id: 'dest-file',
        type: 'fileWriter',
        position: { x: 1550, y: 250 },
        data: {
            label: 'Arquivo de Saída',
            path: './output/admissions',
            filename: '${timestamp}_admission.json'
        }
    },
    // Text Node para URL Template
    {
        id: 'node-url-template',
        type: 'textNode',
        position: { x: 336.13, y: 527.51 },
        data: {
            label: 'Text',
            text: 'http://localhost:${porta}/${caminho}',
            isTemplate: true,
            value: 'http://localhost:8080/api/messages'
        }
    },
    // Text Node para Porta
    {
        id: 'node-porta',
        type: 'textNode',
        position: { x: -320.87, y: 292.65 },
        data: {
            label: 'porta',
            text: '8080',
            isTemplate: false,
            value: '8080'
        }
    },
    // Port Node
    {
        id: 'node-port',
        type: 'portNode',
        position: { x: 36.94, y: 236.92 },
        data: {
            label: 'Port',
            port: 8080,
            protocol: 'TCP'
        }
    },
    // Text Node para Caminho
    {
        id: 'node-caminho',
        type: 'textNode',
        position: { x: -348.20, y: 552.96 },
        data: {
            label: 'caminho',
            text: 'api/messages',
            isTemplate: false,
            value: 'api/messages'
        }
    },
    // Comment Node - Mensagem com Erro
    {
        id: 'comment-erro',
        type: 'commentNode',
        position: { x: 1273.70, y: 464.75 },
        data: {
            label: 'Comment',
            text: 'MENSAGEM COM ERRO MSH|^~\\&|HIS|HOSPITAL|MIRTHBR|ENGINE|202312140800||ADT^A01|MSG00001|P|2.3\nEVN|A01|202312140800\nPID|||123456^^^HOSP^MR||SILVA^MARIA^LUIZA||19850315|F|||RUA DAS FLORES 123^^SAO PAULO^SP^01234567^BR||5511912345678\nPV1||I|UTI^101^A^HOSPITAL||||1234^ALMEIDA^CARLOS^EDUARDO^DR|||MED||||||||1234567890|||||||||||||202312140800',
            color: '#fce7f3'
        }
    },
    // Comment Node - Mensagem Válida
    {
        id: 'comment-valido',
        type: 'commentNode',
        position: { x: 1283.08, y: 677.42 },
        data: {
            label: 'Comment',
            text: 'MSH|^~\\&|HIS|HOSPITAL|MIRTHBR|ENGINE|202312140800||ADT^A01|MSG00001|P|2.3\nEVN|A01|202312140800\nPID|1||123456||SILVA^MARIA^LUIZA||19850315|F|||RUA DAS FLORES 123^^SAO PAULO^SP^01234567^BR||5511912345678\nPV1|1|I|UTI^101^A^HOSPITAL||||1234^ALMEIDA^CARLOS^EDUARDO^DR|||MED||||||||1234567890|||||||||||||202312140800',
            color: '#d1fae5'
        }
    },
    // Deploy Node
    {
        id: 'node-deploy',
        type: 'deployNode',
        position: { x: 1850, y: 250 },
        data: {
            label: 'Channel Terminal'
        }
    }
];

const initialEdges: Edge[] = [
    // Fluxo principal
    { id: 'e1', source: 'source-http', target: 'proc-hl7-parser', animated: true },
    { id: 'e2', source: 'proc-hl7-parser', target: 'proc-validator', animated: true },
    { id: 'e3', source: 'proc-validator', target: 'proc-enrich', animated: true },
    { id: 'e4', source: 'proc-enrich', target: 'dest-file', animated: true },
    { id: 'e5', source: 'dest-file', target: 'node-deploy', animated: true },
    // Configuração de porta
    { id: 'cfg-porta-1', source: 'node-porta', target: 'node-port', type: 'smoothstep', animated: true },
    // Configuração de caminho
    { id: 'cfg-caminho-1', source: 'node-caminho', target: 'node-url-template', type: 'smoothstep', animated: true },
    { id: 'cfg-porta-2', source: 'node-porta', target: 'node-url-template', type: 'smoothstep', animated: true },
    // Configuração HTTP Source
    { id: 'cfg-caminho-2', source: 'node-caminho', target: 'source-http', targetHandle: 'config-path', type: 'smoothstep', animated: true },
    // Configuração Test Node
    { id: 'cfg-url', source: 'node-url-template', target: 'test-node', targetHandle: 'config-url', type: 'smoothstep', animated: true },
    // Configuração Port
    { id: 'cfg-port', source: 'node-port', target: 'source-http', targetHandle: 'config-port', type: 'smoothstep', animated: true }
];

export const useFlowStore = create<FlowState>((set, get) => ({
    nodes: initialNodes,
    edges: initialEdges,
    channelName: 'HL7 to JSON WORKFLOW',
    channelId: crypto.randomUUID(), // Initialize with a valid UUID
    errorDestinationId: undefined,
    maxRetries: 3,
    callbacks: {},

    // Deploy State
    deployStatus: {},
    channelStatus: 'offline',

    executeDeploy: async (nodeId: string) => {
        set((state) => ({
            deployStatus: { ...state.deployStatus, [nodeId]: 'loading' }
        }));

        try {
            const { nodes, edges, channelName, channelId, errorDestinationId, maxRetries } = get();
            const { deployChannel, startChannel, stopChannel } = await import('@/lib/api');
            const { exportToRust } = await import('@/lib/flow-compiler');

            // 1. Compile Configuration
            const channelConfig = exportToRust(nodes, edges, channelName || "My Channel", channelId, errorDestinationId, maxRetries);

            // 2. Prepare Frontend Schema
            const frontendSchema = {
                nodes,
                edges,
                channelName: channelName || "My Channel",
                channelId,
                errorDestinationId,
                maxRetries
            };

            // 3. Deploy (Save & Deploy)
            await deployChannel({
                channel: channelConfig,
                frontend_schema: frontendSchema
            });

            // 4. Start Channel automatically on deploy (or keep it stopped? User said "Activate")
            // Usually deploy just saves/updates. But user said "Deploy and Save".
            // Let's assume we start it if it was already running or if it's new?
            // No, let's just mark success and let user "Start" separately or start immediately?
            // "Conecte aqui para ativar este canal".
            // Let's start it.
            await startChannel(channelId);

            set((state) => ({
                deployStatus: { ...state.deployStatus, [nodeId]: 'success' },
                channelStatus: 'online',
                isRunning: true
            }));

            // Also save to local storage
            get().saveFlow();

        } catch (e) {
            console.error("Deploy failed", e);
            set((state) => ({
                deployStatus: { ...state.deployStatus, [nodeId]: 'error' }
            }));
        }
    },

    toggleChannelStatus: async (nodeId: string, status: 'online' | 'offline') => {
        const { channelId } = get();
        const { startChannel, stopChannel } = await import('@/lib/api');

        set((state) => ({
            deployStatus: { ...state.deployStatus, [nodeId]: 'loading' }
        }));

        try {
            if (status === 'online') {
                // To start, we might need to redeploy if changes were made? 
                // For now assumes current deployed version. 
                // But wait, if user changed graph but didn't deploy, starting might run OLD config.
                // Ideally "Start" should maybe check?
                // Simple version: Just call start API.
                await startChannel(channelId);
                set({ isRunning: true, channelStatus: 'online' });
            } else {
                await stopChannel(channelId);
                set({ isRunning: false, channelStatus: 'offline' });
            }
            set((state) => ({
                deployStatus: { ...state.deployStatus, [nodeId]: status === 'online' ? 'success' : 'stopped' }
            }));
        } catch (e) {
            console.error("Toggle status failed", e);
            set((state) => ({
                deployStatus: { ...state.deployStatus, [nodeId]: 'error' }
            }));
        }
    },

    resetFlow: () => {
        const newId = crypto.randomUUID();
        set({
            nodes: [],
            edges: [],
            channelName: 'New Channel',
            channelId: newId,
            errorDestinationId: undefined,
            maxRetries: 3,
            deployStatus: {},
            channelStatus: 'offline',
            isRunning: false
        });
        // Add initial text node or something? Or just empty.
        // Let's add a "Start Here" comment or similar if we wanted, but empty is fine.
    },

    // Editor modal state
    editorState: {
        isOpen: false,
        nodeId: null,
        field: 'code',
        initialCode: '',
    },

    openEditor: (nodeId: string, field: string, initialCode: string) => {
        set({
            editorState: {
                isOpen: true,
                nodeId,
                field,
                initialCode,
            },
        });
    },

    closeEditor: () => {
        set({
            editorState: {
                isOpen: false,
                nodeId: null,
                field: 'code',
                initialCode: '',
            },
        });
    },

    saveEditorCode: (code: string) => {
        const { editorState } = get();
        if (editorState.nodeId) {
            get().updateNodeData(editorState.nodeId, editorState.field, code);
        }
        get().closeEditor();
    },

    testChannel: async (payloadType: string, payload: string) => {
        const { channelId } = get();
        const { testChannel: testChannelApi } = await import('@/lib/api');
        await testChannelApi(channelId, payloadType, payload);
    },

    setChannelName: (name) => set({ channelName: name }),
    setChannelId: (id) => set({ channelId: id }),
    setErrorDestinationId: (id) => set({ errorDestinationId: id }),
    setMaxRetries: (count) => set({ maxRetries: count }),

    isRunning: false,
    setRunning: (running) => set({ isRunning: running }),

    stopCurrentChannel: async () => {
        const { channelId } = get();
        try {
            const { stopChannel } = await import('@/lib/api');
            await stopChannel(channelId);
            set({ isRunning: false });
        } catch (e) {
            console.error("Failed to stop channel", e);
            throw e;
        }
    },
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
        const { nodes, edges, channelName, channelId, errorDestinationId, maxRetries } = get();

        // Sanitize nodes to remove sensitive data before saving
        const sanitizedNodes = nodes.map(node => ({
            ...node,
            data: {
                ...node.data,
                // Remove potentially sensitive fields
                password: undefined,
                apiKey: undefined,
                token: undefined,
                secret: undefined,
                connectionString: undefined,
                credentials: undefined,
            }
        }));

        const flowData = {
            nodes: sanitizedNodes,
            edges,
            channelName,
            channelId,
            errorDestinationId,
            maxRetries,
            savedAt: new Date().toISOString(),
        };

        try {
            localStorage.setItem('mirth-flow', JSON.stringify(flowData));
        } catch (e) {
            console.error('Failed to save flow to localStorage');
            // Could be quota exceeded or storage disabled
        }
    },

    loadFlow: (data?: any) => {
        if (data) {
            set({
                nodes: data.nodes || [],
                edges: data.edges || [],
                channelName: data.channelName || 'Loaded Channel',
                channelId: data.channelId || crypto.randomUUID(),
                errorDestinationId: data.errorDestinationId,
                maxRetries: data.maxRetries ?? 3
            });
            return;
        }
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
                    channelId: cid,
                    errorDestinationId: flowData.errorDestinationId,
                    maxRetries: flowData.maxRetries ?? 3
                });
            } catch (e) {
                console.error('Failed to load flow', e);
            }
        }
    },

    exportFlow: () => {
        const { nodes, edges, channelName, channelId, maxRetries, errorDestinationId } = get();
        const flowData = {
            version: '1.0',
            name: channelName || 'MirthBR Workflow',
            channelName,
            channelId,
            maxRetries,
            errorDestinationId,
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

    importFlow: (data: { nodes: Node<NodeData>[]; edges: Edge[]; channelName?: string; channelId?: string; maxRetries?: number; errorDestinationId?: string }) => {
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
                channelId: cid,
                maxRetries: data.maxRetries ?? 3,
                errorDestinationId: data.errorDestinationId
            });
            get().saveFlow();
        }
    },

    setCallback: (name, fn) => set((state) => ({ callbacks: { ...state.callbacks, [name]: fn } })),
}));
