import React, { memo, useCallback } from 'react';
import { Handle, Position, NodeProps, useNodeId } from 'reactflow';
import { Database, Edit3 } from 'lucide-react';
import { useFlowStore } from '@/stores/useFlowStore';
import InlineEdit from '../InlineEdit';

interface DatabasePollerData {
    label: string;
    query: string;
    interval: number;
}

/**
 * DatabasePollerNode - Database source node
 * Refactored to access store directly (no callback injection)
 */
const DatabasePollerNode = ({ data }: NodeProps<DatabasePollerData>) => {
    const nodeId = useNodeId();
    const updateNodeData = useFlowStore((state) => state.updateNodeData);
    const openEditor = useFlowStore((state) => state.openEditor);

    const handleChange = useCallback((field: string, value: string | number) => {
        if (nodeId) {
            updateNodeData(nodeId, field, value);
        }
    }, [nodeId, updateNodeData]);

    const handleEditQuery = useCallback(() => {
        if (nodeId) {
            openEditor(nodeId, 'query', data.query || 'SELECT * FROM table WHERE processed = false');
        }
    }, [nodeId, openEditor, data.query]);

    return (
        <div className="flow-node source-db px-4 py-3 w-[260px]">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[var(--node-source-db)]/20 flex items-center justify-center">
                    <Database size={20} className="text-[var(--node-source-db)]" />
                </div>
                <div className="flex-1">
                    <InlineEdit
                        value={data.label || 'Database Poller'}
                        onChange={(v) => handleChange('label', v)}
                        className="text-sm font-semibold text-[var(--foreground)]"
                        displayClassName="hover:text-[var(--primary)] cursor-text"
                        inputClassName="bg-transparent border-b border-[var(--primary)] outline-none w-full"
                    />
                    <div className="text-xs text-[var(--foreground-muted)]">Database Source</div>
                </div>
            </div>

            <div className="mt-3 space-y-2">
                <div className="p-2 rounded-lg bg-[var(--background)]/50 border border-[var(--glass-border)]">
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-[var(--foreground-muted)]">Poll Interval (s)</span>
                        <InlineEdit
                            value={data.interval || 60}
                            onChange={(v) => handleChange('interval', v)}
                            type="number"
                            className="text-sm font-mono font-semibold text-[var(--node-source-db)]"
                            displayClassName="hover:bg-[var(--background)] px-2 py-0.5 rounded cursor-text"
                            inputClassName="bg-[var(--background)] border border-[var(--node-source-db)] rounded px-2 py-0.5 w-16 text-right outline-none"
                        />
                    </div>
                </div>

                <button
                    onClick={handleEditQuery}
                    className="w-full p-2 rounded-lg bg-[var(--background)]/50 border border-[var(--glass-border)] 
                             hover:border-[var(--node-source-db)] transition-colors flex items-center justify-center gap-2
                             text-sm text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
                >
                    <Edit3 size={14} />
                    Edit SQL Query
                </button>
            </div>

            <Handle
                type="source"
                position={Position.Right}
                className="!w-3 !h-3 !bg-[var(--node-source-db)] !border-2 !border-[var(--background)]"
            />
        </div>
    );
};

export default memo(DatabasePollerNode);

