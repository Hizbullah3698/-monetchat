
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

export class ApiError extends Error {
    constructor(public status: number, public message: string, public data?: any) {
        super(message);
        this.name = 'ApiError';
    }
}

async function fetchJson<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;

    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    const response = await fetch(url, { ...options, headers });

    // Handle 204 No Content
    if (response.status === 204) {
        return {} as T;
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new ApiError(response.status, data.error || response.statusText, data);
    }

    return data as T;
}

export const api = {
    get: <T>(endpoint: string, options?: RequestInit) => fetchJson<T>(endpoint, { ...options, method: 'GET' }),
    post: <T>(endpoint: string, body: any, options?: RequestInit) => fetchJson<T>(endpoint, { ...options, method: 'POST', body: JSON.stringify(body) }),
    put: <T>(endpoint: string, body: any, options?: RequestInit) => fetchJson<T>(endpoint, { ...options, method: 'PUT', body: JSON.stringify(body) }),
    patch: <T>(endpoint: string, body: any, options?: RequestInit) => fetchJson<T>(endpoint, { ...options, method: 'PATCH', body: JSON.stringify(body) }),
    delete: <T>(endpoint: string, options?: RequestInit) => fetchJson<T>(endpoint, { ...options, method: 'DELETE' }),
};
