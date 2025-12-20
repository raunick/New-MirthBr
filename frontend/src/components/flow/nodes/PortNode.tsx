import React, { memo, useCallback } from 'react';
import { NodeProps, useNodeId } from 'reactflow';
import { Hash } from 'lucide-react';
import { useFlowStore } from '@/stores/useFlowStore';
import InlineEdit from '../InlineEdit';
import BaseNode from './BaseNode';
import './BaseNode.css';

interface PortNodeData {
    label: string;
    port: number;
    protocol: 'TCP' | 'UDP' | 'HTTP';
}

/**
 * PortNode - Port configuration utility node
 * Refactored to use BaseNode for consistent styling
 */
const PortNode = ({ data }: NodeProps<PortNodeData>) => {
    const nodeId = useNodeId();
    const updateNodeData = useFlowStore((state) => state.updateNodeData);

    const handleChange = useCallback((field: string, value: string | number) => {
        if (nodeId) {
            updateNodeData(nodeId, field, value);
        }
    }, [nodeId, updateNodeData]);

    return (
        <BaseNode
            category="utility"
            icon={<Hash size={20} className="text-[var(--warning)]" />}
            label={data.label || 'Port'}
            subtitle="Port Config"
            width="200px"
        >
            <div className="space-y-2">
                <div className="p-2 rounded-lg bg-[var(--background)]/50 border border-[var(--glass-border)]">
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-[var(--foreground-muted)]">Port</span>
                        <InlineEdit
                            value={data.port || 8080}
                            onChange={(v) => handleChange('port', v)}
                            type="number"
                            className="text-sm font-mono font-semibold text-[var(--warning)]"
                            displayClassName="hover:bg-[var(--background)] px-2 py-0.5 rounded cursor-text"
                            inputClassName="bg-[var(--background)] border border-[var(--warning)] rounded px-2 py-0.5 w-20 text-right outline-none"
                        />
                    </div>
                </div>

                <div className="p-2 rounded-lg bg-[var(--background)]/50 border border-[var(--glass-border)]">
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-[var(--foreground-muted)]">Protocol</span>
                        <select
                            value={data.protocol || 'TCP'}
                            onChange={(e) => handleChange('protocol', e.target.value)}
                            className="text-sm bg-[var(--background)] border border-[var(--glass-border)] rounded px-2 py-0.5 text-[var(--foreground)] outline-none"
                        >
                            <option value="TCP">TCP</option>
                            <option value="UDP">UDP</option>
                            <option value="HTTP">HTTP</option>
                        </select>
                    </div>
                </div>
            </div>
        </BaseNode>
    );
};

export default memo(PortNode);
