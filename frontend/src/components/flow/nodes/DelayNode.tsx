import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Timer } from 'lucide-react';
import InlineEdit from '../InlineEdit';

interface DelayNodeData {
    label: string;
    delay: number;
    unit: 'ms' | 's' | 'min';
    onDataChange?: (field: string, value: string | number) => void;
}

const DelayNode = ({ data, id }: NodeProps<DelayNodeData>) => {
    const handleChange = (field: string, value: string | number) => {
        data.onDataChange?.(field, value);
    };

    const getDisplayTime = () => {
        const delay = data.delay || 1000;
        const unit = data.unit || 'ms';
        return `${delay}${unit}`;
    };

    return (
        <div className="flow-node utility px-4 py-3 w-[200px] border-l-4" style={{ borderLeftColor: 'var(--warning)' }}>
            <Handle
                type="target"
                position={Position.Left}
                className="!w-3 !h-3 !bg-[var(--warning)] !border-2 !border-[var(--background)]"
            />

            <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-[var(--warning)]/20 flex items-center justify-center">
                    <Timer size={20} className="text-[var(--warning)]" />
                </div>
                <div className="flex-1">
                    <InlineEdit
                        value={data.label || 'Delay'}
                        onChange={(v) => handleChange('label', v)}
                        className="text-sm font-semibold text-[var(--foreground)]"
                        displayClassName="hover:text-[var(--primary)] cursor-text"
                        inputClassName="bg-transparent border-b border-[var(--primary)] outline-none w-full"
                    />
                    <div className="text-xs text-[var(--foreground-muted)]">Wait: {getDisplayTime()}</div>
                </div>
            </div>

            <div className="space-y-2">
                <div className="p-2 rounded-lg bg-[var(--background)]/50 border border-[var(--glass-border)]">
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-[var(--foreground-muted)]">Delay</span>
                        <InlineEdit
                            value={data.delay || 1000}
                            onChange={(v) => handleChange('delay', v)}
                            type="number"
                            className="text-sm font-mono font-semibold text-[var(--warning)]"
                            displayClassName="hover:bg-[var(--background)] px-2 py-0.5 rounded cursor-text"
                            inputClassName="bg-[var(--background)] border border-[var(--warning)] rounded px-2 py-0.5 w-16 text-right outline-none"
                        />
                        <select
                            value={data.unit || 'ms'}
                            onChange={(e) => handleChange('unit', e.target.value)}
                            className="text-xs bg-[var(--background)] border border-[var(--glass-border)] rounded px-2 py-1 text-[var(--foreground)] outline-none"
                        >
                            <option value="ms">ms</option>
                            <option value="s">sec</option>
                            <option value="min">min</option>
                        </select>
                    </div>
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

export default memo(DelayNode);
