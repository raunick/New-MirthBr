import React, { useState, useCallback } from 'react';
import { PlayCircle, Send, X, ChevronRight, ChevronDown, Activity, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { testTcp } from '@/lib/api';
import axios from 'axios';
import { useFlowStore } from '@/stores/useFlowStore';

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

interface TestDrawerProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function TestDrawer({ isOpen, onClose }: TestDrawerProps) {
    const testChannel = useFlowStore((state) => state.testChannel);

    // Local state (migrated from TestNode)
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [response, setResponse] = useState<string | null>(null);

    // Configuration state
    const [sendMode, setSendMode] = useState<'inject' | 'http' | 'tcp'>('inject');
    const [payloadType, setPayloadType] = useState('hl7');
    const [payload, setPayload] = useState(PAYLOAD_PRESETS.hl7);

    // TCP Config
    const [tcpHost, setTcpHost] = useState('localhost');
    const [tcpPort, setTcpPort] = useState('6500');
    const [tcpTimeout, setTcpTimeout] = useState('30');

    // HTTP Config
    const [httpUrl, setHttpUrl] = useState('http://localhost:8080/api/messages');
    const [httpMethod, setHttpMethod] = useState('POST');

    const handleTypeChange = (value: string) => {
        setPayloadType(value);
        setPayload(PAYLOAD_PRESETS[value] || '');
    };

    const handleSend = async () => {
        setLoading(true);
        setStatus('idle');
        setResponse(null);

        try {
            if (sendMode === 'inject') {
                await testChannel(payloadType, payload);
                setStatus('success');
                setResponse("Message injected successfully");
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

    if (!isOpen) return null;

    return (
        <div className="fixed inset-y-0 right-0 w-[450px] bg-slate-900/90 backdrop-blur-2xl shadow-2xl border-l border-[var(--glass-border)] transform transition-transform duration-300 z-50 flex flex-col">
            {/* Header */}
            <div className="h-14 border-b border-[var(--glass-border)] flex items-center justify-between px-4 bg-[var(--background-secondary)]/50">
                <div className="flex items-center gap-2">
                    <PlayCircle size={18} className="text-[var(--primary)]" />
                    <h2 className="font-semibold text-sm gradient-text">Test Channel</h2>
                </div>
                <button
                    onClick={onClose}
                    className="p-1.5 hover:bg-[var(--glass-bg)] rounded-md transition-colors text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
                >
                    <X size={18} />
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">

                {/* Send Mode Selection */}
                <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-[var(--foreground-muted)]">Mode</label>
                    <div className="flex bg-[var(--background)] p-1 rounded border border-[var(--glass-border)]">
                        {['inject', 'http', 'tcp'].map((mode) => (
                            <button
                                key={mode}
                                onClick={() => setSendMode(mode as any)}
                                className={`flex-1 text-xs py-1.5 rounded transition-colors uppercase font-medium ${sendMode === mode
                                    ? 'bg-[var(--primary)]/20 text-[var(--primary)] shadow-sm'
                                    : 'text-[var(--foreground-muted)] hover:text-[var(--foreground)]'
                                    }`}
                            >
                                {mode === 'inject' ? 'Internal' : mode === 'http' ? 'Internet' : 'HL7 TCP'}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Configuration */}
                <div className="space-y-4 rounded-lg bg-[var(--background-secondary)]/30 p-3 border border-[var(--glass-border)]">
                    <div className="flex items-center gap-2 text-xs font-bold text-[var(--foreground-muted)] mb-2">
                        <Settings2 size={12} />
                        <span>Configuration</span>
                    </div>

                    {sendMode === 'tcp' && (
                        <div className="grid grid-cols-2 gap-3 animate-in fade-in">
                            <div className="col-span-2">
                                <label className="text-[10px] text-[var(--foreground-muted)] uppercase mb-1 block">Host</label>
                                <input
                                    type="text"
                                    value={tcpHost}
                                    onChange={(e) => setTcpHost(e.target.value)}
                                    className="w-full bg-[var(--background)] border border-[var(--glass-border)] rounded px-2 py-1.5 text-xs outline-none focus:border-[var(--primary)]"
                                    placeholder="localhost"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] text-[var(--foreground-muted)] uppercase mb-1 block">Port</label>
                                <input
                                    type="number"
                                    value={tcpPort}
                                    onChange={(e) => setTcpPort(e.target.value)}
                                    className="w-full bg-[var(--background)] border border-[var(--glass-border)] rounded px-2 py-1.5 text-xs outline-none focus:border-[var(--primary)]"
                                    placeholder="6500"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] text-[var(--foreground-muted)] uppercase mb-1 block">Timeout (s)</label>
                                <input
                                    type="number"
                                    value={tcpTimeout}
                                    onChange={(e) => setTcpTimeout(e.target.value)}
                                    className="w-full bg-[var(--background)] border border-[var(--glass-border)] rounded px-2 py-1.5 text-xs outline-none focus:border-[var(--primary)]"
                                    placeholder="30"
                                />
                            </div>
                        </div>
                    )}

                    {sendMode === 'http' && (
                        <div className="space-y-3 animate-in fade-in">
                            <div className="flex gap-2">
                                <div className="w-24">
                                    <label className="text-[10px] text-[var(--foreground-muted)] uppercase mb-1 block">Method</label>
                                    <select
                                        value={httpMethod}
                                        onChange={(e) => setHttpMethod(e.target.value)}
                                        className="w-full bg-[var(--background)] border border-[var(--glass-border)] rounded px-2 py-1.5 text-xs outline-none focus:border-[var(--primary)]"
                                    >
                                        <option>POST</option>
                                        <option>PUT</option>
                                        <option>GET</option>
                                    </select>
                                </div>
                                <div className="flex-1">
                                    <label className="text-[10px] text-[var(--foreground-muted)] uppercase mb-1 block">URL</label>
                                    <input
                                        type="text"
                                        value={httpUrl}
                                        onChange={(e) => setHttpUrl(e.target.value)}
                                        className="w-full bg-[var(--background)] border border-[var(--glass-border)] rounded px-2 py-1.5 text-xs outline-none focus:border-[var(--primary)]"
                                        placeholder="http://url"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {sendMode === 'inject' && (
                        <div className="text-xs text-[var(--foreground-muted)] italic py-1 animate-in fade-in">
                            Injects the message directly into the current channel's source connector, bypassing network listeners.
                        </div>
                    )}
                </div>

                {/* Payload Editor */}
                <div className="space-y-2 flex-1 flex flex-col">
                    <div className="flex justify-between items-end">
                        <label className="text-xs font-bold uppercase tracking-wider text-[var(--foreground-muted)]">Payload</label>
                        <select
                            value={payloadType}
                            onChange={(e) => handleTypeChange(e.target.value)}
                            className="bg-transparent text-xs text-[var(--primary)] outline-none cursor-pointer border-none p-0 focus:ring-0"
                        >
                            {Object.keys(PAYLOAD_PRESETS).map(k => (
                                <option key={k} value={k}>{k.toUpperCase()}</option>
                            ))}
                        </select>
                    </div>
                    <textarea
                        value={payload}
                        onChange={(e) => setPayload(e.target.value)}
                        className="w-full min-h-[200px] flex-1 bg-[var(--background)] border border-[var(--glass-border)] rounded-lg p-3 text-xs font-mono text-[var(--foreground)] outline-none focus:border-[var(--primary)] resize-y whitespace-pre"
                        spellCheck={false}
                    />
                    <div className="text-[10px] text-[var(--foreground-muted)] text-right">
                        {payload.length} chars
                    </div>
                </div>

                {/* Send Button */}
                <Button
                    onClick={handleSend}
                    disabled={loading}
                    className="w-full bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white"
                >
                    {loading ? 'Sending...' : <><Send size={16} className="mr-2" /> Send Request</>}
                </Button>

                {/* Response Area */}
                {response && (
                    <div className="space-y-2 pt-4 border-t border-[var(--glass-border)] animate-in slide-in-from-bottom-2 fade-in">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-bold uppercase tracking-wider text-[var(--foreground-muted)]">Response</label>
                            <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${status === 'success' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'
                                }`}>
                                {status.toUpperCase()}
                            </span>
                        </div>
                        <div className={`text-xs p-3 rounded-lg font-mono break-all whitespace-pre-wrap max-h-48 overflow-y-auto border ${status === 'success'
                            ? 'bg-green-500/5 text-green-500 border-green-500/20'
                            : 'bg-red-500/5 text-red-500 border-red-500/20'
                            }`}>
                            {response}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
