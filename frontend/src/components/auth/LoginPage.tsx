"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useAuthStore, LoginResult } from '@/stores/useAuthStore';
import { Eye, EyeOff, Lock, User, AlertCircle, Loader2, Shield } from 'lucide-react';

interface LoginPageProps {
    onLoginSuccess: () => void;
}

export default function LoginPage({ onLoginSuccess }: LoginPageProps) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [lockoutTimer, setLockoutTimer] = useState<number>(0);

    const { login, getRemainingLockoutTime, lockedUntil } = useAuthStore();

    // Update lockout timer
    useEffect(() => {
        if (!lockedUntil) {
            setLockoutTimer(0);
            return;
        }

        const updateTimer = () => {
            const remaining = getRemainingLockoutTime();
            setLockoutTimer(remaining);
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    }, [lockedUntil, getRemainingLockoutTime]);

    const formatLockoutTime = (ms: number): string => {
        const seconds = Math.ceil(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    };

    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        // Simulate network delay for security (timing attack mitigation)
        await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 500));

        const result: LoginResult = login(username, password);

        setIsLoading(false);

        if (result.success) {
            onLoginSuccess();
        } else {
            setError(result.error || 'Erro ao fazer login');
            // Clear password field on failed attempt
            setPassword('');
        }
    }, [username, password, login, onLoginSuccess]);

    const isLocked = lockoutTimer > 0;

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a]">
            {/* Background decoration */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl" />
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl" />
            </div>

            <div className="relative w-full max-w-md mx-4">
                {/* Logo and Title */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] mb-4 shadow-lg shadow-purple-500/25">
                        <Shield className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2">
                        Mirth<span className="gradient-text">BR</span>
                    </h1>
                    <p className="text-[var(--foreground-muted)]">
                        Healthcare Integration Engine
                    </p>
                </div>

                {/* Login Card */}
                <div className="glass-card p-8">
                    <h2 className="text-xl font-semibold text-white mb-6 text-center">
                        Acesse sua conta
                    </h2>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Error Message */}
                        {error && (
                            <div className="flex items-start gap-3 p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400">
                                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                                <p className="text-sm">{error}</p>
                            </div>
                        )}

                        {/* Lockout Warning */}
                        {isLocked && (
                            <div className="flex items-center gap-3 p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-yellow-400">
                                <Lock className="w-5 h-5 flex-shrink-0" />
                                <div>
                                    <p className="text-sm font-medium">Conta bloqueada temporariamente</p>
                                    <p className="text-sm opacity-80">
                                        Tente novamente em {formatLockoutTime(lockoutTimer)}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Username Field */}
                        <div className="space-y-2">
                            <label htmlFor="username" className="block text-sm font-medium text-[var(--foreground-muted)]">
                                Usuário
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <User className="h-5 w-5 text-[var(--foreground-muted)]" />
                                </div>
                                <input
                                    id="username"
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    disabled={isLocked || isLoading}
                                    autoComplete="username"
                                    autoCapitalize="none"
                                    spellCheck="false"
                                    className="w-full pl-10 pr-4 py-3 rounded-lg bg-[var(--background)] border border-[var(--glass-border)] text-white placeholder-[var(--foreground-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    placeholder="Digite seu usuário"
                                />
                            </div>
                        </div>

                        {/* Password Field */}
                        <div className="space-y-2">
                            <label htmlFor="password" className="block text-sm font-medium text-[var(--foreground-muted)]">
                                Senha
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-[var(--foreground-muted)]" />
                                </div>
                                <input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    disabled={isLocked || isLoading}
                                    autoComplete="current-password"
                                    className="w-full pl-10 pr-12 py-3 rounded-lg bg-[var(--background)] border border-[var(--glass-border)] text-white placeholder-[var(--foreground-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    placeholder="Digite sua senha"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    disabled={isLocked || isLoading}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-[var(--foreground-muted)] hover:text-white transition-colors disabled:opacity-50"
                                    tabIndex={-1}
                                >
                                    {showPassword ? (
                                        <EyeOff className="h-5 w-5" />
                                    ) : (
                                        <Eye className="h-5 w-5" />
                                    )}
                                </button>
                            </div>
                            <p className="text-xs text-[var(--foreground-muted)]">
                                Mínimo de 8 caracteres
                            </p>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isLocked || isLoading || !username || !password}
                            className="w-full py-3 px-4 rounded-lg bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] text-white font-medium hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2 focus:ring-offset-[var(--background)] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Entrando...
                                </>
                            ) : isLocked ? (
                                <>
                                    <Lock className="w-5 h-5" />
                                    Conta Bloqueada
                                </>
                            ) : (
                                'Entrar'
                            )}
                        </button>
                    </form>

                    {/* Security Notice */}
                    <div className="mt-6 pt-6 border-t border-[var(--glass-border)]">
                        <p className="text-xs text-center text-[var(--foreground-muted)]">
                            🔒 Conexão segura • Sessão expira após 30 minutos de inatividade
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <p className="mt-6 text-center text-sm text-[var(--foreground-muted)]">
                    MirthBR v0.1.0 • Healthcare Integration Engine
                </p>
            </div>
        </div>
    );
}
