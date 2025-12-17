"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { getLogs, LogEntry } from '@/lib/api';
import { Terminal, X, RefreshCw, Search, Filter, Trash2 } from 'lucide-react';

interface LogViewerProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function LogViewer({ isOpen, onClose }: LogViewerProps) {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [isAutoRefresh, setIsAutoRefresh] = useState(true);
    const [filterText, setFilterText] = useState('');
    const [filterLevel, setFilterLevel] = useState<string>('ALL');

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

    const filteredLogs = useMemo(() => {
        return logs.filter(log => {
            const matchesText = log.message.toLowerCase().includes(filterText.toLowerCase()) ||
                (log.channel_id && log.channel_id.toLowerCase().includes(filterText.toLowerCase()));
            const matchesLevel = filterLevel === 'ALL' || log.level === filterLevel;
            return matchesText && matchesLevel;
        });
    }, [logs, filterText, filterLevel]);

    if (!isOpen) return null;

    return (
        <div className="absolute bottom-0 left-0 right-0 h-80 glass border-t border-[var(--glass-border)] flex flex-col z-20 transition-transform duration-300">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--glass-border)] bg-[var(--background-secondary)]/80 backdrop-blur-md">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <Terminal size={16} className="text-[var(--primary)]" />
                        <span className="text-sm font-bold text-[var(--foreground)]">System Logs</span>
                    </div>

                    {/* Filters */}
                    <div className="flex items-center gap-2 ml-4">
                        <div className="relative">
                            <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-[var(--foreground-muted)]" />
                            <input
                                type="text"
                                placeholder="Search logs..."
                                value={filterText}
                                onChange={(e) => setFilterText(e.target.value)}
                                className="bg-[var(--background)] border border-[var(--glass-border)] rounded px-8 py-1 text-xs outline-none focus:border-[var(--primary)] w-48"
                            />
                            {filterText && (
                                <button onClick={() => setFilterText('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--foreground-muted)] hover:text-[var(--foreground)]">
                                    <X size={10} />
                                </button>
                            )}
                        </div>

                        <div className="flex items-center gap-1 bg-[var(--background)] border border-[var(--glass-border)] rounded px-2">
                            <Filter size={12} className="text-[var(--foreground-muted)]" />
                            <select
                                value={filterLevel}
                                onChange={(e) => setFilterLevel(e.target.value)}
                                className="bg-transparent border-none text-xs py-1 outline-none appearance-none pr-4 cursor-pointer"
                            >
                                <option value="ALL">All Levels</option>
                                <option value="INFO">Info</option>
                                <option value="WARN">Warning</option>
                                <option value="ERROR">Error</option>
                                <option value="DEBUG">Debug</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <span className="text-[10px] text-[var(--foreground-muted)] font-mono">
                        {filteredLogs.length} matches
                    </span>
                    <button
                        onClick={() => setLogs([])}
                        className="p-1 hover:bg-[var(--glass-bg)] rounded text-[var(--foreground-muted)] hover:text-red-400 transition-colors"
                        title="Clear view"
                    >
                        <Trash2 size={14} />
                    </button>
                    <button
                        onClick={() => setIsAutoRefresh(!isAutoRefresh)}
                        className={`text-xs flex items-center gap-1.5 px-2 py-1 rounded border ${isAutoRefresh
                                ? 'text-green-500 border-green-500/30 bg-green-500/5'
                                : 'text-[var(--foreground-muted)] border-[var(--glass-border)]'
                            }`}
                    >
                        <RefreshCw size={12} className={isAutoRefresh ? 'animate-spin' : ''} />
                        {isAutoRefresh ? 'Active' : 'Paused'}
                    </button>
                    <button onClick={onClose} className="hover:text-[var(--foreground)] text-[var(--foreground-muted)] p-1">
                        <X size={18} />
                    </button>
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-2 font-mono text-[11px] bg-[var(--background)]">
                {filteredLogs.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-[var(--foreground-muted)] gap-2 opacity-50">
                        <Search size={32} />
                        <p>No logs found matching your filters</p>
                    </div>
                )}
                <div className="space-y-0.5">
                    {filteredLogs.map((log, idx) => (
                        <div key={idx} className="group flex items-start gap-3 hover:bg-[var(--primary)]/5 p-1 rounded transition-colors border-l-2 border-transparent hover:border-[var(--primary)]">
                            <span className="text-[var(--foreground-muted)] shrink-0 w-24">
                                {new Date(log.timestamp).toLocaleTimeString()}
                            </span>
                            <span className={`shrink-0 w-12 font-bold text-center rounded px-1 ${log.level === 'ERROR' ? 'bg-red-500/10 text-red-500' :
                                    log.level === 'WARN' ? 'bg-yellow-500/10 text-yellow-500' :
                                        log.level === 'DEBUG' ? 'bg-gray-500/10 text-gray-400' :
                                            'bg-green-500/10 text-green-500'
                                }`}>
                                {log.level}
                            </span>
                            <span className="text-[var(--foreground)] break-all leading-relaxed">
                                {log.message}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

