import React, { memo, useState } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Network, Lock, ChevronDown, ChevronRight } from 'lucide-react';
import InlineEdit from '../InlineEdit';

interface TCPSourceData {
    label: string;
    port: number;
    cert_path?: string;
    key_path?: string;
    onDataChange?: (field: string, value: string | number) => void;
}

import { useEffect } from 'react';
import { useFlowStore } from '@/stores/useFlowStore';

const TCPSourceNode = ({ data, id }: NodeProps<TCPSourceData>) => {
    const nodes = useFlowStore((state) => state.nodes);
    const edges = useFlowStore((state) => state.edges);
    const [showTls, setShowTls] = useState(false);

    const handleChange = (field: string, value: string | number) => {
        data.onDataChange?.(field, value);
    };

    const isTlsEnabled = !!(data.cert_path && data.key_path);

    useEffect(() => {
        const configEdge = edges.find(e => e.target === id && e.targetHandle === 'config-port');
        if (configEdge) {
            const sourceNode = nodes.find(n => n.id === configEdge.source);
            if (sourceNode && sourceNode.type === 'portNode' && sourceNode.data.port !== undefined) {
                if (sourceNode.data.port != data.port) {
                    handleChange('port', sourceNode.data.port);
                }
            }
        }
    }, [nodes, edges, id, data.port]);

    return (
        <div className="flow-node source-tcp px-4 py-3 w-[260px]">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[var(--node-source-tcp)]/20 flex items-center justify-center relative">
                    <Network size={20} className="text-[var(--node-source-tcp)]" />
                    {isTlsEnabled && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                            <Lock size={10} className="text-white" />
                        </div>
                    )}
                </div>
                <div className="flex-1">
                    <InlineEdit
                        value={data.label || 'TCP Listener'}
                        onChange={(v) => handleChange('label', v)}
                        className="text-sm font-semibold text-[var(--foreground)]"
                        displayClassName="hover:text-[var(--primary)] cursor-text"
                        inputClassName="bg-transparent border-b border-[var(--primary)] outline-none w-full"
                    />
                    <div className="text-xs text-[var(--foreground-muted)]">
                        {isTlsEnabled ? 'TLS/TCP Source' : 'TCP Source'}
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
                            value={data.port || 9090}
                            onChange={(v) => handleChange('port', v)}
                            type="number"
                            className="text-sm font-mono font-semibold text-[var(--node-source-tcp)]"
                            displayClassName="hover:bg-[var(--background)] px-2 py-0.5 rounded cursor-text"
                            inputClassName="bg-[var(--background)] border border-[var(--node-source-tcp)] rounded px-2 py-0.5 w-20 text-right outline-none"
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
                className="!w-3 !h-3 !bg-[var(--node-source-tcp)] !border-2 !border-[var(--background)]"
            />
        </div>
    );
};

export default memo(TCPSourceNode);

