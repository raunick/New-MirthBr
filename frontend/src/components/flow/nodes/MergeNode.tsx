import React, { memo, useCallback } from 'react';
import { NodeProps, useNodeId, Position } from 'reactflow';
import { GitMerge } from 'lucide-react';
import { useFlowStore } from '@/stores/useFlowStore';
import InlineEdit from '../InlineEdit';
import BaseNode from './BaseNode';
import './BaseNode.css';

interface MergeNodeData {
    label: string;
    mode: 'first' | 'all' | 'concat';
    separator: string;
}

const MODES = [
    { value: 'first', label: 'First', description: 'Use first message that arrives' },
    { value: 'all', label: 'All', description: 'Wait for all inputs' },
    { value: 'concat', label: 'Concat', description: 'Concatenate all messages' },
];

/**
 * MergeNode - Merge utility node
 * Refactored to use BaseNode with multiple target handles
 */
const MergeNode = ({ data }: NodeProps<MergeNodeData>) => {
    const nodeId = useNodeId();
    const updateNodeData = useFlowStore((state) => state.updateNodeData);

    const handleChange = useCallback((field: string, value: string) => {
        if (nodeId) {
            updateNodeData(nodeId, field, value);
        }
    }, [nodeId, updateNodeData]);

    const mode = data.mode || 'first';
    const selectedMode = MODES.find(m => m.value === mode);

    return (
        <BaseNode
            category="utility"
            icon={<GitMerge size={20} className="text-[var(--warning)]" />}
            label={data.label || 'Merge'}
            subtitle="Combine Inputs"
            width="220px"
            showTargetHandle={false}  // We use custom multi-input handles
            targetHandles={[
                { id: 'input-1', label: 'Input 1', style: { top: '30%' } },
                { id: 'input-2', label: 'Input 2', style: { top: '50%' } },
                { id: 'input-3', label: 'Input 3', style: { top: '70%' } },
            ]}
        >
            <div className="space-y-2">
                <div className="p-2 rounded-lg bg-[var(--background)]/50 border border-[var(--glass-border)]">
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-[var(--foreground-muted)]">Mode</span>
                        <select
                            value={mode}
                            onChange={(e) => handleChange('mode', e.target.value)}
                            className="text-xs bg-[var(--background)] border border-[var(--glass-border)] rounded px-2 py-1 text-[var(--foreground)] outline-none"
                        >
                            {MODES.map((m) => (
                                <option key={m.value} value={m.value}>{m.label}</option>
                            ))}
                        </select>
                    </div>
                    <div className="text-xs text-[var(--foreground-muted)]">
                        {selectedMode?.description}
                    </div>
                </div>

                {mode === 'concat' && (
                    <div className="p-2 rounded-lg bg-[var(--background)]/50 border border-[var(--glass-border)]">
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-[var(--foreground-muted)]">Separator</span>
                            <InlineEdit
                                value={data.separator || ''}
                                onChange={(v) => handleChange('separator', String(v))}
                                placeholder=", or \\n"
                                className="text-sm font-mono text-[var(--foreground)]"
                                displayClassName="hover:bg-[var(--background)] px-2 py-0.5 rounded cursor-text"
                                inputClassName="bg-[var(--background)] border border-[var(--glass-border)] rounded px-2 py-0.5 w-16 outline-none"
                            />
                        </div>
                    </div>
                )}
            </div>

            <div className="mt-2 text-xs text-[var(--foreground-muted)] text-center flex items-center justify-center gap-1">
                <div className="flex gap-1">
                    <div className="w-2 h-2 rounded-full bg-[var(--warning)]" />
                    <div className="w-2 h-2 rounded-full bg-[var(--warning)]" />
                    <div className="w-2 h-2 rounded-full bg-[var(--warning)]" />
                </div>
                3 inputs
            </div>
        </BaseNode>
    );
};

export default memo(MergeNode);
