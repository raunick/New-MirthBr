'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { RefreshCw, Eye, AlertCircle, ArrowLeft, MessageSquare } from "lucide-react";
import Link from 'next/link';

interface Message {
    id: string;
    channel_id: string;
    content: string;
    status: 'PENDING' | 'PROCESSING' | 'SENT' | 'ERROR';
    error_message?: string;
    retry_count: number;
    created_at: string;
    updated_at: string;
}

export default function MessagesPage() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
    const [channelFilter, setChannelFilter] = useState<string>("");
    const [statusFilter, setStatusFilter] = useState<string>("ALL");

    const fetchMessages = async () => {
        setLoading(true);
        try {
            let url = 'http://localhost:3001/api/messages?limit=50';
            if (channelFilter) url += `&channel_id=${channelFilter}`;
            if (statusFilter && statusFilter !== 'ALL') url += `&status=${statusFilter}`;

            const res = await fetch(url, {
                headers: {
                    'Authorization': 'Bearer dev-key-change-in-production-32chars'
                }
            });
            if (res.ok) {
                const data = await res.json();
                setMessages(data);
            }
        } catch (error) {
            console.error("Failed to fetch messages", error);
        } finally {
            setLoading(false);
        }
    };

    const retryMessage = async (id: string) => {
        try {
            const res = await fetch(`http://localhost:3001/api/messages/${id}/retry`, {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer dev-key-change-in-production-32chars'
                }
            });
            if (res.ok) {
                fetchMessages();
                setSelectedMessage(null);
            }
        } catch (error) {
            console.error("Failed to retry", error);
        }
    }

    useEffect(() => {
        fetchMessages();
        const interval = setInterval(fetchMessages, 5000);
        return () => clearInterval(interval);
    }, [channelFilter, statusFilter]);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'SENT': return 'bg-green-500/10 text-green-500 border-green-500/20';
            case 'ERROR': return 'bg-red-500/10 text-red-500 border-red-500/20';
            case 'PENDING': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
            case 'PROCESSING': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
            default: return 'bg-gray-500';
        }
    };

    return (
        <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] p-8 font-[family-name:var(--font-geist-sans)]">
            <div className="max-w-7xl mx-auto space-y-6">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/" className="p-2 hover:bg-[var(--glass-border)] rounded-full transition-colors">
                            <ArrowLeft size={20} />
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold flex items-center gap-2">
                                <MessageSquare className="text-[var(--primary)]" />
                                Message Monitor
                            </h1>
                            <p className="text-[var(--foreground-muted)] text-sm">Real-time message tracking and management</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={fetchMessages} className="glass border-[var(--glass-border)]">
                            <RefreshCw className="mr-2 h-4 w-4" /> Refresh
                        </Button>
                    </div>
                </div>

                {/* Filters */}
                <div className="glass p-4 rounded-xl border border-[var(--glass-border)] flex gap-4">
                    <input
                        type="text"
                        placeholder="Filter by Channel ID..."
                        className="flex-1 bg-[var(--background-secondary)] border border-[var(--glass-border)] rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/50"
                        value={channelFilter}
                        onChange={(e) => setChannelFilter(e.target.value)}
                    />
                    <select
                        className="w-48 bg-[var(--background-secondary)] border border-[var(--glass-border)] rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/50"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <option value="ALL">All Status</option>
                        <option value="SENT">Success (SENT)</option>
                        <option value="ERROR">Error (ERROR)</option>
                        <option value="PENDING">Pending</option>
                    </select>
                </div>

                {/* Table */}
                <div className="glass rounded-xl border border-[var(--glass-border)] overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-[var(--background-secondary)]/50 border-b border-[var(--glass-border)]">
                                <tr>
                                    <th className="px-6 py-4 text-left font-medium text-[var(--foreground-muted)]">Time</th>
                                    <th className="px-6 py-4 text-left font-medium text-[var(--foreground-muted)]">Channel ID</th>
                                    <th className="px-6 py-4 text-left font-medium text-[var(--foreground-muted)]">Status</th>
                                    <th className="px-6 py-4 text-left font-medium text-[var(--foreground-muted)]">Retries</th>
                                    <th className="px-6 py-4 text-right font-medium text-[var(--foreground-muted)]">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--glass-border)]">
                                {loading && messages.length === 0 ? (
                                    <tr><td colSpan={5} className="px-6 py-8 text-center text-[var(--foreground-muted)]">Loading messages...</td></tr>
                                ) : messages.length === 0 ? (
                                    <tr><td colSpan={5} className="px-6 py-8 text-center text-[var(--foreground-muted)]">No messages found.</td></tr>
                                ) : (
                                    messages.map((msg) => (
                                        <tr key={msg.id} className="hover:bg-[var(--glass-bg)]/50 transition-colors">
                                            <td className="px-6 py-4 text-[var(--foreground-muted)] whitespace-nowrap">
                                                {new Date(msg.created_at).toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4 font-mono text-xs opacity-70">
                                                {msg.channel_id}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(msg.status)}`}>
                                                    {msg.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-[var(--foreground-muted)]">
                                                {msg.retry_count}
                                            </td>
                                            <td className="px-6 py-4 text-right flex justify-end gap-2">
                                                <button
                                                    onClick={() => setSelectedMessage(msg)}
                                                    className="p-1.5 hover:bg-[var(--background-secondary)] rounded-md transition-colors text-[var(--foreground-muted)] hover:text-[var(--primary)]"
                                                    title="View Details"
                                                >
                                                    <Eye size={16} />
                                                </button>
                                                {msg.status === 'ERROR' && (
                                                    <button
                                                        onClick={() => retryMessage(msg.id)}
                                                        className="p-1.5 hover:bg-[var(--background-secondary)] rounded-md transition-colors text-red-500 hover:text-red-400"
                                                        title="Retry"
                                                    >
                                                        <RefreshCw size={16} />
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Detail Modal (Simple Overlay) */}
            {selectedMessage && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-[var(--background)] border border-[var(--glass-border)] rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-[var(--glass-border)] flex justify-between items-center">
                            <h3 className="text-lg font-semibold">Message Details</h3>
                            <button onClick={() => setSelectedMessage(null)} className="text-[var(--foreground-muted)] hover:text-[var(--foreground)]">✕</button>
                        </div>

                        <div className="p-6 overflow-y-auto space-y-6">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span className="block text-[var(--foreground-muted)] text-xs uppercase tracking-wider mb-1">Message ID</span>
                                    <span className="font-mono">{selectedMessage.id}</span>
                                </div>
                                <div>
                                    <span className="block text-[var(--foreground-muted)] text-xs uppercase tracking-wider mb-1">Channel ID</span>
                                    <span className="font-mono">{selectedMessage.channel_id}</span>
                                </div>
                            </div>

                            {selectedMessage.status === 'ERROR' && (
                                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                                    <h4 className="flex items-center gap-2 text-red-500 font-medium mb-2">
                                        <AlertCircle size={16} /> Processing Error
                                    </h4>
                                    <pre className="text-xs text-red-400 whitespace-pre-wrap font-mono">
                                        {selectedMessage.error_message || "Unknown error"}
                                    </pre>
                                </div>
                            )}

                            <div>
                                <span className="block text-[var(--foreground-muted)] text-xs uppercase tracking-wider mb-2">Raw Content</span>
                                <div className="bg-[var(--background-secondary)] rounded-lg p-4 font-mono text-xs overflow-x-auto border border-[var(--glass-border)]">
                                    {selectedMessage.content}
                                </div>
                            </div>
                        </div>

                        <div className="p-6 border-t border-[var(--glass-border)] flex justify-end gap-2 bg-[var(--background-secondary)]/30">
                            <Button variant="outline" onClick={() => setSelectedMessage(null)}>Close</Button>
                            {selectedMessage.status === 'ERROR' && (
                                <Button onClick={() => retryMessage(selectedMessage.id)}>Retry Message</Button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
