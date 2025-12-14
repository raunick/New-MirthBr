import React, { useEffect, useState } from 'react';
import { Activity, Zap, Settings } from 'lucide-react';
import axios from 'axios';

interface HeaderProps {
    isConnected?: boolean;
    lastDeployStatus?: 'success' | 'error' | 'idle';
    onToggleLogs?: () => void;
    onTestChannel?: () => void;
}

export default function Header({ isConnected: initialConnected = false, lastDeployStatus = 'idle', onToggleLogs, onTestChannel }: HeaderProps) {
    const [isConnected, setIsConnected] = useState(initialConnected);

    useEffect(() => {
        const checkHealth = async () => {
            try {
                await axios.get('http://localhost:3001/api/health', { timeout: 2000 });
                setIsConnected(true);
            } catch (e) {
                setIsConnected(false);
            }
        };

        checkHealth();
        const interval = setInterval(checkHealth, 5000);
        return () => clearInterval(interval);
    }, []);
    return (
        <header className="h-16 glass border-b border-[var(--glass-border)] flex items-center justify-between px-6">
            {/* Logo Section */}
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] flex items-center justify-center">
                    <Zap size={24} className="text-white" />
                </div>
                <div>
                    <h1 className="text-xl font-bold gradient-text">MirthBR</h1>
                    <p className="text-xs text-[var(--foreground-muted)]">Integration Engine</p>
                </div>
            </div>

            {/* Status Section */}
            <div className="flex items-center gap-6">
                <div className="flex gap-2">
                    <button
                        onClick={onTestChannel}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--background-secondary)]/50 hover:bg-[var(--glass-bg)] border border-[var(--glass-border)] transition-all text-xs font-semibold text-[var(--primary)] hover:text-[var(--primary-hover)] hover:shadow-lg hover:shadow-[var(--primary)]/10"
                    >
                        <Zap size={14} className="fill-current" />
                        Test Channel
                    </button>

                    <button
                        onClick={onToggleLogs}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-[var(--glass-bg)] transition-colors text-xs font-medium text-[var(--foreground-muted)] hover:text-[var(--foreground)] border border-transparent hover:border-[var(--glass-border)]"
                    >
                        <Activity size={14} />
                        View Logs
                    </button>
                </div>

                {/* Backend Status */}
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-[var(--success)] status-pulse' : 'bg-[var(--error)]'}`} />
                    <span className="text-sm text-[var(--foreground-muted)]">
                        {isConnected ? 'Backend Connected' : 'Disconnected'}
                    </span>
                </div>

                {/* Last Deploy Status */}
                {lastDeployStatus !== 'idle' && (
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full glass">
                        <Activity size={14} className={lastDeployStatus === 'success' ? 'text-[var(--success)]' : 'text-[var(--error)]'} />
                        <span className="text-xs text-[var(--foreground-muted)]">
                            {lastDeployStatus === 'success' ? 'Deploy OK' : 'Deploy Failed'}
                        </span>
                    </div>
                )}

                {/* Settings Button */}
                <button className="p-2 rounded-lg hover:bg-[var(--glass-bg)] transition-colors">
                    <Settings size={20} className="text-[var(--foreground-muted)]" />
                </button>
            </div>
        </header>
    );
}
