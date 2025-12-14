import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { GitMerge } from 'lucide-react';
import InlineEdit from '../InlineEdit';

interface MergeNodeData {
    label: string;
    mode: 'first' | 'all' | 'concat';
    separator: string;
    onDataChange?: (field: string, value: string) => void;
}

const MODES = [
    { value: 'first', label: 'First', description: 'Use first message that arrives' },
    { value: 'all', label: 'All', description: 'Wait for all inputs' },
    { value: 'concat', label: 'Concat', description: 'Concatenate all messages' },
];

const MergeNode = ({ data, id }: NodeProps<MergeNodeData>) => {
    const handleChange = (field: string, value: string) => {
        data.onDataChange?.(field, value);
    };

    const mode = data.mode || 'first';
    const selectedMode = MODES.find(m => m.value === mode);

    return (
        <div className="flow-node utility px-4 py-3 w-[220px] border-l-4" style={{ borderLeftColor: 'var(--warning)' }}>
            {/* Multiple input handles */}
            <Handle
                type="target"
                position={Position.Left}
                id="input-1"
                style={{ top: '30%' }}
                className="!w-3 !h-3 !bg-[var(--warning)] !border-2 !border-[var(--background)]"
            />
            <Handle
                type="target"
                position={Position.Left}
                id="input-2"
                style={{ top: '50%' }}
                className="!w-3 !h-3 !bg-[var(--warning)] !border-2 !border-[var(--background)]"
            />
            <Handle
                type="target"
                position={Position.Left}
                id="input-3"
                style={{ top: '70%' }}
                className="!w-3 !h-3 !bg-[var(--warning)] !border-2 !border-[var(--background)]"
            />

            <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-[var(--warning)]/20 flex items-center justify-center">
                    <GitMerge size={20} className="text-[var(--warning)]" />
                </div>
                <div className="flex-1">
                    <InlineEdit
                        value={data.label || 'Merge'}
                        onChange={(v) => handleChange('label', String(v))}
                        className="text-sm font-semibold text-[var(--foreground)]"
                        displayClassName="hover:text-[var(--primary)] cursor-text"
                        inputClassName="bg-transparent border-b border-[var(--primary)] outline-none w-full"
                    />
                    <div className="text-xs text-[var(--foreground-muted)]">Combine Inputs</div>
                </div>
            </div>

            <div className="space-y-2">
                <div className="p-2 rounded-lg bg-[var(--background)]/50 border border-[var(--glass-border)]">
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-[var(--foreground-muted)]">Mode</span>
                        <select
                            value={mode}
                            onChange={(e) => handleChange('mode', e.target.value)}
                            className="text-xs bg-[var(--background)] border border-[var(--glass-border)] rounded px-2 py-1 text-[var(--foreground)] outline-none"
                        >
                            {MODES.map((m) => (
                                <option key={m.value} value={m.value}>{m.label}</option>
                            ))}
                        </select>
                    </div>
                    <div className="text-xs text-[var(--foreground-muted)]">
                        {selectedMode?.description}
                    </div>
                </div>

                {mode === 'concat' && (
                    <div className="p-2 rounded-lg bg-[var(--background)]/50 border border-[var(--glass-border)]">
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-[var(--foreground-muted)]">Separator</span>
                            <InlineEdit
                                value={data.separator || ''}
                                onChange={(v) => handleChange('separator', String(v))}
                                placeholder=", or \\n"
                                className="text-sm font-mono text-[var(--foreground)]"
                                displayClassName="hover:bg-[var(--background)] px-2 py-0.5 rounded cursor-text"
                                inputClassName="bg-[var(--background)] border border-[var(--glass-border)] rounded px-2 py-0.5 w-16 outline-none"
                            />
                        </div>
                    </div>
                )}
            </div>

            <div className="mt-2 text-xs text-[var(--foreground-muted)] text-center">
                3 input handles
            </div>

            <Handle
                type="source"
                position={Position.Right}
                className="!w-3 !h-3 !bg-[var(--warning)] !border-2 !border-[var(--background)]"
            />
        </div>
    );
};

export default memo(MergeNode);
