import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Network } from 'lucide-react';
import InlineEdit from '../InlineEdit';

interface TCPSenderData {
    label: string;
    host: string;
    port: number;
    onDataChange?: (field: string, value: string | number) => void;
}

const TCPSenderNode = ({ data, id }: NodeProps<TCPSenderData>) => {
    const handleChange = (field: string, value: string | number) => {
        data.onDataChange?.(field, value);
    };

    return (
        <div className="flow-node destination px-4 py-3 w-[260px]">
            <Handle
                type="target"
                position={Position.Left}
                className="!w-3 !h-3 !bg-[var(--node-destination)] !border-2 !border-[var(--background)]"
            />

            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[var(--node-destination)]/20 flex items-center justify-center">
                    <Network size={20} className="text-[var(--node-destination)]" />
                </div>
                <div className="flex-1">
                    <InlineEdit
                        value={data.label || 'TCP Sender'}
                        onChange={(v) => handleChange('label', v)}
                        className="text-sm font-semibold text-[var(--foreground)]"
                        displayClassName="hover:text-[var(--primary)] cursor-text"
                        inputClassName="bg-transparent border-b border-[var(--primary)] outline-none w-full"
                    />
                    <div className="text-xs text-[var(--foreground-muted)]">TCP Destination</div>
                </div>
            </div>

            <div className="mt-3 p-2 rounded-lg bg-[var(--background)]/50 border border-[var(--glass-border)]">
                <div className="flex items-center gap-2">
                    <div className="flex-1">
                        <div className="text-xs text-[var(--foreground-muted)] mb-1">Host</div>
                        <InlineEdit
                            value={data.host || '127.0.0.1'}
                            onChange={(v) => handleChange('host', v)}
                            className="text-sm font-mono text-[var(--foreground)]"
                            displayClassName="hover:bg-[var(--background)] px-1 rounded cursor-text"
                            inputClassName="bg-[var(--background)] border border-[var(--glass-border)] rounded px-2 py-0.5 w-full outline-none"
                        />
                    </div>
                    <div className="w-20">
                        <div className="text-xs text-[var(--foreground-muted)] mb-1">Port</div>
                        <InlineEdit
                            value={data.port || 9000}
                            onChange={(v) => handleChange('port', v)}
                            type="number"
                            className="text-sm font-mono font-semibold text-[var(--node-destination)]"
                            displayClassName="hover:bg-[var(--background)] px-1 rounded cursor-text"
                            inputClassName="bg-[var(--background)] border border-[var(--node-destination)] rounded px-2 py-0.5 w-full outline-none"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default memo(TCPSenderNode);
