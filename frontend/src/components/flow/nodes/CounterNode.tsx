import React, { memo, useCallback } from 'react';
import { Handle, Position, NodeProps, useNodeId } from 'reactflow';
import { Calculator, RotateCcw } from 'lucide-react';
import { useFlowStore } from '@/stores/useFlowStore';
import InlineEdit from '../InlineEdit';

interface CounterNodeData {
    label: string;
    count: number;
    resetInterval: number;
}

/**
 * CounterNode - Counting utility node
 * Refactored to access store directly (no callback injection)
 */
const CounterNode = ({ data }: NodeProps<CounterNodeData>) => {
    const nodeId = useNodeId();
    const updateNodeData = useFlowStore((state) => state.updateNodeData);

    const handleChange = useCallback((field: string, value: number) => {
        if (nodeId) {
            updateNodeData(nodeId, field, value);
        }
    }, [nodeId, updateNodeData]);

    const count = data.count || 0;

    return (
        <div className="flow-node utility px-4 py-3 w-[200px] border-l-4" style={{ borderLeftColor: 'var(--warning)' }}>
            <Handle
                type="target"
                position={Position.Left}
                className="!w-3 !h-3 !bg-[var(--warning)] !border-2 !border-[var(--background)]"
            />

            <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-[var(--warning)]/20 flex items-center justify-center">
                    <Calculator size={20} className="text-[var(--warning)]" />
                </div>
                <div className="flex-1">
                    <InlineEdit
                        value={data.label || 'Counter'}
                        onChange={(v) => handleChange('label', v as unknown as number)}
                        className="text-sm font-semibold text-[var(--foreground)]"
                        displayClassName="hover:text-[var(--primary)] cursor-text"
                        inputClassName="bg-transparent border-b border-[var(--primary)] outline-none w-full"
                    />
                    <div className="text-xs text-[var(--foreground-muted)]">Message Counter</div>
                </div>
            </div>

            <div className="space-y-2">
                {/* Current Count Display */}
                <div className="p-3 rounded-lg bg-[var(--background)]/70 border border-[var(--glass-border)] text-center">
                    <div className="text-2xl font-bold font-mono text-[var(--warning)]">
                        {count.toLocaleString()}
                    </div>
                    <div className="text-xs text-[var(--foreground-muted)]">messages</div>
                </div>

                {/* Reset Interval */}
                <div className="p-2 rounded-lg bg-[var(--background)]/50 border border-[var(--glass-border)]">
                    <div className="flex items-center gap-2">
                        <RotateCcw size={12} className="text-[var(--foreground-muted)]" />
                        <span className="text-xs text-[var(--foreground-muted)]">Reset every</span>
                        <InlineEdit
                            value={data.resetInterval || 0}
                            onChange={(v) => handleChange('resetInterval', v as number)}
                            type="number"
                            className="text-sm font-mono text-[var(--foreground)]"
                            displayClassName="hover:bg-[var(--background)] px-1 py-0.5 rounded cursor-text"
                            inputClassName="bg-[var(--background)] border border-[var(--glass-border)] rounded px-1 py-0.5 w-12 text-center outline-none"
                        />
                        <span className="text-xs text-[var(--foreground-muted)]">sec</span>
                    </div>
                    <div className="text-xs text-[var(--foreground-muted)] mt-1">0 = no auto-reset</div>
                </div>
            </div>

            <Handle
                type="source"
                position={Position.Right}
                className="!w-3 !h-3 !bg-[var(--warning)] !border-2 !border-[var(--background)]"
            />
        </div>
    );
};

export default memo(CounterNode);

