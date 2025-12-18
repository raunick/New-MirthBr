import React, { memo, useCallback } from 'react';
import { Handle, Position, NodeProps, useNodeId } from 'reactflow';
import { Code2, Edit3, Send } from 'lucide-react';
import { useFlowStore } from '@/stores/useFlowStore';
import InlineEdit from '../InlineEdit';

interface LuaDestinationData {
    label: string;
    code: string;
}

/**
 * LuaDestinationNode - Lua script destination node
 * Refactored to access store directly (no callback injection)
 */
const LuaDestinationNode = ({ data }: NodeProps<LuaDestinationData>) => {
    const nodeId = useNodeId();
    const updateNodeData = useFlowStore((state) => state.updateNodeData);
    const openEditor = useFlowStore((state) => state.openEditor);

    const handleChange = useCallback((field: string, value: string | number) => {
        if (nodeId) {
            updateNodeData(nodeId, field, value);
        }
    }, [nodeId, updateNodeData]);

    const handleEdit = useCallback(() => {
        if (nodeId) {
            openEditor(nodeId, 'code', data.code || '-- Write your Lua script to handle the message\n-- return true to indicate success, false for failure\nreturn true');
        }
    }, [nodeId, openEditor, data.code]);

    const codePreview = (data.code || '').split('\n')[0]?.substring(0, 25) || 'Empty script';

    return (
        <div className="flow-node destination px-4 py-3 w-[260px]">
            <Handle
                type="target"
                position={Position.Left}
                className="!w-3 !h-3 !bg-[var(--node-destination)] !border-2 !border-[var(--background)]"
            />

            <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-[var(--node-destination)]/20 flex items-center justify-center relative">
                    <Code2 size={20} className="text-[var(--node-destination)]" />
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-[var(--node-destination)] rounded-full flex items-center justify-center">
                        <Send size={8} className="text-white" />
                    </div>
                </div>
                <div className="flex-1">
                    <InlineEdit
                        value={data.label || 'Lua Destination'}
                        onChange={(v) => handleChange('label', v)}
                        className="text-sm font-semibold text-[var(--foreground)]"
                        displayClassName="hover:text-[var(--primary)] cursor-text"
                        inputClassName="bg-transparent border-b border-[var(--primary)] outline-none w-full"
                    />
                    <div className="text-xs text-[var(--foreground-muted)]">Lua Script Destination</div>
                </div>
            </div>

            <div className="mb-2 p-2 rounded-lg bg-[var(--background)]/70 border border-[var(--glass-border)]">
                <code className="text-xs text-[var(--foreground-muted)] font-mono truncate block">
                    {codePreview}...
                </code>
            </div>

            <button
                onClick={handleEdit}
                className="w-full p-2 rounded-lg bg-[var(--background)]/50 border border-[var(--glass-border)] 
                         hover:border-[var(--node-destination)] transition-colors flex items-center justify-center gap-2
                         text-sm text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
            >
                <Edit3 size={14} />
                Edit Script
            </button>
        </div>
    );
};

export default memo(LuaDestinationNode);

