import React, { memo, useState, useCallback, useEffect, useMemo } from 'react';
import { Handle, Position, useNodeId } from 'reactflow';
import { PlayCircle, ChevronDown, ChevronRight, Send, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { testTcp } from '@/lib/api';
import axios from 'axios';
import { useFlowStore } from '@/stores/useFlowStore';
import BaseNode from './BaseNode';
import { useConfigEdge } from '@/hooks/useConfigEdge';
import InlineEdit from '../InlineEdit';

const PAYLOAD_PRESETS: Record<string, string> = {
    hl7: `MSH|^~\\&|LISS|OMNI|RAPP|MCM|202305041005||ORM^O01|202305041005|P|2.3
PID|||123456||MOUSE^MICKEY^||19281118|M|||123 MAIN ST^^LAKE BUENA VISTA^FL^32830||(407)939-2273
ORC|NW|123456|||E||||202305041005
OBR|1|123456||CBC|R||202305041005|||||||||||||||||||F`,
    json: `{\n  "id": "12345",\n  "type": "order",\n  "patient": {\n    "name": "Mickey Mouse",\n    "id": "123456"\n  },\n  "tests": ["CBC", "BMP"]\n}`,
    xml: `<order>\n  <id>12345</id>\n  <patient>\n    <name>Mickey Mouse</name>\n    <id>123456</id>\n  </patient>\n</order>`,
    csv: `id,name,test\n123456,Mickey Mouse,CBC`,
    soap: `<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope">\n  <soap:Header/>\n  <soap:Body>\n    <GetPatient>\n      <Id>123456</Id>\n    </GetPatient>\n  </soap:Body>\n</soap:Envelope>`,
    rest: `{\n  "method": "POST",\n  "headers": {\n    "Content-Type": "application/json"\n  },\n  "body": {\n    "foo": "bar"\n  }\n}`
};

interface TestNodeData {
    label: string;
    sendMode: 'inject' | 'http' | 'tcp';
    tcpHost: string;
    tcpPort: string;
    tcpTimeout: string;
    payloadType: string;
    payload: string;
    [key: string]: any;
}

/**
 * TestNode - Complex node for testing workflows
 * Refactored to use BaseNode and unified state management
 */
const TestNode = ({ data }: { data: TestNodeData }) => {
    const nodeId = useNodeId();
    const updateNodeData = useFlowStore((state) => state.updateNodeData);
    const testChannel = useFlowStore((state) => state.testChannel);

    // Local UI state
    const [expanded, setExpanded] = useState(false);
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [response, setResponse] = useState<string | null>(null);
    const [httpUrl, setHttpUrl] = useState('http://localhost:8080/api/messages');
    const [httpMethod, setHttpMethod] = useState('POST');

    // Derived state from data (with defaults)
    const sendMode = data.sendMode || 'inject';
    const payloadType = data.payloadType || 'hl7';
    const payload = data.payload || PAYLOAD_PRESETS.hl7;
    const tcpHost = data.tcpHost || 'localhost';
    const tcpPort = data.tcpPort || '6500';
    const tcpTimeout = data.tcpTimeout || '30';

    const handleChange = useCallback((field: string, value: any) => {
        if (nodeId) {
            updateNodeData(nodeId, field, value);
        }
    }, [nodeId, updateNodeData]);

    // Use hook to sync dynamic URL
    const handleUrlChange = useCallback((field: string, val: any) => {
        if (val !== httpUrl) setHttpUrl(val);
    }, [httpUrl]);

    // We can't strictly use useConfigEdge for complex URL parsing logic logic 1:1 without modifying the hook
    // but we can try to simplify. The original logic handled ipNode, portNode, textNode distinctions.
    // Ideally we'd move that logic to a helper or just keep it here but using the stable edges selector.
    // For now, let's keep the URL logic locally but optimized.

    const edges = useFlowStore((state) => state.edges);
    const nodes = useFlowStore((state) => state.nodes);

    const urlEdge = useMemo(() =>
        nodeId ? edges.find(e => e.target === nodeId && e.targetHandle === 'config-url') : undefined,
        [edges, nodeId]);

    useEffect(() => {
        if (!urlEdge) return;
        const sourceNode = nodes.find(n => n.id === urlEdge.source);
        if (!sourceNode) return;

        let newUrl = httpUrl;
        try {
            let currentStr = httpUrl.startsWith('http') ? httpUrl : `http://${httpUrl}`;

            // Handle different node types logic
            if (sourceNode.type === 'ipNode' && sourceNode.data.ip) {
                const urlObj = new URL(currentStr);
                urlObj.hostname = sourceNode.data.ip;
                newUrl = urlObj.toString();
            } else if (sourceNode.type === 'portNode' && sourceNode.data.port) {
                const urlObj = new URL(currentStr);
                urlObj.port = sourceNode.data.port.toString();
                newUrl = urlObj.toString();
            } else {
                // Default to text value replacement
                const val = sourceNode.data.value ?? sourceNode.data.text;
                if (val) newUrl = val;
            }
        } catch (e) {
            const val = sourceNode.data.value ?? sourceNode.data.text;
            if (val) newUrl = val;
        }

        if (newUrl !== httpUrl) {
            setHttpUrl(newUrl);
        }
    }, [urlEdge, nodes, httpUrl]);


    const handleTypeChange = (value: string) => {
        handleChange('payloadType', value);
        // Only update payload if it matches the current preset for previous type (avoid overwriting user work)
        // Or just overwrite? The original logic overwrote it.
        handleChange('payload', PAYLOAD_PRESETS[value] || '');
    };

    const handleSend = async (e: React.MouseEvent) => {
        e.stopPropagation();
        setLoading(true);
        setStatus('idle');
        setResponse(null);

        try {
            if (sendMode === 'inject') {
                if (nodeId) {
                    await testChannel(payloadType, payload);
                    setStatus('success');
                    setResponse("Message injected successfully");
                }
            } else if (sendMode === 'tcp') {
                const res = await testTcp(
                    tcpHost,
                    parseInt(tcpPort),
                    payload,
                    parseInt(tcpTimeout)
                );
                if (res.success) {
                    setStatus('success');
                    setResponse(`ACK Received:\n${res.response}\n\n(Raw: ${JSON.stringify(res.raw_response)})`);
                } else {
                    setStatus('error');
                    setResponse(`Error: ${res.error}\nMessage: ${res.message || ''}`);
                }
            } else {
                const res = await axios({
                    method: httpMethod,
                    url: httpUrl,
                    data: payload,
                    validateStatus: () => true
                });
                setStatus(res.status >= 200 && res.status < 300 ? 'success' : 'error');
                setResponse(`Status: ${res.status}\n${typeof res.data === 'object' ? JSON.stringify(res.data, null, 2) : res.data}`);
            }
        } catch (err: any) {
            setStatus('error');
            setResponse(err.message || 'Failed to send');
        } finally {
            setLoading(false);
        }
    };

    return (
        <BaseNode
            category="utility" // Or custom 'test' category? Standard base uses basic categories.
            // But we can override color.
            status={loading ? 'loading' : status}
            icon={<PlayCircle size={20} />}
            label={data.label || 'Test Node'}
            subtitle={sendMode === 'inject' ? 'Internal Injection' : sendMode === 'tcp' ? 'TCP Sender' : 'HTTP Request'}
            className={`w-[300px] transition-all duration-300 ${expanded ? 'z-50' : 'z-0'}`}
            style={{ '--node-category-color': 'var(--primary)' } as React.CSSProperties}
        >
            <div className="space-y-3">
                {/* Expand Toggle Header inside Content since BaseNode handles main header */}
                <button
                    onClick={() => setExpanded(!expanded)}
                    className="w-full flex items-center justify-between text-xs text-[var(--foreground-muted)] hover:bg-[var(--glass-bg)] p-1 rounded"
                >
                    <span>{expanded ? 'Hide Configuration' : 'Show Configuration'}</span>
                    {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>

                {expanded && (
                    <div className="space-y-3 animate-in slide-in-from-top-2 fade-in duration-200">
                        {/* Send Mode Toggle */}
                        <div className="flex bg-[var(--background)] p-1 rounded border border-[var(--glass-border)]">
                            {['inject', 'http', 'tcp'].map((mode) => (
                                <button
                                    key={mode}
                                    onClick={() => handleChange('sendMode', mode)}
                                    className={`flex-1 text-[10px] py-1 rounded transition-colors uppercase font-medium ${sendMode === mode ? 'bg-[var(--primary)]/20 text-[var(--primary)]' : 'text-[var(--foreground-muted)]'}`}
                                >
                                    {mode === 'inject' ? 'Internal' : mode === 'http' ? 'Internet' : 'HL7 TCP'}
                                </button>
                            ))}
                        </div>

                        {/* Config Logic */}
                        {sendMode === 'tcp' && (
                            <div className="flex gap-2 animate-in fade-in">
                                <input
                                    type="text"
                                    value={tcpHost}
                                    onChange={(e) => handleChange('tcpHost', e.target.value)}
                                    className="flex-1 bg-[var(--background)] border border-[var(--glass-border)] rounded px-2 py-1 text-xs outline-none focus:border-[var(--primary)]"
                                    placeholder="Host"
                                    title="TCP Host"
                                />
                                <input
                                    type="number"
                                    value={tcpPort}
                                    onChange={(e) => handleChange('tcpPort', e.target.value)}
                                    className="w-16 bg-[var(--background)] border border-[var(--glass-border)] rounded px-2 py-1 text-xs outline-none focus:border-[var(--primary)]"
                                    placeholder="Port"
                                    title="TCP Port"
                                />
                                <input
                                    type="number"
                                    value={tcpTimeout}
                                    onChange={(e) => handleChange('tcpTimeout', e.target.value)}
                                    className="w-10 bg-[var(--background)] border border-[var(--glass-border)] rounded px-2 py-1 text-xs outline-none focus:border-[var(--primary)]"
                                    placeholder="30"
                                    title="Timeout (s)"
                                />
                            </div>
                        )}

                        {sendMode === 'http' && (
                            <div className="flex gap-2 relative group animate-in fade-in">
                                <Handle
                                    type="target"
                                    position={Position.Left}
                                    id="config-url"
                                    className="!w-2.5 !h-2.5 !bg-[var(--warning)] !border-2 !border-[var(--background)] hover:scale-125 transition-transform"
                                    style={{ left: '-12px', top: '50%', transform: 'translateY(-50%)' }}
                                    title="Connect IP/Port/Text node to configure URL"
                                />
                                <select
                                    value={httpMethod}
                                    onChange={(e) => setHttpMethod(e.target.value)}
                                    className="w-20 bg-[var(--background)] border border-[var(--glass-border)] rounded px-2 py-1 text-xs outline-none focus:border-[var(--primary)]"
                                >
                                    <option>POST</option>
                                    <option>PUT</option>
                                    <option>GET</option>
                                </select>
                                <input
                                    type="text"
                                    value={httpUrl}
                                    onChange={(e) => setHttpUrl(e.target.value)}
                                    className="flex-1 bg-[var(--background)] border border-[var(--glass-border)] rounded px-2 py-1 text-xs outline-none focus:border-[var(--primary)]"
                                    placeholder="http://url"
                                />
                            </div>
                        )}

                        {/* Payload Config */}
                        <div className="space-y-1">
                            <div className="flex justify-between">
                                <label className="text-[10px] uppercase font-bold text-[var(--foreground-muted)]">Payload</label>
                                <select
                                    value={payloadType}
                                    onChange={(e) => handleTypeChange(e.target.value)}
                                    className="bg-transparent text-[10px] text-[var(--primary)] outline-none cursor-pointer text-right"
                                >
                                    {Object.keys(PAYLOAD_PRESETS).map(k => (
                                        <option key={k} value={k}>{k.toUpperCase()}</option>
                                    ))}
                                </select>
                            </div>
                            <textarea
                                value={payload}
                                onChange={(e) => handleChange('payload', e.target.value)}
                                className="w-full h-32 bg-[var(--background)] border border-[var(--glass-border)] rounded-lg p-2 text-[10px] font-mono text-[var(--foreground)] outline-none focus:border-[var(--primary)] resize-y whitespace-pre"
                                spellCheck={false}
                            />
                        </div>

                        {/* Action Buttons */}
                        <div className="flex justify-between items-center pt-2">
                            <span className="text-[10px] text-[var(--foreground-muted)]">
                                {payload.length} chars
                            </span>
                            <Button
                                onClick={handleSend}
                                disabled={loading}
                                size="sm"
                                className="h-7 text-xs bg-[var(--primary)] hover:bg-[var(--primary-hover)] gap-2"
                            >
                                {loading ? 'Sending...' : <><Send size={12} /> Send Request</>}
                            </Button>
                        </div>
                    </div>
                )}

                {/* Response Area - Always visible if there is a response */}
                {!expanded && response && (
                    <div className="pt-2 border-t border-[var(--glass-border)]">
                        <div className="text-[10px] text-[var(--foreground-muted)] mb-1">Last Response:</div>
                        <div className={`text-[10px] p-2 rounded font-mono truncate cursor-pointer hover:bg-[var(--glass-bg)] ${status === 'success' ? 'text-green-500' : 'text-red-500'
                            }`} onClick={() => setExpanded(true)} title="Click to expand">
                            {response.substring(0, 50)}...
                        </div>
                    </div>
                )}

                {expanded && response && (
                    <div className={`mt-2 text-[10px] p-2 rounded font-mono break-all whitespace-pre-wrap max-h-32 overflow-y-auto border animate-in fade-in
                        ${status === 'success'
                            ? 'bg-green-500/10 text-green-500 border-green-500/20'
                            : 'bg-red-500/10 text-red-500 border-red-500/20'
                        }`}>
                        {response}
                    </div>
                )}
            </div>
        </BaseNode>
    );
};

export default memo(TestNode);
