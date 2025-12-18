import React, { memo, useCallback, useEffect } from 'react';
import { Handle, Position, NodeProps, useNodeId } from 'reactflow';
import { Network } from 'lucide-react';
import { useFlowStore } from '@/stores/useFlowStore';
import InlineEdit from '../InlineEdit';

interface TCPSenderData {
    label: string;
    host: string;
    port: number;
}

/**
 * TCPSenderNode - TCP destination node
 * Refactored to access store directly (no callback injection)
 */
const TCPSenderNode = ({ data }: NodeProps<TCPSenderData>) => {
    const nodeId = useNodeId();
    const updateNodeData = useFlowStore((state) => state.updateNodeData);

    const edges = useFlowStore((state) => state.edges);
    const nodes = useFlowStore((state) => state.nodes);

    // Stable usage of edges
    const configEdges = React.useMemo(() =>
        edges.filter(e => e.target === nodeId && e.targetHandle?.startsWith('config-')),
        [edges, nodeId]);

    const handleChange = useCallback((field: string, value: string | number) => {
        if (nodeId) {
            updateNodeData(nodeId, field, value);
        }
    }, [nodeId, updateNodeData]);

    useEffect(() => {
        // Sync Port
        const portEdge = configEdges.find(e => e.targetHandle === 'config-port');
        if (portEdge) {
            const node = nodes.find(n => n.id === portEdge.source);
            if (node?.type === 'portNode' && node.data.port !== undefined && node.data.port != data.port) {
                handleChange('port', node.data.port);
            }
        }
        // Sync Host
        const hostEdge = configEdges.find(e => e.targetHandle === 'config-host');
        if (hostEdge) {
            const node = nodes.find(n => n.id === hostEdge.source);
            if (node?.type === 'ipNode' && node.data.ip !== undefined && node.data.ip != data.host) {
                handleChange('host', node.data.ip);
            }
        }
    }, [configEdges, nodes, data.port, data.host, handleChange]);

    return (
        <div className="flow-node destination px-4 py-3 w-[260px]">
            <Handle
                type="target"
                position={Position.Left}
                className="!w-3 !h-3 !bg-[var(--node-destination)] !border-2 !border-[var(--background)]"
            />

            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[var(--node-destination)]/20 flex items-center justify-center">
                    <Network size={20} className="text-[var(--node-destination)]" />
                </div>
                <div className="flex-1">
                    <InlineEdit
                        value={data.label || 'TCP Sender'}
                        onChange={(v) => handleChange('label', v)}
                        className="text-sm font-semibold text-[var(--foreground)]"
                        displayClassName="hover:text-[var(--primary)] cursor-text"
                        inputClassName="bg-transparent border-b border-[var(--primary)] outline-none w-full"
                    />
                    <div className="text-xs text-[var(--foreground-muted)]">TCP Destination</div>
                </div>
            </div>

            <div className="mt-3 p-2 rounded-lg bg-[var(--background)]/50 border border-[var(--glass-border)]">
                <div className="flex items-center gap-2">
                    <div className="flex-1 relative group">
                        <Handle
                            type="target"
                            position={Position.Left}
                            id="config-host"
                            className="!w-2 !h-2 !bg-[var(--warning)] !border-none opacity-0 group-hover:opacity-100 transition-opacity"
                            style={{ left: '-6px', top: '50%', transform: 'translateY(-50%)' }}
                        />
                        <div className="text-xs text-[var(--foreground-muted)] mb-1">Host</div>
                        <InlineEdit
                            value={data.host || '127.0.0.1'}
                            onChange={(v) => handleChange('host', v)}
                            className="text-sm font-mono text-[var(--foreground)]"
                            displayClassName="hover:bg-[var(--background)] px-1 rounded cursor-text"
                            inputClassName="bg-[var(--background)] border border-[var(--glass-border)] rounded px-2 py-0.5 w-full outline-none"
                        />
                    </div>
                    <div className="w-20 relative group">
                        <Handle
                            type="target"
                            position={Position.Left}
                            id="config-port"
                            className="!w-2 !h-2 !bg-[var(--warning)] !border-none opacity-0 group-hover:opacity-100 transition-opacity"
                            style={{ left: '-6px', top: '50%', transform: 'translateY(-50%)' }}
                        />
                        <div className="text-xs text-[var(--foreground-muted)] mb-1">Port</div>
                        <InlineEdit
                            value={data.port || 9000}
                            onChange={(v) => handleChange('port', v)}
                            type="number"
                            className="text-sm font-mono font-semibold text-[var(--node-destination)]"
                            displayClassName="hover:bg-[var(--background)] px-1 rounded cursor-text"
                            inputClassName="bg-[var(--background)] border border-[var(--node-destination)] rounded px-2 py-0.5 w-full outline-none"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default memo(TCPSenderNode);

