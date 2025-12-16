import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:3001/api', // Backend URL
    timeout: 5000,
    headers: {
        'Authorization': 'Bearer secret-123' // TODO: Use env var NEXT_PUBLIC_API_KEY
    }
});

export const deployChannel = async (channelConfig: any) => {
    try {
        const response = await api.post('/channels', channelConfig);
        return response.data;
    } catch (error) {
        console.error('Failed to deploy channel', error);
        throw error;
    }
};

export const listChannels = async () => {
    const response = await api.get('/channels');
    return response.data;
};

export interface LogEntry {
    timestamp: string;
    level: string;
    message: string;
    channel_id?: string;
}

export const getLogs = async (): Promise<LogEntry[]> => {
    const response = await api.get('/logs');
    return response.data;
};

export const testChannel = async (channelId: string, payloadType: string, payload: string) => {
    const response = await api.post(`/channels/${channelId}/test`, {
        payload_type: payloadType,
        payload
    });
    return response.data;
};
