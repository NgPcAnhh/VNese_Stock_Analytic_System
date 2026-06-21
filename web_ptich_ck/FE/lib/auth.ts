// lib/auth.ts
import Cookies from 'js-cookie';

const API_BASE_URL = '/api/v1/auth';

export interface User {
    id: number;
    email: string;
    full_name?: string;
    avatar_url?: string;
    role: string;
    permissions: string[];
    auth_provider: string;
    is_verified: boolean;
    is_totp_enabled?: boolean;
    created_at: string;
}

export interface AuthResponse {
    access_token: string;
    refresh_token: string;
    token_type: string;
    expires_in: number;
    user: User;
}

// Helper to decode JWT payload safely (works in browser & SSR/Node environments)
const decodeJwt = (token: string) => {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        let rawPayload = '';
        if (typeof window !== 'undefined') {
            rawPayload = window.atob(base64);
        } else {
            rawPayload = Buffer.from(base64, 'base64').toString('binary');
        }
        const jsonPayload = decodeURIComponent(
            rawPayload
                .split('')
                .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join('')
        );
        return JSON.parse(jsonPayload);
    } catch {
        return null;
    }
};

// Helper to check if token is expired
export const isTokenExpired = (token: string): boolean => {
    const payload = decodeJwt(token);
    if (!payload || !payload.exp) return true;
    // payload.exp is in seconds, Date.now() in ms
    // Subtract 10 seconds to allow network buffer
    return payload.exp * 1000 < Date.now() + 10000;
};

// Lấy tokens
export const getAccessToken = () => Cookies.get('access_token');
export const getRefreshToken = () => Cookies.get('refresh_token');

// Lưu tokens
export const setTokens = (access: string, refresh: string) => {
    let isAdmin = false;
    try {
        const payload = decodeJwt(access);
        if (payload && payload.role === 'admin') {
            isAdmin = true;
        }
    } catch (e) {
        // ignore
    }

    if (isAdmin) {
        // Admin gets session cookies (no expires date)
        Cookies.set('access_token', access, { secure: true, sameSite: 'strict' });
        Cookies.set('refresh_token', refresh, { secure: true, sameSite: 'strict' });
    } else {
        Cookies.set('access_token', access, { secure: true, sameSite: 'strict', expires: 1 }); // 1 day (auto-refresh via refresh_token)
        Cookies.set('refresh_token', refresh, { secure: true, sameSite: 'strict', expires: 7 }); // 7 days
    }
};

export const clearTokens = () => {
    Cookies.remove('access_token');
    Cookies.remove('refresh_token');
};

// Fetch wrapper with auto-refresh token
export const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
    let token = getAccessToken();

    // 1. Proactive check: if token is missing or expired
    if (!token || isTokenExpired(token)) {
        const refresh = getRefreshToken();
        if (refresh) {
            try {
                const resp = await fetch(`${API_BASE_URL}/refresh`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ refresh_token: refresh }),
                });
                if (resp.ok) {
                    const data: AuthResponse = await resp.json();
                    setTokens(data.access_token, data.refresh_token);
                    token = data.access_token;
                } else {
                    clearTokens();
                    token = undefined;
                }
            } catch (e) {
                clearTokens();
                token = undefined;
            }
        } else {
            clearTokens();
            token = undefined;
        }
    }

    const headers = new Headers(options.headers);
    if (token) {
        headers.set('Authorization', `Bearer ${token}`);
    }

    let response = await fetch(url, { ...options, headers });

    // 2. Passive check: if server returns 401 Unauthorized
    if (response.status === 401) {
        const refresh = getRefreshToken();
        if (refresh) {
            try {
                const resp = await fetch(`${API_BASE_URL}/refresh`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ refresh_token: refresh }),
                });
                if (resp.ok) {
                    const data: AuthResponse = await resp.json();
                    setTokens(data.access_token, data.refresh_token);
                    token = data.access_token;

                    // Retry original request
                    headers.set('Authorization', `Bearer ${token}`);
                    response = await fetch(url, { ...options, headers });
                } else {
                    clearTokens();
                }
            } catch (e) {
                clearTokens();
            }
        }
    }

    return response;
};
