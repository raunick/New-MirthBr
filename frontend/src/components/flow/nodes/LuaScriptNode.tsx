import React, { memo, useCallback } from 'react';
import { Handle, Position, NodeProps, useNodeId } from 'reactflow';
import { Code2, Edit3 } from 'lucide-react';
import { useFlowStore } from '@/stores/useFlowStore';
import InlineEdit from '../InlineEdit';
import BaseNode from './BaseNode';
import './BaseNode.css';

interface LuaScriptData {
    label: string;
    code: string;
}

/**
 * LuaScriptNode - Processor node for Lua script execution
 * Refactored to access store directly (no callback injection)
 */
const LuaScriptNode = ({ data }: NodeProps<LuaScriptData>) => {
    const nodeId = useNodeId();
    const updateNodeData = useFlowStore((state) => state.updateNodeData);
    const openEditor = useFlowStore((state) => state.openEditor);

    const handleChange = useCallback((field: string, value: string | number) => {
        if (nodeId) {
            updateNodeData(nodeId, field, value);
        }
    }, [nodeId, updateNodeData]);

    const handleEditCode = useCallback(() => {
        if (nodeId) {
            openEditor(nodeId, 'code', data.code || '');
        }
    }, [nodeId, openEditor, data.code]);

    const codePreview = (data.code || '').split('\n')[0]?.substring(0, 30) || 'Empty script';

    return (
        <BaseNode
            category="processor"
            icon={<Code2 size={20} />}
            label={data.label || 'Lua Script'}
            subtitle="Lua Processor"
            className="w-[260px]"
        >
            <div className="space-y-2">
                <div className="mb-2 p-2 rounded-lg bg-[var(--background)]/70 border border-[var(--glass-border)] group relative">
                    <div className="absolute top-0 right-0 p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-[10px] text-[var(--foreground-muted)]">preview</span>
                    </div>
                    <code className="text-xs text-[var(--foreground-muted)] font-mono truncate block min-h-[1.5em]">
                        {codePreview}
                        {(data.code || '').length > 30 && '...'}
                    </code>
                </div>

                <button
                    onClick={handleEditCode}
                    className="w-full p-2 rounded-lg bg-[var(--background)]/50 border border-[var(--glass-border)] 
                             hover:border-[var(--node-processor)] transition-colors flex items-center justify-center gap-2
                             text-sm text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
                    title="Open Code Editor"
                >
                    <Edit3 size={14} />
                    Edit Script
                </button>
            </div>
        </BaseNode>
    );
};

export default memo(LuaScriptNode);
