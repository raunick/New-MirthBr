import { StateCreator } from 'zustand';
import { FlowState } from '../../types/store';
import { Node, Edge } from 'reactflow';
import { NodeData } from '../../types/node';
import { v4 as uuidv4 } from 'uuid';

export const createFlowSlice: StateCreator<FlowState, [], [], Pick<FlowState,
    'saveFlow' | 'loadFlow' | 'exportFlow' | 'importFlow' | 'resetFlow'>> = (set, get) => ({

        saveFlow: () => {
            const { nodes, edges, channelName, channelId, errorDestinationId, maxRetries } = get();

            const sanitizedNodes = nodes.map(node => ({
                ...node,
                data: {
                    ...node.data,
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
                console.error('Failed to save flow to localStorage', e);
            }
        },

        loadFlow: (data?: any) => {
            if (data) {
                set({
                    nodes: data.nodes || [],
                    edges: data.edges || [],
                    channelName: data.channelName || 'Loaded Channel',
                    channelId: data.channelId || uuidv4(),
                    errorDestinationId: data.errorDestinationId,
                    maxRetries: data.maxRetries ?? 3
                });
                return;
            }

            const saved = localStorage.getItem('mirth-flow');
            if (saved) {
                try {
                    const flowData = JSON.parse(saved);
                    let cid = flowData.channelId;
                    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                    if (!cid || !uuidRegex.test(cid)) {
                        cid = uuidv4();
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

        importFlow: (data) => {
            if (data.nodes && Array.isArray(data.nodes)) {
                let cid = data.channelId;
                const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                if (!cid || !uuidRegex.test(cid)) {
                    cid = uuidv4();
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

        resetFlow: () => {
            const newId = uuidv4();
            const initialNodes: Node<NodeData>[] = [];
            set({
                nodes: initialNodes,
                edges: [],
                channelName: 'New Channel',
                channelId: newId,
                errorDestinationId: undefined,
                maxRetries: 3,
                deployStatus: {},
                channelStatus: 'offline',
                isRunning: false
            });
        },
    });
