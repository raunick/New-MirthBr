import React, { memo, useCallback } from 'react';
import { NodeProps, useNodeId, Position } from 'reactflow';
import { Filter, Edit3 } from 'lucide-react';
import { useFlowStore } from '@/stores/useFlowStore';
import InlineEdit from '../InlineEdit';
import BaseNode from './BaseNode';
import './BaseNode.css';

interface FilterData {
    label: string;
    condition: string;
}

/**
 * FilterNode - Processor node for message filtering
 * Refactored to use BaseNode with multiple source handles
 */
const FilterNode = ({ data }: NodeProps<FilterData>) => {
    const nodeId = useNodeId();
    const updateNodeData = useFlowStore((state) => state.updateNodeData);
    const openEditor = useFlowStore((state) => state.openEditor);

    const handleChange = useCallback((field: string, value: string | number) => {
        if (nodeId) {
            updateNodeData(nodeId, field, value);
        }
    }, [nodeId, updateNodeData]);

    const handleEditCondition = useCallback(() => {
        if (nodeId) {
            openEditor(nodeId, 'condition', data.condition || 'msg.type == "HL7"');
        }
    }, [nodeId, openEditor, data.condition]);

    const conditionPreview = (data.condition || 'msg.type == "HL7"').substring(0, 30);

    return (
        <BaseNode
            category="processor"
            icon={<Filter size={20} className="text-[var(--node-processor-filter)]" />}
            label={data.label || 'Message Filter'}
            subtitle="Filter"
            width="260px"
            style={{ '--node-category-color': 'var(--node-processor-filter)' } as React.CSSProperties}
            sourceHandles={[
                {
                    id: 'pass',
                    color: 'var(--success)',
                    label: '✓ Pass',
                    style: { top: '65%' }
                },
                {
                    id: 'reject',
                    color: 'var(--error)',
                    label: '✗ Reject',
                    style: { top: '85%' }
                }
            ]}
        >
            <div className="mb-2 p-2 rounded-lg bg-[var(--background)]/70 border border-[var(--glass-border)]">
                <div className="text-xs text-[var(--foreground-muted)] mb-1">Condition</div>
                <code className="text-xs text-[var(--node-processor-filter)] font-mono truncate block">
                    {conditionPreview}...
                </code>
            </div>

            <button
                onClick={handleEditCondition}
                className="w-full p-2 rounded-lg bg-[var(--background)]/50 border border-[var(--glass-border)] 
                         hover:border-[var(--node-processor-filter)] transition-colors flex items-center justify-center gap-2
                         text-sm text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
            >
                <Edit3 size={14} />
                Edit Condition
            </button>

            <div className="flex mt-2 text-xs">
                <div className="flex-1 text-center">
                    <span className="inline-flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-[var(--success)]" />
                        Pass
                    </span>
                </div>
                <div className="flex-1 text-center">
                    <span className="inline-flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-[var(--error)]" />
                        Reject
                    </span>
                </div>
            </div>
        </BaseNode>
    );
};

export default memo(FilterNode);
