import React, { memo, useCallback, useEffect } from 'react';
import { Handle, Position, NodeProps, useNodeId } from 'reactflow';
import { Globe } from 'lucide-react';
import { useFlowStore } from '@/stores/useFlowStore';
import InlineEdit from '../InlineEdit';

interface HTTPSenderData {
    label: string;
    url: string;
    method: string;
}

const methodOptions = [
    { value: 'GET', label: 'GET' },
    { value: 'POST', label: 'POST' },
    { value: 'PUT', label: 'PUT' },
    { value: 'PATCH', label: 'PATCH' },
    { value: 'DELETE', label: 'DELETE' },
];

/**
 * HTTPSenderNode - HTTP destination node
 * Refactored to access store directly (no callback injection)
 */
const HTTPSenderNode = ({ data }: NodeProps<HTTPSenderData>) => {
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

    // Sync URL from connected nodes
    useEffect(() => {
        const urlEdge = configEdges.find(e => e.targetHandle === 'config-url');
        if (urlEdge) {
            const sourceNode = nodes.find(n => n.id === urlEdge.source);
            if (sourceNode) {
                let newUrl = data.url || '';
                try {
                    let currentStr = newUrl.startsWith('http') ? newUrl : `http://${newUrl}`;
                    if (!newUrl || newUrl === 'https://api.example.com') currentStr = 'http://localhost';

                    const urlObj = new URL(currentStr);

                    if (sourceNode.type === 'ipNode' && sourceNode.data.ip) {
                        urlObj.hostname = sourceNode.data.ip;
                        newUrl = urlObj.toString();
                    } else if (sourceNode.type === 'portNode' && sourceNode.data.port) {
                        urlObj.port = sourceNode.data.port.toString();
                        newUrl = urlObj.toString();
                    } else if (sourceNode.type === 'textNode' && sourceNode.data.text) {
                        newUrl = sourceNode.data.text;
                    }
                } catch (e) {
                    if (sourceNode.type === 'textNode') {
                        newUrl = sourceNode.data.text;
                    }
                }

                if (newUrl !== data.url) {
                    handleChange('url', newUrl);
                }
            }
        }
    }, [configEdges, nodes, nodeId, data.url, handleChange]);

    const getMethodColor = (method: string) => {
        switch (method) {
            case 'GET': return 'text-[var(--success)]';
            case 'POST': return 'text-[var(--primary)]';
            case 'PUT': return 'text-[var(--warning)]';
            case 'PATCH': return 'text-[var(--secondary)]';
            case 'DELETE': return 'text-[var(--error)]';
            default: return 'text-[var(--foreground)]';
        }
    };

    return (
        <div className="flow-node destination-http px-4 py-3 w-[280px]">
            <Handle
                type="target"
                position={Position.Left}
                className="!w-3 !h-3 !bg-[var(--node-destination-http)] !border-2 !border-[var(--background)]"
            />

            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[var(--node-destination-http)]/20 flex items-center justify-center">
                    <Globe size={20} className="text-[var(--node-destination-http)]" />
                </div>
                <div className="flex-1">
                    <InlineEdit
                        value={data.label || 'HTTP Sender'}
                        onChange={(v) => handleChange('label', v)}
                        className="text-sm font-semibold text-[var(--foreground)]"
                        displayClassName="hover:text-[var(--primary)] cursor-text"
                        inputClassName="bg-transparent border-b border-[var(--primary)] outline-none w-full"
                    />
                    <div className="text-xs text-[var(--foreground-muted)]">HTTP Destination</div>
                </div>
            </div>

            <div className="mt-3 space-y-2">
                <div className="p-2 rounded-lg bg-[var(--background)]/50 border border-[var(--glass-border)]">
                    <div className="flex items-center gap-2">
                        <InlineEdit
                            value={data.method || 'POST'}
                            onChange={(v) => handleChange('method', v)}
                            type="select"
                            options={methodOptions}
                            className={`text-sm font-bold ${getMethodColor(data.method || 'POST')}`}
                            displayClassName="hover:bg-[var(--background)] px-2 py-0.5 rounded cursor-pointer"
                            inputClassName="bg-[var(--background)] border border-[var(--glass-border)] rounded px-1 py-0.5 outline-none font-bold"
                        />
                        <div className="flex-1 relative group">
                            <Handle
                                type="target"
                                position={Position.Left}
                                id="config-url"
                                className="!w-2 !h-2 !bg-[var(--warning)] !border-none opacity-0 group-hover:opacity-100 transition-opacity"
                                style={{ left: '-6px', top: '50%', transform: 'translateY(-50%)' }}
                            />
                            <InlineEdit
                                value={data.url || 'https://api.example.com'}
                                onChange={(v) => handleChange('url', v)}
                                placeholder="https://..."
                                className="flex-1 text-sm font-mono text-[var(--foreground)]"
                                displayClassName="hover:bg-[var(--background)] px-1 rounded cursor-text truncate"
                                inputClassName="bg-[var(--background)] border border-[var(--glass-border)] rounded px-2 py-0.5 w-full outline-none"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default memo(HTTPSenderNode);

