import { StateCreator } from 'zustand';
import { FlowState } from '../../types/store';
import { applyEdgeChanges, addEdge, Connection } from 'reactflow';
import { validateConnection } from '@/lib/connectionValidation';

export const createEdgeSlice: StateCreator<FlowState, [], [], Pick<FlowState,
    'edges' | 'onEdgesChange' | 'onConnect' | 'setEdges' | 'deleteEdge'>> = (set, get) => ({
        edges: [],

        setEdges: (edges) => set({ edges }),

        onEdgesChange: (changes) => {
            set({
                edges: applyEdgeChanges(changes, get().edges),
            });
        },

        onConnect: (connection: Connection) => {
            const { nodes, edges } = get();
            const validationResult = validateConnection(connection, nodes, edges);

            if (validationResult.valid) {
                set({
                    edges: addEdge({ ...connection, type: 'default', animated: true }, edges),
                });
            } else {
                console.warn(`Invalid connection: ${validationResult.reason}`);
            }
        },

        deleteEdge: (id) => {
            set({
                edges: get().edges.filter((edge) => edge.id !== id),
            });
        },
    });
