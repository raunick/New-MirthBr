import { Node, Edge, Connection } from 'reactflow';

// Node category definitions
const SOURCE_TYPES = ['httpListener', 'tcpListener', 'fileReader', 'databasePoller'];
const PROCESSOR_TYPES = ['luaScript', 'mapper', 'filter', 'router', 'hl7Parser'];
const DESTINATION_TYPES = ['fileWriter', 'httpSender', 'databaseWriter', 'tcpSender', 'luaDestination'];
const UTILITY_TYPES = ['ipNode', 'portNode', 'textNode', 'variableNode', 'commentNode', 'delayNode', 'loggerNode', 'counterNode', 'timestampNode', 'mergeNode'];

export type NodeCategory = 'source' | 'processor' | 'destination' | 'utility';

export function getNodeCategory(nodeType: string): NodeCategory {
    if (SOURCE_TYPES.includes(nodeType)) return 'source';
    if (PROCESSOR_TYPES.includes(nodeType)) return 'processor';
    if (DESTINATION_TYPES.includes(nodeType)) return 'destination';
    if (UTILITY_TYPES.includes(nodeType)) return 'utility';
    return 'processor'; // default
}

/**
 * Check if a connection is valid based on node types
 * Rules:
 * - Source can connect to Processor or Destination
 * - Processor can connect to Processor or Destination
 * - Destination cannot have outgoing connections
 * - Utility nodes can connect to anything except Comment
 */
export function isValidConnection(
    connection: Connection,
    nodes: Node[],
    edges: Edge[]
): boolean {
    const sourceNode = nodes.find(n => n.id === connection.source);
    const targetNode = nodes.find(n => n.id === connection.target);

    if (!sourceNode || !targetNode) return false;

    const sourceType = sourceNode.type || '';
    const targetType = targetNode.type || '';

    const sourceCategory = getNodeCategory(sourceType);
    const targetCategory = getNodeCategory(targetType);

    // Comment nodes cannot have connections
    if (sourceType === 'commentNode' || targetType === 'commentNode') {
        return false;
    }

    // Destination nodes cannot be source of a connection
    if (sourceCategory === 'destination') {
        return false;
    }

    // Source nodes cannot be target of a connection
    // EXCEPTION: Configuration handles on Source nodes (e.g. config-port, config-url)
    const isConfigHandle = connection.targetHandle?.startsWith('config-');

    if (targetCategory === 'source' && targetType !== 'mergeNode' && !isConfigHandle) {
        return false;
    }

    // Prevent self-connections
    if (connection.source === connection.target) {
        return false;
    }

    return true;
}

/**
 * Check if adding a connection would create a cycle in the graph
 * Uses DFS to detect cycles
 */
export function wouldCreateCycle(
    connection: Connection,
    nodes: Node[],
    edges: Edge[]
): boolean {
    if (!connection.source || !connection.target) return false;

    // Build adjacency list
    const adjacencyList = new Map<string, Set<string>>();

    nodes.forEach(node => {
        adjacencyList.set(node.id, new Set());
    });

    edges.forEach(edge => {
        const sources = adjacencyList.get(edge.source);
        if (sources) {
            sources.add(edge.target);
        }
    });

    // Add the proposed connection
    const sourceSet = adjacencyList.get(connection.source);
    if (sourceSet) {
        sourceSet.add(connection.target);
    }

    // DFS to detect cycle
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    function hasCycle(nodeId: string): boolean {
        if (recursionStack.has(nodeId)) {
            return true; // Found a cycle
        }
        if (visited.has(nodeId)) {
            return false; // Already fully explored
        }

        visited.add(nodeId);
        recursionStack.add(nodeId);

        const neighbors = adjacencyList.get(nodeId) || new Set();
        for (const neighbor of neighbors) {
            if (hasCycle(neighbor)) {
                return true;
            }
        }

        recursionStack.delete(nodeId);
        return false;
    }

    // Check from the source of the new connection
    return hasCycle(connection.source);
}

/**
 * Combined validation: checks both connection validity and cycle prevention
 */
export function validateConnection(
    connection: Connection,
    nodes: Node[],
    edges: Edge[]
): { valid: boolean; reason?: string } {
    if (!isValidConnection(connection, nodes, edges)) {
        return { valid: false, reason: 'Invalid connection between these node types' };
    }

    if (wouldCreateCycle(connection, nodes, edges)) {
        return { valid: false, reason: 'This connection would create a cycle' };
    }

    return { valid: true };
}

/**
 * Get the maximum connections allowed for a node type
 */
export function getMaxConnections(nodeType: string): { input: number; output: number } {
    const category = getNodeCategory(nodeType);

    switch (nodeType) {
        case 'mergeNode':
            return { input: 10, output: 1 };
        case 'router':
            return { input: 1, output: 10 };
        case 'filter':
            return { input: 1, output: 2 }; // pass and reject
        case 'commentNode':
            return { input: 0, output: 0 };
        default:
            if (category === 'source') return { input: 0, output: 1 };
            if (category === 'destination') return { input: 1, output: 0 };
            return { input: 1, output: 1 };
    }
}

/**
 * Check if a node can accept more connections
 */
export function canAcceptMoreConnections(
    nodeId: string,
    handleType: 'source' | 'target',
    nodes: Node[],
    edges: Edge[]
): boolean {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return false;

    const maxConnections = getMaxConnections(node.type || '');

    if (handleType === 'source') {
        const currentOutputs = edges.filter(e => e.source === nodeId).length;
        return currentOutputs < maxConnections.output;
    } else {
        const currentInputs = edges.filter(e => e.target === nodeId).length;
        return currentInputs < maxConnections.input;
    }
}
