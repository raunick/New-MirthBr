import { Edge, Node } from 'reactflow';

// Backend types based on our Rust structs
interface BackChannel {
    id: string;
    name: string;
    enabled: boolean;
    source: SourceConfig;
    processors: ProcessorConfig[];
    destinations: DestinationConfig[];
    error_destination?: DestinationConfig;
}

type SourceConfig =
    | { type: 'http_listener'; config: { port: number; path?: string } }
    | { type: 'tcp_listener'; config: { port: number } }
    | { type: 'file_reader'; config: { path: string; pattern?: string } }
    | { type: 'database_poller'; config: { query: string; interval: number } }
    | { type: 'test_source'; config: { payload_type: string; payload: string } };

type ProcessorConfig = {
    id: string;
    name: string;
} & (
        | { type: 'lua_script'; config: { code: string } }
        | { type: 'mapper'; config: { mappings: { source: string; target: string }[] } }
        | { type: 'filter'; config: { condition: string } }
        | { type: 'router'; config: { routes: { name: string; condition: string }[] } }
        | { type: 'hl7_parser'; config: { inputFormat: string; outputFormat: string } }
    );

type DestinationConfig = {
    id: string;
    name: string;
} & (
        | { type: 'http_sender'; config: { url: string; method: string } }
        | { type: 'file_writer'; config: { path: string; filename?: string } }
        | { type: 'database_writer'; config: { table?: string; mode: string; query?: string } }
        | { type: 'tcp_sender'; config: { host: string; port: number } }
    );

// Node type classification
const sourceTypes = ['httpListener', 'tcpListener', 'fileReader', 'databasePoller', 'testNode'];
const processorTypes = ['luaScript', 'mapper', 'filter', 'router', 'hl7Parser'];
const destinationTypes = ['fileWriter', 'httpSender', 'databaseWriter', 'tcpSender'];

function isSourceNode(type: string): boolean {
    return sourceTypes.includes(type);
}

function isProcessorNode(type: string): boolean {
    return processorTypes.includes(type);
}

function isDestinationNode(type: string): boolean {
    return destinationTypes.includes(type);
}

function resolveConfigValue(targetNode: Node, field: string, handleId: string, nodes: Node[], edges: Edge[]): any {
    const configEdge = edges.find(e => e.target === targetNode.id && e.targetHandle === handleId);
    if (!configEdge) return targetNode.data[field];

    const sourceNode = nodes.find(n => n.id === configEdge.source);
    if (!sourceNode) return targetNode.data[field];

    switch (sourceNode.type) {
        case 'portNode': return Number(sourceNode.data.port);
        case 'ipNode': return sourceNode.data.ip;
        case 'textNode': return sourceNode.data.value ?? sourceNode.data.text;
        default: return targetNode.data[field];
    }
}

function buildSourceConfig(node: Node, nodes: Node[], edges: Edge[]): SourceConfig {
    const { type, data } = node;
    switch (type) {
        case 'httpListener':
            return {
                type: 'http_listener',
                config: {
                    port: Number(resolveConfigValue(node, 'port', 'config-port', nodes, edges)) || 8080,
                    path: resolveConfigValue(node, 'path', 'config-path', nodes, edges)
                }
            };
        case 'tcpListener':
            return {
                type: 'tcp_listener',
                config: {
                    port: Number(resolveConfigValue(node, 'port', 'config-port', nodes, edges)) || 9090
                }
            };
        case 'fileReader':
            return {
                type: 'file_reader',
                config: { path: data.path || '/data/input', pattern: data.pattern }
            };
        case 'databasePoller':
            return {
                type: 'database_poller',
                config: { query: data.query || '', interval: Number(data.interval) || 60 }
            };
        case 'testNode':
            return {
                type: 'test_source',
                config: {
                    payload_type: data.payloadType || 'hl7',
                    payload: data.payload || ''
                }
            };
        default:
            return { type: 'http_listener', config: { port: 8080 } };
    }
}

function buildProcessorConfig(node: Node, nodes: Node[], edges: Edge[]): ProcessorConfig {
    const { id, type, data } = node;
    const base = { id, name: data.label || 'Processor' };

    switch (type) {
        case 'luaScript':
            return { ...base, type: 'lua_script', config: { code: data.code || 'return msg' } };
        case 'mapper':
            return { ...base, type: 'mapper', config: { mappings: data.mappings || [] } };
        case 'filter':
            return { ...base, type: 'filter', config: { condition: data.condition || '' } };
        case 'router':
            return { ...base, type: 'router', config: { routes: data.routes || [] } };
        case 'hl7Parser':
            return {
                ...base,
                type: 'hl7_parser',
                config: { inputFormat: data.inputFormat || 'hl7v2', outputFormat: data.outputFormat || 'fhir' }
            };
        default:
            return { ...base, type: 'lua_script', config: { code: 'return msg' } };
    }
}

function buildDestinationConfig(node: Node, nodes: Node[], edges: Edge[]): DestinationConfig {
    const { id, type, data } = node;
    const base = { id, name: data.label || 'Destination' };

    switch (type) {
        case 'fileWriter':
            return { ...base, type: 'file_writer', config: { path: data.path || './output', filename: data.filename } };
        case 'httpSender':
            return { ...base, type: 'http_sender', config: { url: data.url || '', method: data.method || 'POST' } };
        case 'databaseWriter':
            return {
                ...base,
                type: 'database_writer',
                config: { table: data.table, mode: data.mode || 'insert', query: data.query }
            };
        case 'tcpSender':
            return { ...base, type: 'tcp_sender', config: { host: data.host || '127.0.0.1', port: Number(data.port) || 9000 } };
        default:
            return { ...base, type: 'file_writer', config: { path: './output.txt' } };
    }
}

export function exportToRust(nodes: Node[], edges: Edge[], channelName: string = "New Channel", channelId?: string, errorDestinationId?: string): BackChannel {
    const channel: BackChannel = {
        id: channelId || crypto.randomUUID(),
        name: channelName,
        enabled: true,
        source: { type: 'http_listener', config: { port: 8080 } },
        processors: [],
        destinations: []
    };

    // Find the source node - Prioritize real listeners over TestNode
    // TestNode should only be the source if no other source exists
    const realSourceNode = nodes.find(n => isSourceNode(n.type || '') && n.type !== 'testNode');
    const testSourceNode = nodes.find(n => n.type === 'testNode');

    const sourceNode = realSourceNode || testSourceNode;

    if (sourceNode) {
        channel.source = buildSourceConfig(sourceNode, nodes, edges);
    }

    // Walk the graph from source
    let currentNodeId = sourceNode?.id;
    const visited = new Set<string>();
    if (currentNodeId) visited.add(currentNodeId);

    while (currentNodeId) {
        // Find edges from current node (could be multiple for routers)
        const outEdges = edges.filter(e => e.source === currentNodeId);
        if (outEdges.length === 0) break;

        // Process first edge (linear path for now)
        const edge = outEdges[0];
        const targetNode = nodes.find(n => n.id === edge.target);
        if (!targetNode) break;

        currentNodeId = targetNode.id;
        if (visited.has(currentNodeId)) break;
        visited.add(currentNodeId);

        const nodeType = targetNode.type || '';

        if (isProcessorNode(nodeType)) {
            channel.processors.push(buildProcessorConfig(targetNode, nodes, edges));
        } else if (isDestinationNode(nodeType)) {
            channel.destinations.push(buildDestinationConfig(targetNode, nodes, edges));
        }
    }

    // Also find any destinations not in the main path
    nodes.forEach(node => {
        const nodeType = node.type || '';
        if (isDestinationNode(nodeType) && !visited.has(node.id)) {
            // Check if it has incoming edges
            const hasIncoming = edges.some(e => e.target === node.id);
            if (hasIncoming) {
                channel.destinations.push(buildDestinationConfig(node, nodes, edges));
            }
        }
    });

    // Resolve Error Destination
    if (errorDestinationId) {
        const errorNode = nodes.find(n => n.id === errorDestinationId);
        if (errorNode && isDestinationNode(errorNode.type || '')) {
            channel.error_destination = buildDestinationConfig(errorNode, nodes, edges);
        }
    }

    return channel;
}
