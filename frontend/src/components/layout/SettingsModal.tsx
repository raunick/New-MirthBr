"use client";

import React, { useEffect, useState } from 'react';
import { X, Server, Cpu, Database, Activity, Layers, GitBranch, Clock, Zap, Eye, Code } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFlowStore } from '@/stores/useFlowStore';
import axios from 'axios';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

interface BackendInfo {
    isConnected: boolean;
    channels: { id: string; name: string; config?: any; frontend_schema?: any }[];
    version: string;
    uptime?: string;
}

interface SystemStats {
    nodeCount: number;
    edgeCount: number;
    nodeTypes: Record<string, number>;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
    const { nodes, edges, loadFlow } = useFlowStore();
    const [backendInfo, setBackendInfo] = useState<BackendInfo>({
        isConnected: false,
        channels: [],
        version: '0.1.0',
    });
    const [loading, setLoading] = useState(true);
    const [selectedChannel, setSelectedChannel] = useState<any>(null);

    const handleLoadChannel = (channel: any) => {
        if (channel.frontend_schema) {
            loadFlow(channel.frontend_schema);
            onClose();
        } else {
            // Open viewer for Backend Only channels
            setSelectedChannel(channel);
        }
    };

    const handleCloseViewer = () => {
        setSelectedChannel(null);
    };

    // Calculate system stats
    const systemStats: SystemStats = React.useMemo(() => {
        const nodeTypes: Record<string, number> = {};
        nodes.forEach(node => {
            const type = node.type || 'unknown';
            nodeTypes[type] = (nodeTypes[type] || 0) + 1;
        });
        return {
            nodeCount: nodes.length,
            edgeCount: edges.length,
            nodeTypes,
        };
    }, [nodes, edges]);

    // Fetch backend info
    useEffect(() => {
        if (!isOpen) return;

        const fetchBackendInfo = async () => {
            setLoading(true);
            try {
                // Auth header
                const headers = {
                    'Authorization': 'Bearer dev-key-change-in-production-32chars'
                };

                // Check health
                await axios.get('http://localhost:3001/api/health', { timeout: 2000 });

                // Get channels
                const channelsRes = await axios.get('http://localhost:3001/api/channels', {
                    headers,
                    timeout: 2000
                });

                setBackendInfo({
                    isConnected: true,
                    channels: channelsRes.data || [],
                    version: '0.1.0',
                });
            } catch (e) {
                setBackendInfo(prev => ({
                    ...prev,
                    isConnected: false,
                }));
            } finally {
                setLoading(false);
            }
        };

        fetchBackendInfo();
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Channel Viewer Modal */}
            {selectedChannel && (
                <div className="absolute inset-0 z-60 flex items-center justify-center">
                    <div
                        className="absolute inset-0 bg-black/40"
                        onClick={handleCloseViewer}
                    />
                    <div className="relative w-full max-w-2xl mx-4 glass rounded-2xl border border-[var(--glass-border)] shadow-2xl overflow-hidden">
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-[var(--glass-border)]">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-[var(--secondary)]/20 flex items-center justify-center">
                                    <Code size={16} className="text-[var(--secondary)]" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-[var(--foreground)]">
                                        {selectedChannel.name}
                                    </h3>
                                    <p className="text-xs text-[var(--foreground-muted)]">
                                        ID: {selectedChannel.id}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={handleCloseViewer}
                                className="p-2 rounded-lg hover:bg-[var(--glass-bg)] transition-colors"
                            >
                                <X size={18} className="text-[var(--foreground-muted)]" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-4 max-h-[60vh] overflow-y-auto">
                            <h4 className="text-sm font-medium text-[var(--foreground-muted)] mb-2">
                                Configuração do Canal (JSON)
                            </h4>
                            <pre className="p-4 rounded-xl bg-[var(--background)] border border-[var(--glass-border)] text-sm text-[var(--foreground)] overflow-x-auto font-mono">
                                {JSON.stringify(selectedChannel.config, null, 2)}
                            </pre>
                        </div>

                        {/* Footer */}
                        <div className="flex justify-end gap-3 p-4 border-t border-[var(--glass-border)]">
                            <Button
                                variant="outline"
                                onClick={handleCloseViewer}
                                className="glass border-[var(--glass-border)] text-[var(--foreground)] hover:bg-[var(--glass-bg)]"
                            >
                                Fechar
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Modal */}
            <div className="relative w-full max-w-2xl mx-4 glass rounded-2xl border border-[var(--glass-border)] shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-[var(--glass-border)]">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] flex items-center justify-center">
                            <Zap size={20} className="text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-[var(--foreground)]">Configurações</h2>
                            <p className="text-sm text-[var(--foreground-muted)]">MirthBR Integration Engine</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-[var(--glass-bg)] transition-colors"
                    >
                        <X size={20} className="text-[var(--foreground-muted)]" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                    {/* System Summary */}
                    <section>
                        <h3 className="flex items-center gap-2 text-lg font-semibold text-[var(--foreground)] mb-4">
                            <Cpu size={18} className="text-[var(--primary)]" />
                            Resumo do Sistema
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            <div className="glass-card p-4 rounded-xl">
                                <div className="flex items-center gap-2 text-[var(--foreground-muted)] mb-2">
                                    <Layers size={14} />
                                    <span className="text-xs uppercase font-medium">Nós</span>
                                </div>
                                <span className="text-2xl font-bold text-[var(--foreground)]">
                                    {systemStats.nodeCount}
                                </span>
                            </div>
                            <div className="glass-card p-4 rounded-xl">
                                <div className="flex items-center gap-2 text-[var(--foreground-muted)] mb-2">
                                    <GitBranch size={14} />
                                    <span className="text-xs uppercase font-medium">Conexões</span>
                                </div>
                                <span className="text-2xl font-bold text-[var(--foreground)]">
                                    {systemStats.edgeCount}
                                </span>
                            </div>
                            <div className="glass-card p-4 rounded-xl">
                                <div className="flex items-center gap-2 text-[var(--foreground-muted)] mb-2">
                                    <Database size={14} />
                                    <span className="text-xs uppercase font-medium">Tipos de Nós</span>
                                </div>
                                <span className="text-2xl font-bold text-[var(--foreground)]">
                                    {Object.keys(systemStats.nodeTypes).length}
                                </span>
                            </div>
                        </div>

                        {/* Node Types Breakdown */}
                        {Object.keys(systemStats.nodeTypes).length > 0 && (
                            <div className="mt-4 glass-card p-4 rounded-xl">
                                <h4 className="text-sm font-medium text-[var(--foreground-muted)] mb-3">Tipos de Nós Utilizados</h4>
                                <div className="flex flex-wrap gap-2">
                                    {Object.entries(systemStats.nodeTypes).map(([type, count]) => (
                                        <span
                                            key={type}
                                            className="px-3 py-1 rounded-full text-xs font-medium bg-[var(--primary)]/20 text-[var(--primary)]"
                                        >
                                            {type}: {count}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </section>

                    {/* Backend Summary */}
                    <section>
                        <h3 className="flex items-center gap-2 text-lg font-semibold text-[var(--foreground)] mb-4">
                            <Server size={18} className="text-[var(--secondary)]" />
                            Resumo do Backend
                        </h3>

                        {loading ? (
                            <div className="glass-card p-8 rounded-xl flex items-center justify-center">
                                <div className="animate-spin w-6 h-6 border-2 border-[var(--primary)] border-t-transparent rounded-full" />
                                <span className="ml-3 text-[var(--foreground-muted)]">Carregando informações...</span>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {/* Connection Status */}
                                <div className="glass-card p-4 rounded-xl">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <Activity size={18} className={backendInfo.isConnected ? 'text-[var(--success)]' : 'text-[var(--error)]'} />
                                            <div>
                                                <span className="font-medium text-[var(--foreground)]">Status da Conexão</span>
                                                <p className="text-sm text-[var(--foreground-muted)]">
                                                    Servidor: http://localhost:3001
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className={`w-3 h-3 rounded-full ${backendInfo.isConnected ? 'bg-[var(--success)] status-pulse' : 'bg-[var(--error)]'}`} />
                                            <span className={`text-sm font-medium ${backendInfo.isConnected ? 'text-[var(--success)]' : 'text-[var(--error)]'}`}>
                                                {backendInfo.isConnected ? 'Conectado' : 'Desconectado'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Backend Info */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="glass-card p-4 rounded-xl">
                                        <div className="flex items-center gap-2 text-[var(--foreground-muted)] mb-2">
                                            <Zap size={14} />
                                            <span className="text-xs uppercase font-medium">Versão</span>
                                        </div>
                                        <span className="text-xl font-bold text-[var(--foreground)]">
                                            v{backendInfo.version}
                                        </span>
                                    </div>
                                    <div className="glass-card p-4 rounded-xl">
                                        <div className="flex items-center gap-2 text-[var(--foreground-muted)] mb-2">
                                            <Clock size={14} />
                                            <span className="text-xs uppercase font-medium">Canais Ativos</span>
                                        </div>
                                        <span className="text-xl font-bold text-[var(--foreground)]">
                                            {backendInfo.channels.length}
                                        </span>
                                    </div>
                                </div>

                                {/* Channels List */}
                                {backendInfo.channels.length > 0 && (
                                    <div className="glass-card p-4 rounded-xl">
                                        <h4 className="text-sm font-medium text-[var(--foreground-muted)] mb-3">Canais Deployados</h4>
                                        <div className="space-y-2">
                                            {backendInfo.channels.map((channel: any) => (
                                                <div
                                                    key={channel.id}
                                                    onClick={() => handleLoadChannel(channel)}
                                                    className="flex items-center gap-2 p-2 rounded-lg bg-[var(--background)]/30 cursor-pointer hover:bg-[var(--glass-bg)] transition-colors"
                                                >
                                                    <div className="w-2 h-2 rounded-full bg-[var(--success)]" />
                                                    <span className="text-sm text-[var(--foreground)]">{channel.name}</span>
                                                    <span className={`text-xs ml-auto flex items-center gap-1 ${channel.frontend_schema ? 'text-[var(--success)]' : 'text-[var(--foreground-muted)]'}`}>
                                                        {channel.frontend_schema ? (
                                                            'Loadable'
                                                        ) : (
                                                            <>
                                                                <Eye size={12} />
                                                                Backend Only
                                                            </>
                                                        )}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Tech Stack */}
                                <div className="glass-card p-4 rounded-xl">
                                    <h4 className="text-sm font-medium text-[var(--foreground-muted)] mb-3">Tecnologias</h4>
                                    <div className="flex flex-wrap gap-2">
                                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-orange-500/20 text-orange-400">
                                            Rust
                                        </span>
                                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-purple-500/20 text-purple-400">
                                            Axum
                                        </span>
                                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400">
                                            Tokio
                                        </span>
                                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-400">
                                            Lua (mlua)
                                        </span>
                                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-cyan-500/20 text-cyan-400">
                                            React Flow
                                        </span>
                                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400">
                                            Next.js
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </section>
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-3 p-6 border-t border-[var(--glass-border)]">
                    <Button
                        variant="outline"
                        onClick={onClose}
                        className="glass border-[var(--glass-border)] text-[var(--foreground)] hover:bg-[var(--glass-bg)]"
                    >
                        Fechar
                    </Button>
                </div>
            </div>
        </div>
    );
}

