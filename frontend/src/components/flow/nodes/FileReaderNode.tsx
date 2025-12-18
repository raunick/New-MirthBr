import React, { memo, useCallback } from 'react';
import { Handle, Position, NodeProps, useNodeId } from 'reactflow';
import { FileInput } from 'lucide-react';
import { useFlowStore } from '@/stores/useFlowStore';
import InlineEdit from '../InlineEdit';

interface FileReaderData {
    label: string;
    path: string;
    pattern?: string;
}

/**
 * FileReaderNode - File source node
 * Refactored to access store directly (no callback injection)
 */
const FileReaderNode = ({ data }: NodeProps<FileReaderData>) => {
    const nodeId = useNodeId();
    const updateNodeData = useFlowStore((state) => state.updateNodeData);

    const handleChange = useCallback((field: string, value: string | number) => {
        if (nodeId) {
            updateNodeData(nodeId, field, value);
        }
    }, [nodeId, updateNodeData]);

    return (
        <div className="flow-node source px-4 py-3 w-[260px]">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[var(--node-source)]/20 flex items-center justify-center">
                    <FileInput size={20} className="text-[var(--node-source)]" />
                </div>
                <div className="flex-1">
                    <InlineEdit
                        value={data.label || 'File Reader'}
                        onChange={(v) => handleChange('label', v)}
                        className="text-sm font-semibold text-[var(--foreground)]"
                        displayClassName="hover:text-[var(--primary)] cursor-text"
                        inputClassName="bg-transparent border-b border-[var(--primary)] outline-none w-full"
                    />
                    <div className="text-xs text-[var(--foreground-muted)]">File Source</div>
                </div>
            </div>

            <div className="mt-3 space-y-2">
                <div className="p-2 rounded-lg bg-[var(--background)]/50 border border-[var(--glass-border)]">
                    <div className="text-xs text-[var(--foreground-muted)] mb-1">Directory</div>
                    <InlineEdit
                        value={data.path || '/data/input'}
                        onChange={(v) => handleChange('path', v)}
                        className="text-sm font-mono text-[var(--node-source)]"
                        displayClassName="hover:bg-[var(--background)] px-1 rounded cursor-text truncate block"
                        inputClassName="bg-[var(--background)] border border-[var(--glass-border)] rounded px-2 py-0.5 w-full outline-none"
                    />
                </div>

                <div className="p-2 rounded-lg bg-[var(--background)]/50 border border-[var(--glass-border)]">
                    <div className="text-xs text-[var(--foreground-muted)] mb-1">Pattern</div>
                    <InlineEdit
                        value={data.pattern || '*.txt'}
                        onChange={(v) => handleChange('pattern', v)}
                        placeholder="*.txt"
                        className="text-sm font-mono text-[var(--foreground)]"
                        displayClassName="hover:bg-[var(--background)] px-1 rounded cursor-text"
                        inputClassName="bg-[var(--background)] border border-[var(--glass-border)] rounded px-2 py-0.5 w-full outline-none"
                    />
                </div>
            </div>

            <Handle
                type="source"
                position={Position.Right}
                className="!w-3 !h-3 !bg-[var(--node-source)] !border-2 !border-[var(--background)]"
            />
        </div>
    );
};

export default memo(FileReaderNode);

