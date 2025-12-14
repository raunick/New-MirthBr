import React, { memo, useState } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Type, ChevronDown, ChevronUp } from 'lucide-react';
import InlineEdit from '../InlineEdit';

interface TextNodeData {
    label: string;
    text: string;
    isTemplate: boolean;
    onDataChange?: (field: string, value: string | number | boolean) => void;
}

const TextNode = ({ data, id }: NodeProps<TextNodeData>) => {
    const [expanded, setExpanded] = useState(false);

    const handleChange = (field: string, value: string | number | boolean) => {
        data.onDataChange?.(field, value);
    };

    const textPreview = (data.text || '').substring(0, 40);

    return (
        <div className="flow-node utility px-4 py-3 w-[260px] border-l-4" style={{ borderLeftColor: 'var(--warning)' }}>
            <Handle
                type="target"
                position={Position.Left}
                className="!w-3 !h-3 !bg-[var(--warning)] !border-2 !border-[var(--background)]"
            />

            <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-[var(--warning)]/20 flex items-center justify-center">
                    <Type size={20} className="text-[var(--warning)]" />
                </div>
                <div className="flex-1">
                    <InlineEdit
                        value={data.label || 'Text'}
                        onChange={(v) => handleChange('label', v)}
                        className="text-sm font-semibold text-[var(--foreground)]"
                        displayClassName="hover:text-[var(--primary)] cursor-text"
                        inputClassName="bg-transparent border-b border-[var(--primary)] outline-none w-full"
                    />
                    <div className="text-xs text-[var(--foreground-muted)]">
                        {data.isTemplate ? 'Template' : 'Constant'}
                    </div>
                </div>
            </div>

            <div className="space-y-2">
                <div className="p-2 rounded-lg bg-[var(--background)]/50 border border-[var(--glass-border)]">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-[var(--foreground-muted)]">Text Content</span>
                        <button
                            onClick={() => setExpanded(!expanded)}
                            className="text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
                        >
                            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                    </div>
                    {expanded ? (
                        <textarea
                            value={data.text || ''}
                            onChange={(e) => handleChange('text', e.target.value)}
                            placeholder="Enter text or template..."
                            rows={4}
                            className="w-full text-sm font-mono bg-[var(--background)] border border-[var(--glass-border)] rounded p-2 text-[var(--foreground)] outline-none resize-none"
                        />
                    ) : (
                        <code className="text-xs text-[var(--warning)] font-mono truncate block">
                            {textPreview || 'Empty'}...
                        </code>
                    )}
                </div>

                <label className="flex items-center gap-2 p-2 rounded-lg bg-[var(--background)]/50 border border-[var(--glass-border)] cursor-pointer">
                    <input
                        type="checkbox"
                        checked={data.isTemplate || false}
                        onChange={(e) => handleChange('isTemplate', e.target.checked)}
                        className="accent-[var(--warning)]"
                    />
                    <span className="text-xs text-[var(--foreground-muted)]">Is Template (supports {'${var}'})</span>
                </label>
            </div>

            <Handle
                type="source"
                position={Position.Right}
                className="!w-3 !h-3 !bg-[var(--warning)] !border-2 !border-[var(--background)]"
            />
        </div>
    );
};

export default memo(TextNode);
