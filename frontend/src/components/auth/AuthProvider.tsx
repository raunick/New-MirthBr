"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';

interface AuthProviderProps {
    children: React.ReactNode;
    onLogout?: () => void;
}

/**
 * AuthProvider component that wraps the application and manages session state.
 * 
 * Features:
 * - Automatic session timeout detection
 * - Activity tracking (mouse, keyboard, touch)
 * - Periodic session validation
 * - Clean logout handling
 */
export default function AuthProvider({ children, onLogout }: AuthProviderProps) {
    const { isAuthenticated, checkSession, updateActivity, logout } = useAuthStore();
    const [isClient, setIsClient] = useState(false);

    // Handle hydration
    useEffect(() => {
        setIsClient(true);
    }, []);

    // Session validation on mount and periodically
    useEffect(() => {
        if (!isClient) return;

        const validateSession = () => {
            if (isAuthenticated && !checkSession()) {
                console.warn('Session expired due to inactivity');
                logout();
                onLogout?.();
            }
        };

        // Check session every minute
        validateSession();
        const interval = setInterval(validateSession, 60000);

        return () => clearInterval(interval);
    }, [isClient, isAuthenticated, checkSession, logout, onLogout]);

    // Track user activity
    const handleActivity = useCallback(() => {
        if (isAuthenticated) {
            updateActivity();
        }
    }, [isAuthenticated, updateActivity]);

    useEffect(() => {
        if (!isClient) return;

        // Activity events
        const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];

        // Throttle activity updates
        let lastUpdate = 0;
        const throttledHandler = () => {
            const now = Date.now();
            if (now - lastUpdate > 30000) { // Update at most every 30 seconds
                lastUpdate = now;
                handleActivity();
            }
        };

        events.forEach(event => {
            window.addEventListener(event, throttledHandler, { passive: true });
        });

        return () => {
            events.forEach(event => {
                window.removeEventListener(event, throttledHandler);
            });
        };
    }, [isClient, handleActivity]);

    // Warning before session expires
    useEffect(() => {
        if (!isClient || !isAuthenticated) return;

        // Warn 5 minutes before expiry
        const checkExpiry = () => {
            const state = useAuthStore.getState();
            const timeSinceActivity = Date.now() - state.lastActivity;
            const sessionTimeout = parseInt(process.env.NEXT_PUBLIC_SESSION_TIMEOUT_MINUTES || '30', 10) * 60 * 1000;
            const warningThreshold = sessionTimeout - (5 * 60 * 1000); // 5 minutes before

            if (timeSinceActivity >= warningThreshold && timeSinceActivity < sessionTimeout) {
                const remainingMs = sessionTimeout - timeSinceActivity;
                const remainingMinutes = Math.ceil(remainingMs / 60000);
                console.warn(`⚠️ Session expires in ${remainingMinutes} minute(s)`);
            }
        };

        const interval = setInterval(checkExpiry, 60000);
        return () => clearInterval(interval);
    }, [isClient, isAuthenticated]);

    return <>{children}</>;
}
