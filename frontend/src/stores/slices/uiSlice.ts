import { StateCreator } from 'zustand';
import { FlowState } from '../../types/store';

export const createUISlice: StateCreator<FlowState, [], [], Pick<FlowState,
    'editorState' | 'openEditor' | 'closeEditor' | 'saveEditorCode'>> = (set, get) => ({
        editorState: {
            isOpen: false,
            nodeId: null,
            field: '',
            initialCode: '',
        },

        openEditor: (nodeId, field, initialCode) => {
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
            set((state) => ({
                editorState: {
                    ...state.editorState,
                    isOpen: false,
                    nodeId: null,
                },
            }));
        },

        saveEditorCode: (code) => {
            const { editorState, updateNodeData } = get();
            if (editorState.nodeId) {
                updateNodeData(editorState.nodeId, editorState.field, code);
            }
        },
    });
