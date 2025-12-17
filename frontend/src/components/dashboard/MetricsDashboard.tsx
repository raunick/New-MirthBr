import React from 'react';
import { useMetrics } from '@/hooks/useMetrics';
import { Activity, X, ArrowRight, AlertCircle, CheckCircle } from 'lucide-react';

interface MetricsDashboardProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function MetricsDashboard({ isOpen, onClose }: MetricsDashboardProps) {
    const { updates, stats, isConnected } = useMetrics();

    if (!isOpen) return null;

    return (
        <div className="fixed inset-y-0 right-0 w-[400px] glass shadow-2xl border-l border-[var(--glass-border)] transform transition-transform duration-300 z-50 flex flex-col">
            {/* Header */}
            <div className="h-14 border-b border-[var(--glass-border)] flex items-center justify-between px-4">
                <div className="flex items-center gap-2">
                    <Activity size={18} className="text-[var(--primary)]" />
                    <h2 className="font-semibold text-sm gradient-text">Live Metrics</h2>
                    <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} title={isConnected ? "WebSocket Connected" : "Disconnected"} />
                </div>
                <button
                    onClick={onClose}
                    className="p-1.5 hover:bg-[var(--glass-bg)] rounded-md transition-colors text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
                >
                    <X size={18} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {/* Stats Overview */}
                <div className="space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--foreground-muted)]">Channel Statistics</h3>
                    {Object.keys(stats).length === 0 && (
                        <p className="text-xs text-[var(--foreground-muted)] text-center py-4">Waiting for data...</p>
                    )}
                    {Object.entries(stats).map(([channelId, data]) => (
                        <div key={channelId} className="glass p-3 rounded-lg border border-[var(--glass-border)]">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-mono text-[var(--primary)] truncate max-w-[150px]" title={channelId}>{channelId}</span>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                <div className="text-center p-2 rounded bg-[var(--background-secondary)]/50">
                                    <div className="text-xs text-[var(--foreground-muted)] mb-1">Processed</div>
                                    <div className="text-lg font-bold text-[var(--foreground)]">{data.processed}</div>
                                </div>
                                <div className="text-center p-2 rounded bg-green-500/10 border border-green-500/20">
                                    <div className="text-xs text-green-500 mb-1">Sent</div>
                                    <div className="text-lg font-bold text-green-500">{data.sent}</div>
                                </div>
                                <div className="text-center p-2 rounded bg-red-500/10 border border-red-500/20">
                                    <div className="text-xs text-red-500 mb-1">Errors</div>
                                    <div className="text-lg font-bold text-red-500">{data.errors}</div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Live Feed */}
                <div className="space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--foreground-muted)]">Live Feed</h3>
                    <div className="space-y-2">
                        {updates.map((update, idx) => (
                            <div key={idx} className="flex items-center gap-3 p-2 rounded-md bg-[var(--background-secondary)]/30 border border-[var(--glass-border)] text-xs animate-in slide-in-from-right-2 fade-in duration-300">
                                <span className="font-mono opacity-50 text-[10px] whitespace-nowrap">
                                    {new Date(update.timestamp).toLocaleTimeString()}
                                </span>
                                <div className="flex-1 min-w-0 flex items-center gap-2">
                                    <span className="font-mono text-[var(--primary)] truncate max-w-[80px]">{update.channel_id.substring(0, 8)}</span>
                                    <ArrowRight size={12} className="opacity-50" />
                                    <span className="truncate max-w-[100px]">{update.message_id?.substring(0, 8) || "?"}</span>
                                </div>
                                <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase
                                    ${update.status === 'SENT' ? 'bg-green-500/10 text-green-500 border border-green-500/20' :
                                        update.status === 'ERROR' ? 'bg-red-500/10 text-red-500 border border-red-500/20' :
                                            'bg-blue-500/10 text-blue-500 border border-blue-500/20'
                                    }`}>
                                    {update.status === 'SENT' && <CheckCircle size={10} />}
                                    {update.status === 'ERROR' && <AlertCircle size={10} />}
                                    {update.status}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
