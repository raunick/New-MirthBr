import React, { memo, useState, useEffect, useCallback } from 'react';
import { NodeProps, useNodeId } from 'reactflow';
import { Type, ChevronDown, ChevronUp } from 'lucide-react';
import { useFlowStore } from '@/stores/useFlowStore';
import InlineEdit from '../InlineEdit';
import BaseNode from './BaseNode';
import './BaseNode.css';

interface TextNodeData {
    label: string;
    text: string;
    isTemplate: boolean;
    value?: string;
}

/**
 * TextNode - Text/template utility node
 * Refactored to use BaseNode for consistent styling
 */
const TextNode = ({ data }: NodeProps<TextNodeData>) => {
    const nodeId = useNodeId();
    const updateNodeData = useFlowStore((state) => state.updateNodeData);
    const [expanded, setExpanded] = useState(false);

    // Stable selector pattern
    const edges = useFlowStore((state) => state.edges);
    const nodes = useFlowStore((state) => state.nodes);

    const inputEdges = React.useMemo(() =>
        edges.filter(e => e.target === nodeId),
        [edges, nodeId]);

    const handleChange = useCallback((field: string, value: string | number | boolean) => {
        if (nodeId) {
            updateNodeData(nodeId, field, value);
        }
    }, [nodeId, updateNodeData]);

    // Template Resolution Logic
    useEffect(() => {
        if (!data.isTemplate) {
            if (data.value !== data.text) {
                handleChange('value', data.text);
            }
            return;
        }

        let solvedText = data.text || '';

        inputEdges.forEach(edge => {
            const source = nodes.find(n => n.id === edge.source);
            if (!source || !source.data) return;

            const label = source.data.label;
            if (!label) return;

            let val: string = '';

            if (source.type === 'textNode') {
                val = String(source.data.value ?? source.data.text ?? '');
            } else if (source.type === 'portNode') {
                val = String(source.data.port ?? '');
            } else if (source.type === 'ipNode') {
                val = String(source.data.ip ?? '');
            } else if (source.type === 'variableNode' && source.data.variables) {
                val = '[Variables]';
            } else {
                val = String(source.data.value ?? source.data.text ?? source.data.label ?? '');
            }

            const pattern = new RegExp(`\\$\\{${label}\\}`, 'g');
            solvedText = solvedText.replace(pattern, val);
        });

        if (solvedText !== data.value) {
            handleChange('value', solvedText);
        }
    }, [inputEdges, nodes, nodeId, data.text, data.isTemplate, data.value, handleChange]);

    const textPreview = (data.value || data.text || '').substring(0, 40);

    return (
        <BaseNode
            category="utility"
            icon={<Type size={20} className="text-[var(--warning)]" />}
            label={data.label || 'Text'}
            subtitle={data.isTemplate ? 'Template' : 'Constant'}
            width="260px"
        >
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
        </BaseNode>
    );
};

export default memo(TextNode);
