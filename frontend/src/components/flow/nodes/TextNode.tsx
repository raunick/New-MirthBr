import React, { memo, useState, useEffect } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Type, ChevronDown, ChevronUp } from 'lucide-react';
import InlineEdit from '../InlineEdit';
import { useFlowStore } from '@/stores/useFlowStore';

interface TextNodeData {
    label: string;
    text: string;
    isTemplate: boolean;
    value?: string; // Resolved value after template processing
    onDataChange?: (field: string, value: string | number | boolean) => void;
}

const TextNode = ({ data, id }: NodeProps<TextNodeData>) => {
    const [expanded, setExpanded] = useState(false);
    const nodes = useFlowStore((state) => state.nodes);
    const edges = useFlowStore((state) => state.edges);

    const handleChange = (field: string, value: string | number | boolean) => {
        data.onDataChange?.(field, value);
    };

    // Template Resolution Logic
    useEffect(() => {
        // If not a template, the value is just the text
        if (!data.isTemplate) {
            if (data.value !== data.text) {
                handleChange('value', data.text);
            }
            return;
        }

        // Find inputs connected to this node
        const inputEdges = edges.filter(e => e.target === id);
        let solvedText = data.text || '';

        inputEdges.forEach(edge => {
            const source = nodes.find(n => n.id === edge.source);
            if (!source || !source.data) return;

            const label = source.data.label;
            if (!label) return;

            // Extract value based on node type
            let val: string = '';

            if (source.type === 'textNode') {
                val = String(source.data.value ?? source.data.text ?? '');
            } else if (source.type === 'portNode') {
                val = String(source.data.port ?? '');
            } else if (source.type === 'ipNode') {
                val = String(source.data.ip ?? '');
            } else if (source.type === 'variableNode' && source.data.variables) {
                // For variable node, we might want to support accessing keys directly?
                // Or maybe just stringify? For now let's support exact match if user used variable node label?
                // Actually variable node purpose is key-value store.
                // If user does ${MyVars}, maybe JSON?
                // But usually user connects Variable Node to offer variables.
                // Let's skip deep variable node support for now unless user asked.
                // They used PortNode -> TextNode.
                val = '[Variables]';
            } else {
                // Try generic value/text/label
                val = String(source.data.value ?? source.data.text ?? source.data.label ?? '');
            }

            // Replace ${Label} case-insensitive? Or exact? exact is safer.
            // React Flow labels might have spaces.
            const pattern = new RegExp(`\\$\\{${label}\\}`, 'g');
            solvedText = solvedText.replace(pattern, val);
        });

        if (solvedText !== data.value) {
            handleChange('value', solvedText);
        }
    }, [nodes, edges, id, data.text, data.isTemplate, data.value]);

    const textPreview = (data.value || data.text || '').substring(0, 40);

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
                        <>
                            <textarea
                                value={data.text || ''}
                                onChange={(e) => handleChange('text', e.target.value)}
                                placeholder="Enter text or template..."
                                rows={4}
                                className="w-full text-sm font-mono bg-[var(--background)] border border-[var(--glass-border)] rounded p-2 text-[var(--foreground)] outline-none resize-none"
                            />
                            {data.isTemplate && data.value && data.value !== data.text && (
                                <div className="mt-2 text-xs font-mono text-[var(--success)] break-all border-t border-[var(--glass-border)] pt-2">
                                    ↳ {data.value}
                                </div>
                            )}
                        </>
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
