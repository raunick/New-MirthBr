import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { Code2, Edit3 } from 'lucide-react';

const ProcessorNode = ({ data }: { data: any }) => {
    return (
        <div className="flow-node processor px-4 py-3 w-[260px]">
            <Handle
                type="target"
                position={Position.Left}
                className="!w-3 !h-3 !bg-[var(--node-processor)] !border-2 !border-[var(--background)]"
            />

            <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-[var(--node-processor)]/20 flex items-center justify-center">
                    <Code2 size={20} className="text-[var(--node-processor)]" />
                </div>
                <div>
                    <div className="text-sm font-semibold text-[var(--foreground)]">
                        {data.label || 'Lua Script'}
                    </div>
                    <div className="text-xs text-[var(--foreground-muted)]">Processor</div>
                </div>
            </div>

            <button
                onClick={() => data.onEdit(data.code)}
                className="w-full p-2 rounded-lg bg-[var(--background)]/50 border border-[var(--glass-border)] 
                         hover:border-[var(--node-processor)] transition-colors flex items-center justify-center gap-2
                         text-sm text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
            >
                <Edit3 size={14} />
                Edit Script
            </button>

            <Handle
                type="source"
                position={Position.Right}
                className="!w-3 !h-3 !bg-[var(--node-processor)] !border-2 !border-[var(--background)]"
            />
        </div>
    );
};

export default memo(ProcessorNode);
