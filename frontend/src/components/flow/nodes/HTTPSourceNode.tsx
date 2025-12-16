import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Radio } from 'lucide-react';
import InlineEdit from '../InlineEdit';

interface HTTPSourceData {
    label: string;
    port: number;
    path?: string;
    onDataChange?: (field: string, value: string | number) => void;
}

import { useEffect } from 'react';
import { useFlowStore } from '@/stores/useFlowStore';

const HTTPSourceNode = ({ data, id }: NodeProps<HTTPSourceData>) => {
    const nodes = useFlowStore((state) => state.nodes);
    const edges = useFlowStore((state) => state.edges);

    const handleChange = (field: string, value: string | number) => {
        data.onDataChange?.(field, value);
    };

    useEffect(() => {
        // Sync Port
        const configEdge = edges.find(e => e.target === id && e.targetHandle === 'config-port');
        if (configEdge) {
            const sourceNode = nodes.find(n => n.id === configEdge.source);
            if (sourceNode && sourceNode.type === 'portNode' && sourceNode.data.port !== undefined) {
                if (sourceNode.data.port != data.port) {
                    handleChange('port', sourceNode.data.port);
                }
            }
        }

        // Sync Path
        const pathEdge = edges.find(e => e.target === id && e.targetHandle === 'config-path');
        if (pathEdge) {
            const sourceNode = nodes.find(n => n.id === pathEdge.source);
            if (sourceNode && sourceNode.type === 'textNode') {
                // Prefer resolved value (data.value) if available (for templates), else use raw text
                const val = sourceNode.data.value ?? sourceNode.data.text;
                if (val && val !== data.path) {
                    handleChange('path', val);
                }
            }
        }
    }, [nodes, edges, id, data.port, data.path]);

    return (
        <div className="flow-node source px-4 py-3 w-[240px]">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[var(--node-source)]/20 flex items-center justify-center">
                    <Radio size={20} className="text-[var(--node-source)]" />
                </div>
                <div className="flex-1">
                    <InlineEdit
                        value={data.label || 'HTTP Listener'}
                        onChange={(v) => handleChange('label', v)}
                        className="text-sm font-semibold text-[var(--foreground)]"
                        displayClassName="hover:text-[var(--primary)] cursor-text"
                        inputClassName="bg-transparent border-b border-[var(--primary)] outline-none w-full"
                    />
                    <div className="text-xs text-[var(--foreground-muted)]">HTTP Source</div>
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
