import React, { memo, useState, useCallback, useEffect } from 'react';
import { Handle, Position } from 'reactflow';
import { PlayCircle, ChevronDown, ChevronRight, Save, Send, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import axios from 'axios';

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

import { useFlowStore } from '@/stores/useFlowStore';

const TestNode = ({ data, id }: { data: any, id: string }) => {
    const [expanded, setExpanded] = useState(false);
    const [sendMode, setSendMode] = useState<'inject' | 'http' | 'tcp'>(data.sendMode || 'inject');
    const [tcpHost, setTcpHost] = useState(data.tcpHost || 'localhost');
    const [tcpPort, setTcpPort] = useState(data.tcpPort || '6500');
    const [tcpTimeout, setTcpTimeout] = useState(data.tcpTimeout || '30');
    const [httpMethod, setHttpMethod] = useState('POST');
    const [httpUrl, setHttpUrl] = useState('http://localhost:8080/api/messages');

    const nodes = useFlowStore((state) => state.nodes);
    const edges = useFlowStore((state) => state.edges);

    useEffect(() => {
        const urlEdge = edges.find(e => e.target === id && e.targetHandle === 'config-url');
        if (!urlEdge) return;

        const sourceNode = nodes.find(n => n.id === urlEdge.source);
        if (!sourceNode) return;

        let newUrl = httpUrl;
        try {
            // Basic URL parsing/construction
            // If currently valid URL, try to update parts
            // If not, replace entirely if text
            let currentStr = httpUrl.startsWith('http') ? httpUrl : `http://${httpUrl}`;
            const urlObj = new URL(currentStr);

            if (sourceNode.type === 'ipNode' && sourceNode.data.ip) {
                urlObj.hostname = sourceNode.data.ip;
                newUrl = urlObj.toString();
            } else if (sourceNode.type === 'portNode' && sourceNode.data.port) {
                urlObj.port = sourceNode.data.port.toString();
                newUrl = urlObj.toString();
            } else if (sourceNode.type === 'textNode') {
                newUrl = sourceNode.data.value ?? sourceNode.data.text ?? '';
            }
        } catch (e) {
            // If parsing fails, just replace if it's text
            if (sourceNode.type === 'textNode') {
                newUrl = sourceNode.data.value ?? sourceNode.data.text ?? '';
            }
        }

        if (newUrl !== httpUrl) {
            setHttpUrl(newUrl);
        }
    }, [nodes, edges, id]); // Intentionally omitting httpUrl to avoid loops, relying on effect re-run on nodes/edges change

    const [payloadType, setPayloadType] = useState(data.payloadType || 'hl7');
    const [payload, setPayload] = useState(data.payload || PAYLOAD_PRESETS.hl7);
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [response, setResponse] = useState<string | null>(null);

    // Sync internal state with ReactFlow data
    useEffect(() => {
        data.onDataChange?.('payloadType', payloadType);
        data.onDataChange?.('payload', payload);
        data.onDataChange?.('sendMode', sendMode);
        data.onDataChange?.('tcpHost', tcpHost);
        data.onDataChange?.('tcpPort', tcpPort);
        data.onDataChange?.('tcpTimeout', tcpTimeout);
    }, [payloadType, payload, sendMode, tcpHost, tcpPort, tcpTimeout, data.onDataChange]);

    const handleTypeChange = (value: string) => {
        setPayloadType(value);
        // Only update payload if it matches one of the presets to avoid overwriting user changes?
        // Or just overwrite it for convenience? Let's overwrite but maybe warn?
        // For now, simple behavior: overwrite with preset.
        setPayload(PAYLOAD_PRESETS[value] || '');
    };

    const handleSend = async (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent node selection
        setLoading(true);
        setStatus('idle');
        setResponse(null);

        try {
            if (sendMode === 'inject') {
                // Internal Injection Mode
                if (data.onTest) {
                    await data.onTest(payloadType, payload);
                    setStatus('success');
                    setResponse("Message injected successfully");
                } else {
                    setStatus('error');
                    setResponse("No test handler connected");
                }
            } else if (sendMode === 'tcp') {
                // HL7 TCP Sender Mode
                const res = await axios.post('/api/test/tcp', {
                    host: tcpHost,
                    port: parseInt(tcpPort),
                    payload: payload,
                    timeout_seconds: parseInt(tcpTimeout)
                });

                if (res.data.success) {
                    setStatus('success');
                    setResponse(`ACK Received:\n${res.data.response}\n\n(Raw: ${JSON.stringify(res.data.raw_response)})`);
                } else {
                    setStatus('error');
                    setResponse(`Error: ${res.data.error}\nMessage: ${res.data.message || ''}`);
                }
            } else {
                // Real HTTP Request Mode
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
            console.error(err);
            setStatus('error');
            setResponse(err.message || 'Failed to send');
        } finally {
            setLoading(false);
        }
    };

    const handleToggleExpand = (e: React.MouseEvent) => {
        e.stopPropagation();
        setExpanded(!expanded);
    };

    return (
        <div className={`flow-node test-node w-[300px] transition-all duration-300 ${expanded ? 'z-50' : 'z-0'}`}>
            <div className="flex items-center justify-between px-4 py-3 cursor-pointer" onClick={handleToggleExpand}>
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[var(--primary)]/20 flex items-center justify-center">
                        <PlayCircle size={20} className="text-[var(--primary)]" />
                    </div>
                    <div>
                        <div className="text-sm font-semibold text-[var(--foreground)]">
                            {data.label || 'Test Node'}
                        </div>
                        <div className="text-xs text-[var(--foreground-muted)]">Manual Trigger</div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {status === 'success' && <CheckCircle size={14} className="text-[var(--success)]" />}
                    {status === 'error' && <AlertCircle size={14} className="text-[var(--error)]" />}
                    {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </div>
            </div>

            {expanded && (
                <div className="px-4 pb-4 animate-in slide-in-from-top-2 fade-in duration-200">
                    <div className="space-y-3 pt-2 border-t border-[var(--glass-border)]">

                        {/* Send Mode Toggle */}
                        <div className="flex bg-[var(--background)] p-1 rounded border border-[var(--glass-border)]">
                            <button
                                onClick={() => setSendMode('inject')}
                                className={`flex-1 text-[10px] py-1 rounded transition-colors ${sendMode === 'inject' ? 'bg-[var(--primary)]/20 text-[var(--primary)] font-bold' : 'text-[var(--foreground-muted)]'}`}
                            >
                                Internal
                            </button>
                            <button
                                onClick={() => setSendMode('http')}
                                className={`flex-1 text-[10px] py-1 rounded transition-colors ${sendMode === 'http' ? 'bg-[var(--primary)]/20 text-[var(--primary)] font-bold' : 'text-[var(--foreground-muted)]'}`}
                            >
                                Internet
                            </button>
                            <button
                                onClick={() => setSendMode('tcp')}
                                className={`flex-1 text-[10px] py-1 rounded transition-colors ${sendMode === 'tcp' ? 'bg-[var(--primary)]/20 text-[var(--primary)] font-bold' : 'text-[var(--foreground-muted)]'}`}
                            >
                                HL7 TCP
                            </button>
                        </div>

                        {/* TCP Config */}
                        {sendMode === 'tcp' && (
                            <div className="space-y-2 animate-in fade-in slide-in-from-top-1">
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={tcpHost}
                                        onChange={(e) => setTcpHost(e.target.value)}
                                        className="flex-1 bg-[var(--background)] border border-[var(--glass-border)] rounded px-2 py-1 text-xs text-[var(--foreground)] outline-none focus:border-[var(--primary)]"
                                        placeholder="Host (e.g. localhost)"
                                    />
                                    <input
                                        type="text"
                                        value={tcpPort}
                                        onChange={(e) => setTcpPort(e.target.value)}
                                        className="w-16 bg-[var(--background)] border border-[var(--glass-border)] rounded px-2 py-1 text-xs text-[var(--foreground)] outline-none focus:border-[var(--primary)]"
                                        placeholder="Port"
                                    />
                                    <input
                                        type="text"
                                        value={tcpTimeout}
                                        onChange={(e) => setTcpTimeout(e.target.value)}
                                        className="w-10 bg-[var(--background)] border border-[var(--glass-border)] rounded px-2 py-1 text-xs text-[var(--foreground)] outline-none focus:border-[var(--primary)]"
                                        placeholder="30s"
                                        title="Timeout (s)"
                                    />
                                </div>
                            </div>
                        )}

                        {/* HTTP Config (Only if HTTP mode) */}
                        {sendMode === 'http' && (
                            <div className="space-y-2 animate-in fade-in slide-in-from-top-1">
                                <div className="flex gap-2 relative group">
                                    <Handle
                                        type="target"
                                        position={Position.Left}
                                        id="config-url"
                                        className="!w-2 !h-2 !bg-[var(--warning)] !border-none opacity-0 group-hover:opacity-100 transition-opacity"
                                        style={{ left: '-20px', top: '50%', transform: 'translateY(-50%)' }}
                                    />
                                    <select
                                        value={httpMethod}
                                        onChange={(e) => setHttpMethod(e.target.value)}
                                        className="w-20 bg-[var(--background)] border border-[var(--glass-border)] rounded px-2 py-1 text-xs text-[var(--foreground)] outline-none focus:border-[var(--primary)]"
                                    >
                                        <option>POST</option>
                                        <option>PUT</option>
                                    </select>
                                    <input
                                        type="text"
                                        value={httpUrl}
                                        onChange={(e) => setHttpUrl(e.target.value)}
                                        className="flex-1 bg-[var(--background)] border border-[var(--glass-border)] rounded px-2 py-1 text-xs text-[var(--foreground)] outline-none focus:border-[var(--primary)]"
                                        placeholder="http://localhost:8080"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Type Selector */}
                        <div className="space-y-1">
                            <label className="text-[10px] uppercase font-bold text-[var(--foreground-muted)]">
                                Payload Format
                            </label>
                            <select
                                value={payloadType}
                                onChange={(e) => handleTypeChange(e.target.value)}
                                className="w-full bg-[var(--background)] border border-[var(--glass-border)] rounded px-2 py-1.5 text-xs text-[var(--foreground)] outline-none focus:border-[var(--primary)]"
                            >
                                <option value="hl7">HL7 v2</option>
                                <option value="json">JSON</option>
                                <option value="xml">XML</option>
                                <option value="csv">CSV</option>
                                <option value="soap">SOAP</option>
                                <option value="rest">REST</option>
                            </select>
                        </div>

                        {/* Payload Editor */}
                        <div className="space-y-1">
                            <label className="text-[10px] uppercase font-bold text-[var(--foreground-muted)]">
                                Payload Content
                            </label>
                            <textarea
                                value={payload}
                                onChange={(e) => setPayload(e.target.value)}
                                className="w-full h-32 bg-[var(--background)] border border-[var(--glass-border)] rounded-lg p-2 text-[10px] font-mono text-[var(--foreground)] outline-none focus:border-[var(--primary)] resize-y whitespace-pre"
                                spellCheck={false}
                            />
                        </div>

                        {/* Actions */}
                        <div className="flex justify-between items-center pt-2">
                            <span className="text-[10px] text-[var(--foreground-muted)]">
                                {payload.length} chars
                            </span>
                            <Button
                                onClick={handleSend}
                                disabled={loading}
                                size="sm"
                                className="h-7 text-xs bg-[var(--primary)] hover:bg-[var(--primary-hover)]"
                            >
                                {loading ? 'Sending...' : <><Send size={12} className="mr-2" /> Send Test</>}
                            </Button>
                        </div>

                        {/* Quick Response View */}
                        {response && (
                            <div className={`mt-2 text-[10px] p-2 rounded font-mono break-all whitespace-pre-wrap max-h-32 overflow-y-auto border 
                                ${status === 'success'
                                    ? 'bg-green-500/10 text-green-500 border-green-500/20'
                                    : 'bg-red-500/10 text-red-500 border-red-500/20'
                                }`}>
                                {response}
                            </div>
                        )}
                    </div>
                </div>
            )}

            <Handle
                type="source"
                position={Position.Right}
                className="!w-3 !h-3 !bg-[var(--primary)] !border-2 !border-[var(--background)]"
            />
        </div>
    );
};

export default memo(TestNode);
