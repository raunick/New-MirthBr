import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { Radio } from 'lucide-react';

const SourceNode = ({ data }: { data: any }) => {
    return (
        <div className="flow-node source px-4 py-3 w-[220px]">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[var(--node-source)]/20 flex items-center justify-center">
                    <Radio size={20} className="text-[var(--node-source)]" />
                </div>
                <div>
                    <div className="text-sm font-semibold text-[var(--foreground)]">
                        {data.label || 'HTTP Listener'}
                    </div>
                    <div className="text-xs text-[var(--foreground-muted)]">Source</div>
                </div>
            </div>

            <div className="mt-3 p-2 rounded-lg bg-[var(--background)]/50 border border-[var(--glass-border)]">
                <div className="flex items-center justify-between">
                    <span className="text-xs text-[var(--foreground-muted)]">Port</span>
                    <span className="text-sm font-mono font-semibold text-[var(--node-source)]">
                        {data.port || 8080}
                    </span>
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

export default memo(SourceNode);
