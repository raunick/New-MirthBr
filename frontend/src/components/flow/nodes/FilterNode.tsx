import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Filter, Edit3 } from 'lucide-react';
import InlineEdit from '../InlineEdit';

interface FilterData {
    label: string;
    condition: string;
    onDataChange?: (field: string, value: string | number) => void;
    onEditCondition?: (condition: string) => void;
}

const FilterNode = ({ data, id }: NodeProps<FilterData>) => {
    const handleChange = (field: string, value: string | number) => {
        data.onDataChange?.(field, value);
    };

    const conditionPreview = (data.condition || 'msg.type == "HL7"').substring(0, 30);

    return (
        <div className="flow-node processor-filter px-4 py-3 w-[260px]">
            <Handle
                type="target"
                position={Position.Left}
                className="!w-3 !h-3 !bg-[var(--node-processor-filter)] !border-2 !border-[var(--background)]"
            />

            <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-[var(--node-processor-filter)]/20 flex items-center justify-center">
                    <Filter size={20} className="text-[var(--node-processor-filter)]" />
                </div>
                <div className="flex-1">
                    <InlineEdit
                        value={data.label || 'Message Filter'}
                        onChange={(v) => handleChange('label', v)}
                        className="text-sm font-semibold text-[var(--foreground)]"
                        displayClassName="hover:text-[var(--primary)] cursor-text"
                        inputClassName="bg-transparent border-b border-[var(--primary)] outline-none w-full"
                    />
                    <div className="text-xs text-[var(--foreground-muted)]">Filter</div>
                </div>
            </div>

            <div className="mb-2 p-2 rounded-lg bg-[var(--background)]/70 border border-[var(--glass-border)]">
                <div className="text-xs text-[var(--foreground-muted)] mb-1">Condition</div>
                <code className="text-xs text-[var(--node-processor-filter)] font-mono truncate block">
                    {conditionPreview}...
                </code>
            </div>

            <button
                onClick={() => data.onEditCondition?.(data.condition || '')}
                className="w-full p-2 rounded-lg bg-[var(--background)]/50 border border-[var(--glass-border)] 
                         hover:border-[var(--node-processor-filter)] transition-colors flex items-center justify-center gap-2
                         text-sm text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
            >
                <Edit3 size={14} />
                Edit Condition
            </button>

            <div className="flex mt-2 text-xs">
                <div className="flex-1 text-center text-[var(--success)]">✓ Pass</div>
                <div className="flex-1 text-center text-[var(--error)]">✗ Reject</div>
            </div>

            <Handle
                type="source"
                position={Position.Right}
                id="pass"
                style={{ top: '70%' }}
                className="!w-3 !h-3 !bg-[var(--success)] !border-2 !border-[var(--background)]"
            />
            <Handle
                type="source"
                position={Position.Right}
                id="reject"
                style={{ top: '85%' }}
                className="!w-3 !h-3 !bg-[var(--error)] !border-2 !border-[var(--background)]"
            />
        </div>
    );
};

export default memo(FilterNode);
