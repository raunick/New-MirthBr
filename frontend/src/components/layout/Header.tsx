import React, { useEffect, useState } from 'react';
import { Activity, Zap, Settings, LogOut, User, MessageSquare, Square, Play, Book } from 'lucide-react';
import Link from 'next/link';
import axios from 'axios';
import SettingsModal from './SettingsModal';
import { useAuthStore } from '@/stores/useAuthStore';
import { useFlowStore } from '@/stores/useFlowStore';

interface HeaderProps {
    onToggleLogs?: () => void;
    onToggleMetrics?: () => void;
    onTestChannel?: () => void;
}

export default function Header({ onToggleLogs, onToggleMetrics, onTestChannel }: Omit<HeaderProps, 'isConnected' | 'lastDeployStatus'>) {
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const { username, logout } = useAuthStore();
    const {
        isRunning,
        executeDeploy,
        toggleChannelStatus,
        channelStatus,
        deployStatus,
        deployErrorMessage
    } = useFlowStore();

    // Status tracking for header actions
    const DEPLOY_ID = 'header-deploy'; // ID for tracking deploy status in this component
    const currentDeployStatus = deployStatus[DEPLOY_ID] || 'idle';
    const isDeploying = currentDeployStatus === 'loading';
    const hasError = currentDeployStatus === 'error';

    // Backend health check (keep local state for connectivity)
    const [isConnected, setIsConnected] = useState(false);

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

    const handleDeploy = async () => {
        await executeDeploy(DEPLOY_ID);
    };

    const handleToggleChannel = async () => {
        if (isRunning) {
            await toggleChannelStatus(DEPLOY_ID, 'offline');
        } else {
            await toggleChannelStatus(DEPLOY_ID, 'online');
        }
    };

    return (
        <>
            <header className="h-16 glass border-b border-[var(--glass-border)] flex items-center justify-between px-6 z-40 relative">
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
                    {/* Channel Controls Group */}
                    <div className="flex items-center bg-[var(--background-secondary)]/30 border border-[var(--glass-border)] rounded-lg p-1 gap-1">

                        {/* Deploy Button */}
                        <button
                            onClick={handleDeploy}
                            disabled={isDeploying}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-all text-xs font-bold uppercase tracking-wider ${hasError ? 'bg-red-500/10 text-red-500 border border-red-500/20' :
                                currentDeployStatus === 'success' ? 'bg-green-500/10 text-green-500 border border-green-500/20' :
                                    'hover:bg-[var(--primary)]/10 text-[var(--foreground)] border border-transparent hover:border-[var(--primary)]/20'
                                }`}
                            title={hasError ? deployErrorMessage || "Deploy Failed" : "Deploy Changes"}
                        >
                            {isDeploying ? (
                                <div className="w-3 h-3 border-2 border-current border-t-transparent animate-spin rounded-full" />
                            ) : (
                                <Settings size={14} className={currentDeployStatus === 'success' ? "text-green-500" : ""} />
                            )}
                            {hasError ? 'Error' : isDeploying ? 'Deploying' : 'Deploy'}
                        </button>

                        <div className="w-px h-4 bg-[var(--glass-border)] mx-1" />

                        {/* Start/Stop Toggle */}
                        <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-bold uppercase tracking-wider ml-1 ${isRunning ? 'text-green-500' : 'text-[var(--foreground-muted)]'}`}>
                                {isRunning ? 'Running' : 'Stopped'}
                            </span>
                            <button
                                onClick={handleToggleChannel}
                                disabled={isDeploying}
                                className={`relative w-10 h-5 rounded-full transition-colors duration-300 focus:outline-none ${isRunning ? 'bg-green-500' : 'bg-[var(--glass-border)]'
                                    }`}
                                title={isRunning ? "Stop Channel" : "Start Channel"}
                            >
                                <div className={`absolute left-0.5 top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-300 flex items-center justify-center ${isRunning ? 'translate-x-5' : 'translate-x-0'
                                    }`}>
                                    {isRunning ? <Square size={8} className="text-green-600 fill-current" /> : <Play size={8} className="text-gray-400 fill-current" />}
                                </div>
                            </button>
                        </div>
                    </div>

                    <div className="h-6 w-px bg-[var(--glass-border)]" />

                    {/* Tools Group */}
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
                            Logs
                        </button>

                        <button
                            onClick={onToggleMetrics}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-[var(--glass-bg)] transition-colors text-xs font-medium text-[var(--foreground-muted)] hover:text-[var(--foreground)] border border-transparent hover:border-[var(--glass-border)]"
                        >
                            <Activity size={14} className="text-[var(--primary)]" />
                            Metrics
                        </button>
                    </div>

                    <div className="h-6 w-px bg-[var(--glass-border)]" />

                    {/* Backend Status indicator */}
                    <div className="flex items-center gap-2" title={isConnected ? 'Backend Connected' : 'Backend Disconnected'}>
                        <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-[var(--success)] status-pulse' : 'bg-[var(--error)]'}`} />
                        <span className="text-xs text-[var(--foreground-muted)] hidden xl:inline">
                            {isConnected ? 'Online' : 'Offline'}
                        </span>
                    </div>

                    {/* User Info */}
                    {username && (
                        <div className="flex items-center gap-2 pl-2">
                            <span className="text-xs text-[var(--foreground-muted)] capitalize hidden sm:inline">Hi, {username}</span>
                            <button
                                onClick={handleLogout}
                                className="p-1.5 rounded hover:bg-black/20 text-[var(--foreground-muted)] hover:text-red-400 transition-colors"
                                title="Sign Out"
                            >
                                <LogOut size={16} />
                            </button>
                        </div>
                    )}

                    {/* Config Button (Global Settings? Maybe redundant with new deploy controls) */}
                    <button
                        onClick={() => setIsSettingsOpen(true)}
                        className="p-2 rounded-lg hover:bg-[var(--glass-bg)] transition-colors text-[var(--foreground-muted)]"
                        title="Channel Configurations"
                    >
                        <Settings size={20} />
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

