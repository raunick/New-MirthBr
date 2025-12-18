import { StateCreator } from 'zustand';
import { FlowState } from '../../types/store';
import { deployChannel, testChannel as testChannelApi, getChannelStatus, startChannel, stopChannel } from '@/lib/api';

export const createChannelSlice: StateCreator<FlowState, [], [], Pick<FlowState,
    'channelName' | 'channelId' | 'errorDestinationId' | 'maxRetries' |
    'deployStatus' | 'channelStatus' | 'isRunning' |
    'setChannelName' | 'setChannelId' | 'setErrorDestinationId' |
    'setMaxRetries' | 'setRunning' | 'stopCurrentChannel' |
    'executeDeploy' | 'toggleChannelStatus' | 'testChannel'
>> = (set, get) => ({

    channelName: 'My Channel',
    channelId: 'channel-1', // Should be UUID really, but constructor/initializer will set it
    errorDestinationId: undefined,
    maxRetries: 3,

    deployStatus: {},
    channelStatus: 'offline',
    isRunning: false,

    setChannelName: (name) => set({ channelName: name }),
    setChannelId: (id) => set({ channelId: id }),
    setErrorDestinationId: (id) => set({ errorDestinationId: id }),
    setMaxRetries: (count) => set({ maxRetries: count }),

    setRunning: (running) => set({ isRunning: running }),

    stopCurrentChannel: async () => {
        const { channelId } = get();
        try {
            await stopChannel(channelId);
            set({ isRunning: false, channelStatus: 'offline' });
        } catch (error) {
            console.error('Failed to stop channel:', error);
            throw error;
        }
    },

    executeDeploy: async (nodeId) => {
        set((state) => ({
            deployStatus: { ...state.deployStatus, [nodeId]: 'loading' }
        }));

        try {
            const { nodes, edges, channelName, channelId, errorDestinationId, maxRetries } = get();

            // Dynamic import to avoid heavy loads or cycle? Standard import might be fine if flow-compiler is pure.
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

            // 3. Deploy
            await deployChannel({
                channel: channelConfig,
                frontend_schema: frontendSchema
            });

            // 4. Start Channel
            await startChannel(channelId);

            set((state) => ({
                deployStatus: { ...state.deployStatus, [nodeId]: 'success' },
                channelStatus: 'online',
                isRunning: true
            }));

            get().saveFlow();

        } catch (e) {
            console.error("Deploy failed", e);
            set((state) => ({
                deployStatus: { ...state.deployStatus, [nodeId]: 'error' }
            }));
        }
    },

    toggleChannelStatus: async (nodeId, status) => {
        const { channelId } = get();

        set((state) => ({
            deployStatus: { ...state.deployStatus, [nodeId]: 'loading' }
        }));

        try {
            if (status === 'online') {
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

    testChannel: async (payloadType, payload) => {
        const { channelId } = get();
        await testChannelApi(channelId, payloadType, payload);
    },
});
