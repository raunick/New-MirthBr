"use client";

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Security constants - from env or defaults
const MAX_LOGIN_ATTEMPTS = parseInt(process.env.NEXT_PUBLIC_MAX_LOGIN_ATTEMPTS || '5', 10);
const LOCKOUT_DURATION_MS = parseInt(process.env.NEXT_PUBLIC_LOCKOUT_DURATION_MINUTES || '15', 10) * 60 * 1000;
const SESSION_TIMEOUT_MS = parseInt(process.env.NEXT_PUBLIC_SESSION_TIMEOUT_MINUTES || '30', 10) * 60 * 1000;

// Get auth credentials from environment (case-insensitive username per OWASP)
const AUTH_USERNAME = (process.env.NEXT_PUBLIC_AUTH_USERNAME || 'admin').toLowerCase();
const AUTH_PASSWORD = process.env.NEXT_PUBLIC_AUTH_PASSWORD || 'admin123'; // Change in production!

interface AuthState {
    isAuthenticated: boolean;
    username: string | null;
    loginAttempts: number;
    lockedUntil: number | null;
    lastActivity: number;
    sessionToken: string | null;

    // Actions
    login: (username: string, password: string) => LoginResult;
    logout: () => void;
    checkSession: () => boolean;
    updateActivity: () => void;
    getRemainingLockoutTime: () => number;
}

export interface LoginResult {
    success: boolean;
    error?: string;
    attemptsRemaining?: number;
    lockedUntil?: number;
}

// Simple hash function for client-side password comparison
// In production, this should be done server-side with proper hashing
const simpleHash = (str: string): string => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16);
};

// Generate a pseudo-random session token
const generateSessionToken = (): string => {
    const array = new Uint8Array(32);
    if (typeof window !== 'undefined' && window.crypto) {
        window.crypto.getRandomValues(array);
    } else {
        // Fallback for SSR
        for (let i = 0; i < array.length; i++) {
            array[i] = Math.floor(Math.random() * 256);
        }
    }
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            isAuthenticated: false,
            username: null,
            loginAttempts: 0,
            lockedUntil: null,
            lastActivity: Date.now(),
            sessionToken: null,

            login: (username: string, password: string): LoginResult => {
                const state = get();
                const now = Date.now();

                // Check if account is locked
                if (state.lockedUntil && now < state.lockedUntil) {
                    const remainingMs = state.lockedUntil - now;
                    const remainingMinutes = Math.ceil(remainingMs / 60000);
                    return {
                        success: false,
                        error: `Conta bloqueada. Tente novamente em ${remainingMinutes} minuto(s).`,
                        lockedUntil: state.lockedUntil,
                    };
                }

                // Reset lockout if time has passed
                if (state.lockedUntil && now >= state.lockedUntil) {
                    set({ lockedUntil: null, loginAttempts: 0 });
                }

                // Validate input
                if (!username || !password) {
                    return {
                        success: false,
                        error: 'Usuário e senha são obrigatórios.',
                    };
                }

                // Validate password length per OWASP (min 8 chars)
                if (password.length < 8) {
                    return {
                        success: false,
                        error: 'Senha deve ter no mínimo 8 caracteres.',
                    };
                }

                // Case-insensitive username comparison (OWASP)
                const normalizedUsername = username.toLowerCase().trim();

                // Check credentials
                // IMPORTANT: Generic error message to prevent user enumeration
                const isValidCredentials =
                    normalizedUsername === AUTH_USERNAME &&
                    password === AUTH_PASSWORD;

                if (isValidCredentials) {
                    const sessionToken = generateSessionToken();
                    set({
                        isAuthenticated: true,
                        username: normalizedUsername,
                        loginAttempts: 0,
                        lockedUntil: null,
                        lastActivity: now,
                        sessionToken,
                    });
                    return { success: true };
                }

                // Failed login
                const newAttempts = state.loginAttempts + 1;
                const attemptsRemaining = MAX_LOGIN_ATTEMPTS - newAttempts;

                if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
                    // Lock the account
                    const lockUntil = now + LOCKOUT_DURATION_MS;
                    set({
                        loginAttempts: newAttempts,
                        lockedUntil: lockUntil,
                    });
                    return {
                        success: false,
                        // Generic error per OWASP - don't reveal which field is wrong
                        error: `Usuário ou senha inválidos. Conta bloqueada por ${LOCKOUT_DURATION_MS / 60000} minutos.`,
                        attemptsRemaining: 0,
                        lockedUntil: lockUntil,
                    };
                }

                set({ loginAttempts: newAttempts });
                return {
                    success: false,
                    // Generic error per OWASP - don't reveal which field is wrong
                    error: `Usuário ou senha inválidos. ${attemptsRemaining} tentativa(s) restante(s).`,
                    attemptsRemaining,
                };
            },

            logout: () => {
                set({
                    isAuthenticated: false,
                    username: null,
                    sessionToken: null,
                    lastActivity: 0,
                });
            },

            checkSession: (): boolean => {
                const state = get();

                if (!state.isAuthenticated || !state.sessionToken) {
                    return false;
                }

                const now = Date.now();
                const timeSinceActivity = now - state.lastActivity;

                // Session expired due to inactivity
                if (timeSinceActivity > SESSION_TIMEOUT_MS) {
                    set({
                        isAuthenticated: false,
                        username: null,
                        sessionToken: null,
                    });
                    return false;
                }

                return true;
            },

            updateActivity: () => {
                set({ lastActivity: Date.now() });
            },

            getRemainingLockoutTime: (): number => {
                const state = get();
                if (!state.lockedUntil) return 0;

                const remaining = state.lockedUntil - Date.now();
                return remaining > 0 ? remaining : 0;
            },
        }),
        {
            name: 'mirth-auth',
            // Only persist these fields (not sensitive data)
            partialize: (state) => ({
                isAuthenticated: state.isAuthenticated,
                username: state.username,
                lastActivity: state.lastActivity,
                sessionToken: state.sessionToken,
                loginAttempts: state.loginAttempts,
                lockedUntil: state.lockedUntil,
            }),
        }
    )
);
