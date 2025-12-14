"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Send, X, PlayCircle } from 'lucide-react';
import axios from 'axios';

interface MessageInjectorModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function MessageInjectorModal({ isOpen, onClose }: MessageInjectorModalProps) {
    const [url, setUrl] = useState('http://localhost:8080');
    const [method, setMethod] = useState('POST');
    const [payload, setPayload] = useState(
        `MSH|^~\\&|LISS|OMNI|RAPP|MCM|202305041005||ORM^O01|202305041005|P|2.3\nPID|||123456||MOUSE^MICKEY^||19281118|M|||123 MAIN ST^^LAKE BUENA VISTA^FL^32830||(407)939-2273`
    );
    const [response, setResponse] = useState<string | null>(null);
    const [status, setStatus] = useState<number | null>(null);
    const [loading, setLoading] = useState(false);

    const handleSend = async () => {
        setLoading(true);
        setResponse(null);
        setStatus(null);
        try {
            const res = await axios({
                method,
                url,
                data: payload,
                validateStatus: () => true // Allow any status
            });
            setStatus(res.status);
            setResponse(typeof res.data === 'object' ? JSON.stringify(res.data, null, 2) : String(res.data));
        } catch (e: any) {
            setStatus(0);
            setResponse(e.message || "Network Error");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="w-[600px] glass-card flex flex-col overflow-hidden max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--glass-border)] bg-[var(--background-secondary)]">
                    <div className="flex items-center gap-2">
                        <PlayCircle className="text-[var(--primary)]" size={20} />
                        <h2 className="font-semibold text-[var(--foreground)]">Message Injector</h2>
                    </div>
                    <button onClick={onClose} className="text-[var(--foreground-muted)] hover:text-[var(--foreground)]">
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-5 space-y-4 overflow-y-auto">
                    {/* URL Bar */}
                    <div className="flex gap-2">
                        <select
                            value={method}
                            onChange={(e) => setMethod(e.target.value)}
                            className="bg-[var(--background)] border border-[var(--glass-border)] rounded px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--primary)]"
                        >
                            <option>POST</option>
                            <option>PUT</option>
                        </select>
                        <input
                            type="text"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            className="flex-1 bg-[var(--background)] border border-[var(--glass-border)] rounded px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--primary)]"
                            placeholder="http://localhost:8080"
                        />
                        <Button
                            onClick={handleSend}
                            disabled={loading}
                            className="bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white"
                        >
                            {loading ? 'Sending...' : <><Send size={14} className="mr-2" /> Send</>}
                        </Button>
                    </div>

                    {/* Payload */}
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-[var(--foreground-muted)] uppercase">Message Payload</label>
                        <textarea
                            value={payload}
                            onChange={(e) => setPayload(e.target.value)}
                            className="w-full h-40 bg-[var(--background)] border border-[var(--glass-border)] rounded-lg p-3 text-xs font-mono text-[var(--foreground)] outline-none focus:border-[var(--primary)] resize-none"
                        />
                    </div>

                    {/* Response */}
                    {status !== null && (
                        <div className="space-y-2 animate-in fade-in slide-in-from-bottom-2">
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-medium text-[var(--foreground-muted)] uppercase">Response</label>
                                <span className={`text-xs px-2 py-0.5 rounded ${status >= 200 && status < 300 ? 'bg-[var(--success)]/20 text-[var(--success)]' : 'bg-[var(--error)]/20 text-[var(--error)]'
                                    }`}>
                                    Status: {status}
                                </span>
                            </div>
                            <div className="w-full max-h-40 overflow-y-auto bg-[#111] border border-[var(--glass-border)] rounded-lg p-3">
                                <pre className="text-xs font-mono text-[var(--foreground)] whitespace-pre-wrap break-all">
                                    {response}
                                </pre>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
