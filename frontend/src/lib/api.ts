import axios, { AxiosError } from 'axios';

// Get API configuration from environment variables
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
const API_KEY = process.env.NEXT_PUBLIC_API_KEY || 'dev-key-change-in-production-32chars';

// Security warnings (client-side only)
if (typeof window !== 'undefined') {
    if (!process.env.NEXT_PUBLIC_API_KEY) {
        console.warn('⚠️ NEXT_PUBLIC_API_KEY not set. Using development key.');
    }
    if (process.env.NODE_ENV === 'production' && !process.env.NEXT_PUBLIC_API_KEY) {
        console.error('🚨 CRITICAL: API key not configured in production!');
    }
}

/**
 * Custom API Error class with user-friendly messages
 */
export class ApiError extends Error {
    public readonly code: string;
    public readonly statusCode: number;
    public readonly errorId?: string;
    public readonly userMessage: string;

    constructor(
        message: string,
        code: string,
        statusCode: number,
        userMessage?: string,
        errorId?: string
    ) {
        super(message);
        this.name = 'ApiError';
        this.code = code;
        this.statusCode = statusCode;
        this.errorId = errorId;
        this.userMessage = userMessage || this.getDefaultUserMessage(statusCode);
    }

    private getDefaultUserMessage(statusCode: number): string {
        switch (statusCode) {
            case 400:
                return 'Dados inválidos. Verifique os campos e tente novamente.';
            case 401:
                return 'Não autorizado. Faça login novamente.';
            case 403:
                return 'Acesso negado. Você não tem permissão para esta ação.';
            case 404:
                return 'Recurso não encontrado.';
            case 408:
            case 504:
                return 'O servidor demorou muito para responder. Tente novamente.';
            case 429:
                return 'Muitas requisições. Aguarde alguns segundos e tente novamente.';
            case 500:
                return 'Erro interno do servidor. Tente novamente mais tarde.';
            case 502:
            case 503:
                return 'Servidor indisponível. Tente novamente em alguns minutos.';
            default:
                if (statusCode >= 400 && statusCode < 500) {
                    return 'Erro na requisição. Verifique os dados e tente novamente.';
                }
                if (statusCode >= 500) {
                    return 'Erro no servidor. Entre em contato com o suporte.';
                }
                return 'Erro desconhecido. Tente novamente.';
        }
    }
}

/**
 * Parse error response from API
 */
function parseApiError(error: AxiosError): ApiError {
    if (error.response) {
        const data = error.response.data as Record<string, unknown> | undefined;
        const statusCode = error.response.status;
        const message = data?.message as string || error.message;
        const code = data?.error as string || 'UNKNOWN_ERROR';
        const errorId = data?.error_id as string | undefined;

        return new ApiError(message, code, statusCode, undefined, errorId);
    }

    if (error.request) {
        // Network error - no response received
        if (error.code === 'ECONNABORTED') {
            return new ApiError(
                'Request timeout',
                'TIMEOUT',
                408,
                'O servidor demorou muito para responder. Verifique sua conexão.'
            );
        }
        return new ApiError(
            'Network error',
            'NETWORK_ERROR',
            0,
            'Erro de conexão. Verifique se o servidor está funcionando.'
        );
    }

    return new ApiError(
        error.message || 'Unknown error',
        'CLIENT_ERROR',
        0,
        'Erro ao preparar a requisição.'
    );
}

// Create axios instance with secure defaults
const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000,
    headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
    },
    // Don't send cookies cross-origin
    withCredentials: false,
});

// Response interceptor for centralized error handling
api.interceptors.response.use(
    response => response,
    (error: AxiosError) => {
        const apiError = parseApiError(error);

        // Log error safely (no sensitive data)
        console.error(
            `API Error [${apiError.code}]: ${apiError.statusCode} - ${apiError.message}`,
            apiError.errorId ? `(Error ID: ${apiError.errorId})` : ''
        );

        return Promise.reject(apiError);
    }
);

// Request interceptor to add timestamp for cache busting
api.interceptors.request.use(
    config => {
        // Add request timestamp for debugging
        config.headers['X-Request-Time'] = new Date().toISOString();
        return config;
    },
    error => Promise.reject(error)
);

export const deployChannel = async (payload: { channel: unknown, frontend_schema: unknown }) => {
    try {
        const response = await api.post('/channels', payload);
        return response.data;
    } catch (error) {
        if (error instanceof ApiError) {
            throw error;
        }
        throw new ApiError(
            'Failed to deploy channel',
            'DEPLOY_ERROR',
            500,
            'Erro ao fazer deploy do canal. Tente novamente.'
        );
    }
};

export const listChannels = async () => {
    try {
        const response = await api.get('/channels');
        return response.data;
    } catch (error) {
        if (error instanceof ApiError) {
            throw error;
        }
        throw new ApiError(
            'Failed to list channels',
            'LIST_ERROR',
            500,
            'Erro ao listar canais.'
        );
    }
};

export interface LogEntry {
    timestamp: string;
    level: string;
    message: string;
    channel_id?: string;
}

export const getLogs = async (): Promise<LogEntry[]> => {
    try {
        const response = await api.get('/logs');
        return response.data;
    } catch (error) {
        if (error instanceof ApiError) {
            throw error;
        }
        throw new ApiError(
            'Failed to get logs',
            'LOGS_ERROR',
            500,
            'Erro ao buscar logs.'
        );
    }
};

const VALID_PAYLOAD_TYPES = ['hl7', 'fhir', 'json', 'xml', 'text', 'raw'] as const;
const MAX_PAYLOAD_SIZE = 1024 * 1024; // 1MB

export const testChannel = async (channelId: string, payloadType: string, payload: string) => {
    // Client-side validation
    const normalizedType = payloadType.toLowerCase();
    if (!VALID_PAYLOAD_TYPES.includes(normalizedType as typeof VALID_PAYLOAD_TYPES[number])) {
        throw new ApiError(
            `Invalid payload type: ${payloadType}`,
            'VALIDATION_ERROR',
            400,
            `Tipo de payload inválido. Use: ${VALID_PAYLOAD_TYPES.join(', ')}`
        );
    }

    if (!payload.trim()) {
        throw new ApiError(
            'Payload cannot be empty',
            'VALIDATION_ERROR',
            400,
            'O payload não pode estar vazio.'
        );
    }

    if (payload.length > MAX_PAYLOAD_SIZE) {
        throw new ApiError(
            'Payload too large',
            'VALIDATION_ERROR',
            400,
            `Payload muito grande. Máximo: ${MAX_PAYLOAD_SIZE / 1024}KB`
        );
    }

    if (!channelId || channelId === 'undefined') {
        throw new ApiError(
            'Invalid channel ID',
            'VALIDATION_ERROR',
            400,
            'ID do canal inválido. Faça deploy do canal primeiro.'
        );
    }

    try {
        const response = await api.post(`/channels/${channelId}/test`, {
            payload_type: normalizedType,
            payload
        });
        return response.data;
    } catch (error) {
        if (error instanceof ApiError) {
            throw error;
        }
        throw new ApiError(
            'Failed to test channel',
            'TEST_ERROR',
            500,
            'Erro ao testar o canal. Verifique se o canal foi deployado.'
        );
    }
};

/**
 * Format error for display to user
 */
export const formatErrorMessage = (error: unknown): string => {
    if (error instanceof ApiError) {
        let message = error.userMessage;
        if (error.errorId) {
            message += ` (Código: ${error.errorId})`;
        }
        return message;
    }
    if (error instanceof Error) {
        return error.message;
    }
    return 'Erro desconhecido. Tente novamente.';
};

export default api;


