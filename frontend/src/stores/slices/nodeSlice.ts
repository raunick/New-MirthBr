import { StateCreator } from 'zustand';
import { FlowState } from '../../types/store';
import { NodeData } from '../../types/node';
import { nodeDefaults } from '../../constants/nodeDefaults';
import { applyNodeChanges, Node, addEdge, Connection } from 'reactflow';
import { v4 as uuidv4 } from 'uuid';

export const createNodeSlice: StateCreator<FlowState, [], [], Pick<FlowState,
    'nodes' | 'onNodesChange' | 'setNodes' | 'addNode' | 'addNodeAtPosition' |
    'updateNodeData' | 'deleteNode' | 'deleteNodeAndReconnect' | 'duplicateNode'>> = (set, get) => ({
        nodes: [],

        setNodes: (nodes) => set({ nodes }),

        onNodesChange: (changes) => {
            set({
                nodes: applyNodeChanges(changes, get().nodes),
            });
        },

        addNode: (type) => {
            const id = uuidv4();
            // Randomize position slightly
            const basePosition = { x: 300 + Math.random() * 50, y: 200 + Math.random() * 50 };
            const defaultData = nodeDefaults[type] || { label: `New ${type}` };

            const newNode: Node<NodeData> = {
                id,
                type,
                position: basePosition,
                data: { ...defaultData }
            };
            set({ nodes: [...get().nodes, newNode] });
        },

        addNodeAtPosition: (type, position) => {
            const id = uuidv4();
            const defaultData = nodeDefaults[type] || { label: `New ${type}` };

            const newNode: Node<NodeData> = {
                id,
                type,
                position,
                data: { ...defaultData }
            };
            set({ nodes: [...get().nodes, newNode] });
        },

        updateNodeData: (id, field, value) => {
            set({
                nodes: get().nodes.map((node) => {
                    if (node.id === id) {
                        return { ...node, data: { ...node.data, [field]: value } };
                    }
                    return node;
                }),
            });
        },

        deleteNode: (id) => {
            set({
                nodes: get().nodes.filter((node) => node.id !== id),
                edges: get().edges.filter((edge) => edge.source !== id && edge.target !== id),
            });
        },

        deleteNodeAndReconnect: (id) => {
            const { nodes, edges } = get();
            const nodeToDelete = nodes.find((n) => n.id === id);
            if (!nodeToDelete) return;

            const incomingEdges = edges.filter((e) => e.target === id);
            const outgoingEdges = edges.filter((e) => e.source === id);

            const newEdges: any[] = [];

            // Connect all incoming sources to all outgoing targets
            incomingEdges.forEach((inEdge) => {
                outgoingEdges.forEach((outEdge) => {
                    newEdges.push({
                        id: uuidv4(),
                        source: inEdge.source,
                        sourceHandle: inEdge.sourceHandle,
                        target: outEdge.target,
                        targetHandle: outEdge.targetHandle,
                        type: 'default',
                        animated: true
                    });
                });
            });

            set({
                nodes: nodes.filter((n) => n.id !== id),
                edges: [...edges.filter((e) => e.source !== id && e.target !== id), ...newEdges],
            });
        },

        duplicateNode: (id) => {
            const { nodes } = get();
            const nodeToDuplicate = nodes.find((n) => n.id === id);
            if (nodeToDuplicate) {
                const newNode = {
                    ...nodeToDuplicate,
                    id: uuidv4(),
                    position: {
                        x: nodeToDuplicate.position.x + 50,
                        y: nodeToDuplicate.position.y + 50,
                    },
                    data: { ...nodeToDuplicate.data },
                    selected: false,
                };
                set({ nodes: [...nodes, newNode] });
            }
        },
    });
