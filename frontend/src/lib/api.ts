import axios from 'axios';

// Get API configuration from environment variables
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
const API_KEY = process.env.NEXT_PUBLIC_API_KEY || 'dev-key-change-in-production-32chars';

// Warn if using development key
if (typeof window !== 'undefined') {
    if (!process.env.NEXT_PUBLIC_API_KEY) {
        console.warn('⚠️ NEXT_PUBLIC_API_KEY not set. Using development key. Set this in production!');
    }
    if (process.env.NODE_ENV === 'production' && !process.env.NEXT_PUBLIC_API_KEY) {
        console.error('🚨 CRITICAL: API key not configured in production environment!');
    }
}

const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000,
    headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
    }
});

// Add response interceptor for error handling
api.interceptors.response.use(
    response => response,
    error => {
        // Don't log sensitive data
        if (error.response) {
            console.error(`API Error: ${error.response.status} - ${error.response.data?.message || 'Unknown error'}`);
        } else if (error.request) {
            console.error('API Error: No response received');
        } else {
            console.error('API Error: Request setup failed');
        }
        return Promise.reject(error);
    }
);

export const deployChannel = async (channelConfig: unknown) => {
    try {
        const response = await api.post('/channels', channelConfig);
        return response.data;
    } catch (error) {
        console.error('Failed to deploy channel');
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
    // Validate inputs before sending
    const validPayloadTypes = ['hl7', 'fhir', 'json', 'xml', 'text', 'raw'];
    if (!validPayloadTypes.includes(payloadType.toLowerCase())) {
        throw new Error(`Invalid payload type. Allowed: ${validPayloadTypes.join(', ')}`);
    }

    if (!payload.trim()) {
        throw new Error('Payload cannot be empty');
    }

    const response = await api.post(`/channels/${channelId}/test`, {
        payload_type: payloadType,
        payload
    });
    return response.data;
};

export default api;

