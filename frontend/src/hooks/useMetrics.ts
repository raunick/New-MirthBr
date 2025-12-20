import { API_KEY } from '@/lib/api';
import { create } from 'zustand';
import { useAuthStore } from '../stores/useAuthStore';
import { useEffect, useRef, useState } from 'react';

export interface MetricUpdate {
    channel_id: string;
    message_id?: string;
    status: 'PROCESSING' | 'SENT' | 'ERROR' | 'FILTERED';
    timestamp: string;
}

interface MetricsState {
    updates: MetricUpdate[];
    stats: Record<string, { processed: number; sent: number; errors: number }>;
    isConnected: boolean;
}

export const useMetrics = () => {
    const { sessionToken } = useAuthStore();
    const [state, setState] = useState<MetricsState>({
        updates: [],
        stats: {},
        isConnected: false,
    });
    const socketRef = useRef<WebSocket | null>(null);

    useEffect(() => {
        if (!sessionToken) return;

        const wsUrl = `ws://localhost:3001/api/ws/metrics?token=${API_KEY}`;
        const ws = new WebSocket(wsUrl);
        socketRef.current = ws;

        ws.onopen = () => {
            setState(prev => ({ ...prev, isConnected: true }));
        };

        ws.onclose = () => {
            setState(prev => ({ ...prev, isConnected: false }));
        };

        ws.onmessage = (event) => {
            try {
                const update: MetricUpdate = JSON.parse(event.data);
                setState(prev => {
                    const newStats = { ...prev.stats };
                    if (!newStats[update.channel_id]) {
                        newStats[update.channel_id] = { processed: 0, sent: 0, errors: 0 };
                    }

                    if (update.status === 'PROCESSING') newStats[update.channel_id].processed++;
                    if (update.status === 'SENT') newStats[update.channel_id].sent++;
                    if (update.status === 'ERROR') newStats[update.channel_id].errors++;

                    return {
                        ...prev,
                        updates: [update, ...prev.updates].slice(0, 50), // Keep last 50
                        stats: newStats,
                    };
                });
            } catch (e) {
                console.error("Failed to parse metric update", e);
            }
        };

        return () => {
            ws.close();
        };
    }, [sessionToken]);

    return state;
};
