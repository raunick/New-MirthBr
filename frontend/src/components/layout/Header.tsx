import React, { useEffect, useState } from 'react';
import { Activity, Zap, Settings, LogOut, User, MessageSquare, Square, Play } from 'lucide-react';
import Link from 'next/link';
import axios from 'axios';
import SettingsModal from './SettingsModal';
import { useAuthStore } from '@/stores/useAuthStore';
import { useFlowStore } from '@/stores/useFlowStore';

interface HeaderProps {
    isConnected?: boolean;
    lastDeployStatus?: 'success' | 'error' | 'idle';
    onToggleLogs?: () => void;
    onToggleMetrics?: () => void;
    onTestChannel?: () => void;
}

export default function Header({ isConnected: initialConnected = false, lastDeployStatus = 'idle', onToggleLogs, onToggleMetrics, onTestChannel }: HeaderProps) {
    const [isConnected, setIsConnected] = useState(initialConnected);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const { username, logout } = useAuthStore();
    const { isRunning, stopCurrentChannel } = useFlowStore();
    const [isStopping, setIsStopping] = useState(false);

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

    const handleLogout = () => {
        if (confirm('Tem certeza que deseja sair?')) {
            logout();
            window.location.reload();
        }
    };

    const handleStop = async () => {
        setIsStopping(true);
        try {
            await stopCurrentChannel();
        } catch (e) {
            alert("Erro ao parar canal");
        } finally {
            setIsStopping(false);
        }
    };

    return (
        <>
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
                        {/* Channel Status & Control */}
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--background-secondary)]/30 border border-[var(--glass-border)] mr-2">
                            <div className={`w-2 h-2 rounded-full ${isRunning ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`} />
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--foreground-muted)] mr-2">
                                {isRunning ? 'Running' : 'Stopped'}
                            </span>
                            {isRunning && (
                                <button
                                    onClick={handleStop}
                                    disabled={isStopping}
                                    className="p-1 hover:bg-red-500/20 text-red-400 rounded transition-colors disabled:opacity-50"
                                    title="Stop Channel"
                                >
                                    {isStopping ? <div className="w-3 h-3 border-2 border-current border-t-transparent animate-spin rounded-full" /> : <Square size={12} fill="currentColor" />}
                                </button>
                            )}
                        </div>

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

                        <button
                            onClick={onToggleMetrics}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-[var(--glass-bg)] transition-colors text-xs font-medium text-[var(--foreground-muted)] hover:text-[var(--foreground)] border border-transparent hover:border-[var(--glass-border)]"
                        >
                            <Activity size={14} className="text-[var(--primary)]" />
                            Metrics
                        </button>

                        <Link href="/messages" className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-[var(--glass-bg)] transition-colors text-xs font-medium text-[var(--foreground-muted)] hover:text-[var(--foreground)] border border-transparent hover:border-[var(--glass-border)]">
                            <MessageSquare size={14} />
                            Messages
                        </Link>
                    </div>

                    {/* Backend Status indicator */}
                    <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-[var(--success)] status-pulse' : 'bg-[var(--error)]'}`} />
                        <span className="text-sm text-[var(--foreground-muted)]">
                            {isConnected ? 'Backend' : 'No Connection'}
                        </span>
                    </div>

                    {/* Last Deploy Status badge */}
                    {lastDeployStatus !== 'idle' && (
                        <div className="flex items-center gap-2 px-3 py-1 rounded-full glass border border-[var(--glass-border)]">
                            <Activity size={14} className={lastDeployStatus === 'success' ? 'text-[var(--success)]' : 'text-[var(--error)]'} />
                            <span className="text-xs text-[var(--foreground-muted)]">
                                {lastDeployStatus === 'success' ? 'Deploy OK' : 'Deploy Failed'}
                            </span>
                        </div>
                    )}

                    <div className="h-4 w-px bg-[var(--glass-border)] mx-2" />

                    {/* User Info */}
                    {username && (
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--background-secondary)]/30 border border-[var(--glass-border)]">
                            <User size={14} className="text-[var(--foreground-muted)]" />
                            <span className="text-sm text-[var(--foreground-muted)] capitalize">{username}</span>
                        </div>
                    )}

                    {/* Settings Button */}
                    <button
                        onClick={() => setIsSettingsOpen(true)}
                        className="p-2 rounded-lg hover:bg-[var(--glass-bg)] transition-colors"
                        title="Configurações"
                    >
                        <Settings size={20} className="text-[var(--foreground-muted)]" />
                    </button>

                    {/* Logout Button */}
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-red-500/10 border border-transparent hover:border-red-500/30 transition-all text-[var(--foreground-muted)] hover:text-red-400"
                        title="Sair"
                    >
                        <LogOut size={16} />
                        <span className="text-xs font-medium">Sair</span>
                    </button>
                </div>
            </header>

            {/* Settings Modal */}
            <SettingsModal
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
            />
        </>
    );
}

