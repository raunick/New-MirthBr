import React, { memo, useCallback } from 'react';
import { NodeProps, useNodeId } from 'reactflow';
import { Code2, Edit3, Send } from 'lucide-react';
import { useFlowStore } from '@/stores/useFlowStore';
import BaseNode from './BaseNode';
import './BaseNode.css';

interface LuaDestinationData {
    label: string;
    code: string;
}

/**
 * LuaDestinationNode - Lua script destination node
 * Refactored to use BaseNode for consistency
 */
const LuaDestinationNode = ({ data }: NodeProps<LuaDestinationData>) => {
    const nodeId = useNodeId();
    const openEditor = useFlowStore((state) => state.openEditor);

    const handleEdit = useCallback(() => {
        if (nodeId) {
            openEditor(nodeId, 'code', data.code || '-- Write your Lua script to handle the message\n-- return true to indicate success, false for failure\nreturn true');
        }
    }, [nodeId, openEditor, data.code]);

    const codePreview = (data.code || '').split('\n')[0]?.substring(0, 25) || 'Empty script';

    return (
        <BaseNode
            category="destination"
            icon={
                <div className="relative">
                    <Code2 size={20} />
                    <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-[var(--node-destination)] rounded-full flex items-center justify-center">
                        <Send size={7} className="text-white" />
                    </div>
                </div>
            }
            label={data.label || 'Lua Destination'}
            subtitle="Lua Script Destination"
            className="w-[260px]"
            showSourceHandle={false}
        >
            <div className="space-y-2">
                <div className="mb-2 p-2 rounded-lg bg-[var(--background)]/70 border border-[var(--glass-border)]">
                    <code className="text-xs text-[var(--foreground-muted)] font-mono truncate block min-h-[1.5em]">
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
        </BaseNode>
    );
};

export default memo(LuaDestinationNode);

