import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Hash } from 'lucide-react';
import InlineEdit from '../InlineEdit';

interface PortNodeData {
    label: string;
    port: number;
    protocol: 'TCP' | 'UDP' | 'HTTP';
    onDataChange?: (field: string, value: string | number) => void;
}

const PortNode = ({ data, id }: NodeProps<PortNodeData>) => {
    const handleChange = (field: string, value: string | number) => {
        data.onDataChange?.(field, value);
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
                    <Hash size={20} className="text-[var(--warning)]" />
                </div>
                <div className="flex-1">
                    <InlineEdit
                        value={data.label || 'Port'}
                        onChange={(v) => handleChange('label', v)}
                        className="text-sm font-semibold text-[var(--foreground)]"
                        displayClassName="hover:text-[var(--primary)] cursor-text"
                        inputClassName="bg-transparent border-b border-[var(--primary)] outline-none w-full"
                    />
                    <div className="text-xs text-[var(--foreground-muted)]">Port Config</div>
                </div>
            </div>

            <div className="space-y-2">
                <div className="p-2 rounded-lg bg-[var(--background)]/50 border border-[var(--glass-border)]">
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-[var(--foreground-muted)]">Port</span>
                        <InlineEdit
                            value={data.port || 8080}
                            onChange={(v) => handleChange('port', v)}
                            type="number"
                            className="text-sm font-mono font-semibold text-[var(--warning)]"
                            displayClassName="hover:bg-[var(--background)] px-2 py-0.5 rounded cursor-text"
                            inputClassName="bg-[var(--background)] border border-[var(--warning)] rounded px-2 py-0.5 w-20 text-right outline-none"
                        />
                    </div>
                </div>

                <div className="p-2 rounded-lg bg-[var(--background)]/50 border border-[var(--glass-border)]">
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-[var(--foreground-muted)]">Protocol</span>
                        <select
                            value={data.protocol || 'TCP'}
                            onChange={(e) => handleChange('protocol', e.target.value)}
                            className="text-sm bg-[var(--background)] border border-[var(--glass-border)] rounded px-2 py-0.5 text-[var(--foreground)] outline-none"
                        >
                            <option value="TCP">TCP</option>
                            <option value="UDP">UDP</option>
                            <option value="HTTP">HTTP</option>
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

export default memo(PortNode);
