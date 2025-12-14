import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { HardDrive, FileText, Globe } from 'lucide-react';

const DestNode = ({ data }: { data: any }) => {
    const isHttp = data.details?.startsWith('http');
    const Icon = isHttp ? Globe : FileText;

    return (
        <div className="flow-node destination px-4 py-3 w-[220px]">
            <Handle
                type="target"
                position={Position.Left}
                className="!w-3 !h-3 !bg-[var(--node-destination)] !border-2 !border-[var(--background)]"
            />

            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[var(--node-destination)]/20 flex items-center justify-center">
                    <Icon size={20} className="text-[var(--node-destination)]" />
                </div>
                <div>
                    <div className="text-sm font-semibold text-[var(--foreground)]">
                        {data.label || 'File Writer'}
                    </div>
                    <div className="text-xs text-[var(--foreground-muted)]">Destination</div>
                </div>
            </div>

            <div className="mt-3 p-2 rounded-lg bg-[var(--background)]/50 border border-[var(--glass-border)]">
                <div className="text-xs text-[var(--foreground-muted)] mb-1">Output</div>
                <div className="text-sm font-mono text-[var(--node-destination)] truncate">
                    {data.details || 'output.txt'}
                </div>
            </div>
        </div>
    );
};

export default memo(DestNode);
