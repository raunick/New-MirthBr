import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Code2, Edit3 } from 'lucide-react';
import InlineEdit from '../InlineEdit';

interface LuaScriptData {
    label: string;
    code: string;
    onDataChange?: (field: string, value: string | number) => void;
    onEdit?: (code: string) => void;
}

const LuaScriptNode = ({ data, id }: NodeProps<LuaScriptData>) => {
    const handleChange = (field: string, value: string | number) => {
        data.onDataChange?.(field, value);
    };

    const codePreview = (data.code || '').split('\n')[0]?.substring(0, 25) || 'Empty script';

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
                <div className="flex-1">
                    <InlineEdit
                        value={data.label || 'Lua Script'}
                        onChange={(v) => handleChange('label', v)}
                        className="text-sm font-semibold text-[var(--foreground)]"
                        displayClassName="hover:text-[var(--primary)] cursor-text"
                        inputClassName="bg-transparent border-b border-[var(--primary)] outline-none w-full"
                    />
                    <div className="text-xs text-[var(--foreground-muted)]">Lua Processor</div>
                </div>
            </div>

            <div className="mb-2 p-2 rounded-lg bg-[var(--background)]/70 border border-[var(--glass-border)]">
                <code className="text-xs text-[var(--foreground-muted)] font-mono truncate block">
                    {codePreview}...
                </code>
            </div>

            <button
                onClick={() => data.onEdit?.(data.code || '')}
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

export default memo(LuaScriptNode);
