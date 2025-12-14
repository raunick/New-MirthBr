"use client";

import React, { useEffect, useState } from 'react';
import { getLogs, LogEntry } from '@/lib/api';
import { Terminal, X, RefreshCw } from 'lucide-react';

interface LogViewerProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function LogViewer({ isOpen, onClose }: LogViewerProps) {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [isAutoRefresh, setIsAutoRefresh] = useState(true);

    const fetchLogs = async () => {
        try {
            const data = await getLogs();
            setLogs(data);
        } catch (e) {
            console.error("Failed to fetch logs", e);
        }
    };

    useEffect(() => {
        if (!isOpen) return;

        fetchLogs();
        let interval: NodeJS.Timeout;

        if (isAutoRefresh) {
            interval = setInterval(fetchLogs, 2000);
        }

        return () => clearInterval(interval);
    }, [isOpen, isAutoRefresh]);

    if (!isOpen) return null;

    return (
        <div className="absolute bottom-0 left-0 right-0 h-64 glass border-t border-[var(--glass-border)] flex flex-col z-20 transition-transform duration-300">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--glass-border)] bg-[var(--background-secondary)]">
                <div className="flex items-center gap-2">
                    <Terminal size={16} className="text-[var(--primary)]" />
                    <span className="text-sm font-semibold text-[var(--foreground)]">System Logs</span>
                    <span className="text-xs text-[var(--foreground-muted)] px-2">Last 100 events</span>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setIsAutoRefresh(!isAutoRefresh)}
                        className={`text-xs flex items-center gap-1 ${isAutoRefresh ? 'text-[var(--success)]' : 'text-[var(--foreground-muted)]'}`}
                    >
                        <RefreshCw size={12} className={isAutoRefresh ? 'animate-spin' : ''} />
                        {isAutoRefresh ? 'Auto' : 'Paused'}
                    </button>
                    <button onClick={onClose} className="hover:text-[var(--foreground)] text-[var(--foreground-muted)]">
                        <X size={16} />
                    </button>
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1 font-mono text-xs bg-[var(--background)]">
                {logs.length === 0 && (
                    <div className="text-[var(--foreground-muted)] text-center mt-10">No logs available</div>
                )}
                {logs.map((log, idx) => (
                    <div key={idx} className="flex items-start gap-3 hover:bg-[var(--background-secondary)] p-1 rounded">
                        <span className="text-[var(--foreground-muted)] shrink-0 w-36">
                            {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                        <span className={`shrink-0 w-16 font-bold ${log.level === 'ERROR' ? 'text-[var(--error)]' : 'text-[var(--success)]'
                            }`}>
                            [{log.level}]
                        </span>
                        <span className="text-[var(--foreground)] break-all">
                            {log.message}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}
