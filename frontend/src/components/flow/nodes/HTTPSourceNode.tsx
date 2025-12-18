import React, { memo, useState, useCallback, useEffect, useMemo } from 'react';
import { Handle, Position, NodeProps, useNodeId } from 'reactflow';
import { Radio, Lock, ChevronDown, ChevronRight } from 'lucide-react';
import { useFlowStore } from '@/stores/useFlowStore';
import InlineEdit from '../InlineEdit';

interface HTTPSourceData {
    label: string;
    port: number;
    path?: string;
    cert_path?: string;
    key_path?: string;
}

/**
 * HTTPSourceNode - HTTP Listener source node
 * Refactored to access store directly (no callback injection)
 */
const HTTPSourceNode = ({ data }: NodeProps<HTTPSourceData>) => {
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
        // Sync Port
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

        // Sync Path
        const pathEdge = configEdges.find(e => e.targetHandle === 'config-path');
        if (pathEdge) {
            const sourceNode = nodes.find(n => n.id === pathEdge.source);
            if (sourceNode?.type === 'textNode') {
                const val = sourceNode.data.value ?? sourceNode.data.text;
                if (val && val !== data.path) {
                    handleChange('path', val);
                }
            }
        }
    }, [configEdges, nodes, nodeId, data.port, data.path, handleChange]);

    return (
        <div className="flow-node source px-4 py-3 w-[260px]">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[var(--node-source)]/20 flex items-center justify-center relative">
                    <Radio size={20} className="text-[var(--node-source)]" />
                    {isTlsEnabled && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                            <Lock size={10} className="text-white" />
                        </div>
                    )}
                </div>
                <div className="flex-1">
                    <InlineEdit
                        value={data.label || 'HTTP Listener'}
                        onChange={(v) => handleChange('label', v)}
                        className="text-sm font-semibold text-[var(--foreground)]"
                        displayClassName="hover:text-[var(--primary)] cursor-text"
                        inputClassName="bg-transparent border-b border-[var(--primary)] outline-none w-full"
                    />
                    <div className="text-xs text-[var(--foreground-muted)]">
                        {isTlsEnabled ? 'HTTPS Source' : 'HTTP Source'}
                    </div>
                </div>
            </div>

            <div className="mt-3 space-y-2">
                <div className="p-2 rounded-lg bg-[var(--background)]/50 border border-[var(--glass-border)] relative group">
                    <Handle
                        type="target"
                        position={Position.Left}
                        id="config-port"
                        className="!w-2 !h-2 !bg-[var(--warning)] !border-none opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ left: '-6px', top: '50%', transform: 'translateY(-50%)' }}
                    />
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-[var(--foreground-muted)]">Port</span>
                        <InlineEdit
                            value={data.port || 8080}
                            onChange={(v) => handleChange('port', v)}
                            type="number"
                            className="text-sm font-mono font-semibold text-[var(--node-source)]"
                            displayClassName="hover:bg-[var(--background)] px-2 py-0.5 rounded cursor-text"
                            inputClassName="bg-[var(--background)] border border-[var(--node-source)] rounded px-2 py-0.5 w-20 text-right outline-none"
                        />
                    </div>
                </div>

                <div className="p-2 rounded-lg bg-[var(--background)]/50 border border-[var(--glass-border)]">
                    <div className="flex items-center justify-between relative group">
                        <Handle
                            type="target"
                            position={Position.Left}
                            id="config-path"
                            className="!w-2 !h-2 !bg-[var(--warning)] !border-none opacity-0 group-hover:opacity-100 transition-opacity"
                            style={{ left: '-14px', top: '50%', transform: 'translateY(-50%)' }}
                        />
                        <span className="text-xs text-[var(--foreground-muted)]">Path</span>
                        <InlineEdit
                            value={data.path || '/'}
                            onChange={(v) => handleChange('path', v)}
                            placeholder="/api/endpoint"
                            className="text-sm font-mono text-[var(--foreground)]"
                            displayClassName="hover:bg-[var(--background)] px-2 py-0.5 rounded cursor-text"
                            inputClassName="bg-[var(--background)] border border-[var(--glass-border)] rounded px-2 py-0.5 w-32 outline-none"
                        />
                    </div>
                </div>

                {/* TLS Configuration Section */}
                <div className="rounded-lg bg-[var(--background)]/50 border border-[var(--glass-border)] overflow-hidden">
                    <button
                        onClick={() => setShowTls(!showTls)}
                        className="w-full p-2 flex items-center justify-between text-xs text-[var(--foreground-muted)] hover:bg-[var(--glass-bg)] transition-colors"
                    >
                        <span className="flex items-center gap-1">
                            <Lock size={12} className={isTlsEnabled ? 'text-green-500' : ''} />
                            TLS Configuration
                        </span>
                        {showTls ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </button>

                    {showTls && (
                        <div className="p-2 border-t border-[var(--glass-border)] space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-[var(--foreground-muted)]">Cert Path</span>
                                <input
                                    type="text"
                                    value={data.cert_path || ''}
                                    onChange={(e) => handleChange('cert_path', e.target.value)}
                                    placeholder="/path/to/cert.pem"
                                    className="text-xs font-mono bg-[var(--background)] border border-[var(--glass-border)] rounded px-2 py-1 w-32 outline-none focus:border-[var(--primary)]"
                                />
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-[var(--foreground-muted)]">Key Path</span>
                                <input
                                    type="text"
                                    value={data.key_path || ''}
                                    onChange={(e) => handleChange('key_path', e.target.value)}
                                    placeholder="/path/to/key.pem"
                                    className="text-xs font-mono bg-[var(--background)] border border-[var(--glass-border)] rounded px-2 py-1 w-32 outline-none focus:border-[var(--primary)]"
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <Handle
                type="source"
                position={Position.Right}
                className="!w-3 !h-3 !bg-[var(--node-source)] !border-2 !border-[var(--background)]"
            />
        </div>
    );
};

export default memo(HTTPSourceNode);

