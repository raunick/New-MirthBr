import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { ScrollText } from 'lucide-react';
import InlineEdit from '../InlineEdit';

interface LoggerNodeData {
    label: string;
    level: 'debug' | 'info' | 'warn' | 'error';
    prefix: string;
    onDataChange?: (field: string, value: string) => void;
}

const LEVEL_COLORS = {
    debug: 'var(--foreground-muted)',
    info: 'var(--primary)',
    warn: 'var(--warning)',
    error: 'var(--error)',
};

const LoggerNode = ({ data, id }: NodeProps<LoggerNodeData>) => {
    const handleChange = (field: string, value: string) => {
        data.onDataChange?.(field, value);
    };

    const level = data.level || 'info';

    return (
        <div className="flow-node utility px-4 py-3 w-[220px] border-l-4" style={{ borderLeftColor: LEVEL_COLORS[level] }}>
            <Handle
                type="target"
                position={Position.Left}
                className="!w-3 !h-3 !bg-[var(--warning)] !border-2 !border-[var(--background)]"
            />

            <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${LEVEL_COLORS[level]}20` }}>
                    <ScrollText size={20} style={{ color: LEVEL_COLORS[level] }} />
                </div>
                <div className="flex-1">
                    <InlineEdit
                        value={data.label || 'Logger'}
                        onChange={(v) => handleChange('label', String(v))}
                        className="text-sm font-semibold text-[var(--foreground)]"
                        displayClassName="hover:text-[var(--primary)] cursor-text"
                        inputClassName="bg-transparent border-b border-[var(--primary)] outline-none w-full"
                    />
                    <div className="text-xs text-[var(--foreground-muted)]">Log Level: {level.toUpperCase()}</div>
                </div>
            </div>

            <div className="space-y-2">
                <div className="p-2 rounded-lg bg-[var(--background)]/50 border border-[var(--glass-border)]">
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-[var(--foreground-muted)]">Level</span>
                        <select
                            value={level}
                            onChange={(e) => handleChange('level', e.target.value)}
                            className="text-xs bg-[var(--background)] border border-[var(--glass-border)] rounded px-2 py-1 text-[var(--foreground)] outline-none"
                            style={{ color: LEVEL_COLORS[level as keyof typeof LEVEL_COLORS] }}
                        >
                            <option value="debug">DEBUG</option>
                            <option value="info">INFO</option>
                            <option value="warn">WARN</option>
                            <option value="error">ERROR</option>
                        </select>
                    </div>
                </div>

                <div className="p-2 rounded-lg bg-[var(--background)]/50 border border-[var(--glass-border)]">
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-[var(--foreground-muted)]">Prefix</span>
                        <InlineEdit
                            value={data.prefix || ''}
                            onChange={(v) => handleChange('prefix', String(v))}
                            placeholder="[MyLog]"
                            className="text-sm font-mono text-[var(--foreground)]"
                            displayClassName="hover:bg-[var(--background)] px-2 py-0.5 rounded cursor-text"
                            inputClassName="bg-[var(--background)] border border-[var(--glass-border)] rounded px-2 py-0.5 w-24 outline-none"
                        />
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

export default memo(LoggerNode);
