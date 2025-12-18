import React, { memo, useCallback } from 'react';
import { Handle, Position, NodeProps, useNodeId } from 'reactflow';
import { Clock } from 'lucide-react';
import { useFlowStore } from '@/stores/useFlowStore';
import InlineEdit from '../InlineEdit';

interface TimestampNodeData {
    label: string;
    field: string;
    format: string;
}

const FORMATS = [
    { value: 'ISO', label: 'ISO 8601', example: '2024-01-15T10:30:00.000Z' },
    { value: 'UNIX', label: 'Unix Epoch', example: '1705314600' },
    { value: 'DATE', label: 'Date Only', example: '2024-01-15' },
    { value: 'TIME', label: 'Time Only', example: '10:30:00' },
    { value: 'DATETIME', label: 'DateTime', example: '2024-01-15 10:30:00' },
];

/**
 * TimestampNode - Timestamp utility node
 * Refactored to access store directly (no callback injection)
 */
const TimestampNode = ({ data }: NodeProps<TimestampNodeData>) => {
    const nodeId = useNodeId();
    const updateNodeData = useFlowStore((state) => state.updateNodeData);

    const handleChange = useCallback((field: string, value: string) => {
        if (nodeId) {
            updateNodeData(nodeId, field, value);
        }
    }, [nodeId, updateNodeData]);

    const format = data.format || 'ISO';
    const selectedFormat = FORMATS.find(f => f.value === format);

    return (
        <div className="flow-node utility px-4 py-3 w-[240px] border-l-4" style={{ borderLeftColor: 'var(--warning)' }}>
            <Handle
                type="target"
                position={Position.Left}
                className="!w-3 !h-3 !bg-[var(--warning)] !border-2 !border-[var(--background)]"
            />

            <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-[var(--warning)]/20 flex items-center justify-center">
                    <Clock size={20} className="text-[var(--warning)]" />
                </div>
                <div className="flex-1">
                    <InlineEdit
                        value={data.label || 'Timestamp'}
                        onChange={(v) => handleChange('label', String(v))}
                        className="text-sm font-semibold text-[var(--foreground)]"
                        displayClassName="hover:text-[var(--primary)] cursor-text"
                        inputClassName="bg-transparent border-b border-[var(--primary)] outline-none w-full"
                    />
                    <div className="text-xs text-[var(--foreground-muted)]">Add Timestamp</div>
                </div>
            </div>

            <div className="space-y-2">
                <div className="p-2 rounded-lg bg-[var(--background)]/50 border border-[var(--glass-border)]">
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-[var(--foreground-muted)]">Field Name</span>
                        <InlineEdit
                            value={data.field || 'timestamp'}
                            onChange={(v) => handleChange('field', String(v))}
                            placeholder="timestamp"
                            className="text-sm font-mono text-[var(--warning)]"
                            displayClassName="hover:bg-[var(--background)] px-2 py-0.5 rounded cursor-text"
                            inputClassName="bg-[var(--background)] border border-[var(--warning)] rounded px-2 py-0.5 w-24 outline-none"
                        />
                    </div>
                </div>

                <div className="p-2 rounded-lg bg-[var(--background)]/50 border border-[var(--glass-border)]">
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-[var(--foreground-muted)]">Format</span>
                        <select
                            value={format}
                            onChange={(e) => handleChange('format', e.target.value)}
                            className="text-xs bg-[var(--background)] border border-[var(--glass-border)] rounded px-2 py-1 text-[var(--foreground)] outline-none"
                        >
                            {FORMATS.map((f) => (
                                <option key={f.value} value={f.value}>{f.label}</option>
                            ))}
                        </select>
                    </div>
                    <code className="text-xs text-[var(--foreground-muted)] font-mono block truncate">
                        {selectedFormat?.example}
                    </code>
                </div>
            </div>

            <Handle
                type="source"
                position={Position.Right}
                className="!w-3 !h-3 !bg-[var(--warning)] !border-2 !border-[var(--background)]"
            />
        </div>
    );
};

export default memo(TimestampNode);

