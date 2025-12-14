import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Network } from 'lucide-react';
import InlineEdit from '../InlineEdit';

interface TCPSourceData {
    label: string;
    port: number;
    onDataChange?: (field: string, value: string | number) => void;
}

const TCPSourceNode = ({ data, id }: NodeProps<TCPSourceData>) => {
    const handleChange = (field: string, value: string | number) => {
        data.onDataChange?.(field, value);
    };

    return (
        <div className="flow-node source-tcp px-4 py-3 w-[240px]">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[var(--node-source-tcp)]/20 flex items-center justify-center">
                    <Network size={20} className="text-[var(--node-source-tcp)]" />
                </div>
                <div className="flex-1">
                    <InlineEdit
                        value={data.label || 'TCP Listener'}
                        onChange={(v) => handleChange('label', v)}
                        className="text-sm font-semibold text-[var(--foreground)]"
                        displayClassName="hover:text-[var(--primary)] cursor-text"
                        inputClassName="bg-transparent border-b border-[var(--primary)] outline-none w-full"
                    />
                    <div className="text-xs text-[var(--foreground-muted)]">TCP Source</div>
                </div>
            </div>

            <div className="mt-3 p-2 rounded-lg bg-[var(--background)]/50 border border-[var(--glass-border)]">
                <div className="flex items-center justify-between">
                    <span className="text-xs text-[var(--foreground-muted)]">Port</span>
                    <InlineEdit
                        value={data.port || 9090}
                        onChange={(v) => handleChange('port', v)}
                        type="number"
                        className="text-sm font-mono font-semibold text-[var(--node-source-tcp)]"
                        displayClassName="hover:bg-[var(--background)] px-2 py-0.5 rounded cursor-text"
                        inputClassName="bg-[var(--background)] border border-[var(--node-source-tcp)] rounded px-2 py-0.5 w-20 text-right outline-none"
                    />
                </div>
            </div>

            <Handle
                type="source"
                position={Position.Right}
                className="!w-3 !h-3 !bg-[var(--node-source-tcp)] !border-2 !border-[var(--background)]"
            />
        </div>
    );
};

export default memo(TCPSourceNode);
