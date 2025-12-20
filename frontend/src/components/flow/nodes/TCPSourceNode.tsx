import React, { memo, useState, useCallback, useEffect, useMemo } from 'react';
import { Handle, Position, NodeProps, useNodeId } from 'reactflow';
import { Network, Lock, ChevronDown, ChevronRight } from 'lucide-react';
import { useFlowStore } from '@/stores/useFlowStore';
import InlineEdit from '../InlineEdit';
import BaseNode from './BaseNode';

interface TCPSourceData {
    label: string;
    port: number;
    cert_path?: string;
    key_path?: string;
}

/**
 * TCPSourceNode - TCP Listener source node
 * Refactored to access store directly (no callback injection)
 */
const TCPSourceNode = ({ data }: NodeProps<TCPSourceData>) => {
    const nodeId = useNodeId();
    const updateNodeData = useFlowStore((state) => state.updateNodeData);

    // Stable selector pattern
    const edges = useFlowStore((state) => state.edges);
    const configEdges = useMemo(() =>
        edges.filter(e => e.target === nodeId && e.targetHandle?.startsWith('config-')),
        [edges, nodeId]);
    const nodes = useFlowStore((state) => state.nodes);

    const [showTls, setShowTls] = useState(false);

    const handleChange = useCallback((field: string, value: string | number) => {
        if (nodeId) {
            updateNodeData(nodeId, field, value);
        }
    }, [nodeId, updateNodeData]);

    const isTlsEnabled = !!(data.cert_path && data.key_path);

    // Sync from connected config nodes
    useEffect(() => {
        const portEdge = configEdges.find(e => e.targetHandle === 'config-port');
        if (portEdge) {
            const sourceNode = nodes.find(n => n.id === portEdge.source);
            if (sourceNode) {
                // Try to get value from various common data fields
                // Prioritize 'value' (often used for templates/resolved vars) -> 'port' -> 'text'
                const rawVal = sourceNode.data.value ?? sourceNode.data.port ?? sourceNode.data.text;
                const portNum = typeof rawVal === 'string' ? parseInt(rawVal, 10) : Number(rawVal);

                if (!isNaN(portNum) && portNum > 0 && portNum !== data.port) {
                    handleChange('port', portNum);
                }
            }
        }
    }, [configEdges, nodes, nodeId, data.port, handleChange]);

    // Icon with status indicator for TLS
    const IconComponent = (
        <div className="relative flex items-center justify-center w-full h-full">
            <Network size={20} />
            {isTlsEnabled && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full flex items-center justify-center border border-[var(--glass-bg)]" title="TLS Enabled">
                    <Lock size={8} className="text-white" />
                </div>
            )}
        </div>
    );

    return (
        <BaseNode
            category="source"
            icon={IconComponent}
            label={data.label || 'TCP Listener'}
            subtitle={isTlsEnabled ? 'TLS/TCP Source' : 'TCP Source'}
            className="w-[280px]"
            showTargetHandle={false}  // We use custom config handle instead
            style={{ '--node-category-color': 'var(--node-source-tcp, var(--node-source))' } as React.CSSProperties}
        >
            <div className="space-y-2">
                <div className="p-2 rounded-lg bg-[var(--background)]/50 border border-[var(--glass-border)] relative group">
                    {/* Config Handle - Larger and more visible with pulsing */}
                    <Handle
                        type="target"
                        position={Position.Left}
                        id="config-port"
                        className="config-handle !w-3.5 !h-3.5 !bg-[var(--warning)] !border-2 !border-[var(--background)]"
                        style={{ left: '-8px', top: '50%', transform: 'translateY(-50%)' }}
                    />
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                            <div
                                className="w-2 h-2 rounded-full bg-[var(--warning)]/60 group-hover:bg-[var(--warning)] transition-colors"
                                title="Connect PortNode or TextNode"
                            />
                            <span className="text-xs text-[var(--foreground-muted)] font-medium">Port</span>
                        </div>
                        <InlineEdit
                            value={data.port || 9090}
                            onChange={(v) => handleChange('port', v)}
                            type="number"
                            className="text-sm font-mono font-semibold text-[color:var(--node-category-color)]"
                            displayClassName="hover:bg-[var(--background)] px-2 py-0.5 rounded cursor-text"
                            inputClassName="bg-[var(--background)] border border-[color:var(--node-category-color)] rounded px-2 py-0.5 w-20 text-right outline-none"
                        />
                    </div>
                </div>

                {/* TLS Configuration Section */}
                <div className="rounded-lg bg-[var(--background)]/50 border border-[var(--glass-border)] overflow-hidden">
                    <button
                        onClick={() => setShowTls(!showTls)}
                        className="w-full p-2 flex items-center justify-between text-xs text-[var(--foreground-muted)] hover:bg-[var(--glass-bg)] transition-colors"
                    >
                        <span className="flex items-center gap-1.5 font-medium">
                            <Lock size={12} className={isTlsEnabled ? 'text-green-500' : ''} />
                            TLS Configuration
                        </span>
                        {showTls ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </button>

                    {showTls && (
                        <div className="p-2 border-t border-[var(--glass-border)] space-y-2 animate-in slide-in-from-top-1">
                            <div className="flex flex-col gap-1">
                                <span className="text-[10px] text-[var(--foreground-muted)] uppercase tracking-wider">Cert Path</span>
                                <input
                                    type="text"
                                    value={data.cert_path || ''}
                                    onChange={(e) => handleChange('cert_path', e.target.value)}
                                    placeholder="/path/to/cert.pem"
                                    className="text-xs font-mono bg-[var(--background)] border border-[var(--glass-border)] rounded px-2 py-1 w-full outline-none focus:border-[var(--primary)] transition-colors placeholder:text-[var(--foreground-muted)]/50"
                                />
                            </div>
                            <div className="flex flex-col gap-1">
                                <span className="text-[10px] text-[var(--foreground-muted)] uppercase tracking-wider">Key Path</span>
                                <input
                                    type="text"
                                    value={data.key_path || ''}
                                    onChange={(e) => handleChange('key_path', e.target.value)}
                                    placeholder="/path/to/key.pem"
                                    className="text-xs font-mono bg-[var(--background)] border border-[var(--glass-border)] rounded px-2 py-1 w-full outline-none focus:border-[var(--primary)] transition-colors placeholder:text-[var(--foreground-muted)]/50"
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </BaseNode>
    );
};

export default memo(TCPSourceNode);
