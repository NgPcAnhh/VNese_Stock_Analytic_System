// lib/auth.ts
import Cookies from 'js-cookie';

const API_BASE_URL = 'http://localhost:8000/api/v1/auth';

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

// Lấy tokens
export const getAccessToken = () => Cookies.get('access_token');
export const getRefreshToken = () => Cookies.get('refresh_token');

// Lưu tokens
export const setTokens = (access: string, refresh: string) => {
    Cookies.set('access_token', access, { secure: true, sameSite: 'strict', expires: 1 }); // 1 day (auto-refresh via refresh_token)
    Cookies.set('refresh_token', refresh, { secure: true, sameSite: 'strict', expires: 7 }); // 7 days
};

export const clearTokens = () => {
    Cookies.remove('access_token');
    Cookies.remove('refresh_token');
};

// Fetch wrapper with auto-refresh token
export const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
    let token = getAccessToken();

    if (!token) {
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
                }
            } catch (e) {
                clearTokens();
            }
        }
    }

    const headers = new Headers(options.headers);
    if (token) {
        headers.set('Authorization', `Bearer ${token}`);
    }

    return fetch(url, { ...options, headers });
};
