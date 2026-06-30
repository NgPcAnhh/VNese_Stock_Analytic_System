'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { User, getAccessToken, getRefreshToken, clearTokens, fetchWithAuth } from './auth';

const JUST_LOGGED_IN_KEY = 'stockpro:auth:just-logged-in';
const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (user: User) => void;
    logout: () => void;
    openAuthModal: () => void;
    closeAuthModal: () => void;
    isAuthModalOpen: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const pathname = usePathname();

    useEffect(() => {
        const loadUser = async () => {
            // Dù có access_token hay refresh_token đều thử load /me
            const token = getAccessToken();
            const refresh = typeof window !== 'undefined' ? localStorage.getItem('refresh_token') || document.cookie.includes('refresh_token') : false;

            if (!token && !refresh) {
                setIsLoading(false);
                return;
            }

            try {
                const res = await fetchWithAuth(`${API}/auth/me`);
                if (res.ok) {
                    const userData = await res.json();
                    setUser(userData);
                } else {
                    // Chỉ xoá token nếu lỗi xác thực (401/403)
                    if (res.status === 401 || res.status === 403) {
                        clearTokens();
                    }
                    setUser(null);
                }
            } catch (err) {
                // Không xoá token khi có lỗi kết nối mạng (ví dụ: server đang khởi động)
                setUser(null);
            } finally {
                setIsLoading(false);
            }
        };

        loadUser();
    }, []);

    useEffect(() => {
        if (!user) return;

        const LAST_ACTIVITY_KEY = 'stockpro:auth:last-activity';

        // Initialize last activity for the account session
        try {
            if (!localStorage.getItem(LAST_ACTIVITY_KEY)) {
                localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
            }
        } catch (e) {}

        const updateActivity = () => {
            try {
                localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
            } catch (e) {}
        };

        const events = ['mousemove', 'keydown', 'scroll', 'click', 'touchstart'];
        events.forEach(event => window.addEventListener(event, updateActivity, { passive: true }));

        // Kiểm tra mỗi 10 giây: nếu không thao tác trên bất kỳ tab nào trong 5 phút (300,000 ms) thì auto logout
        const checkInactivity = setInterval(() => {
            // Check if tokens were cleared by another tab (e.g. manual logout or other tab logged out)
            const token = getAccessToken();
            const refresh = getRefreshToken();
            if (!token && !refresh) {
                setUser(null);
                try {
                    localStorage.removeItem(LAST_ACTIVITY_KEY);
                } catch (e) {}
                return;
            }

            // Không áp dụng quy tắc 5 phút cho trang bảng điện
            if (pathname.startsWith('/price-board')) {
                return;
            }

            let lastActivity = Date.now();
            try {
                const stored = localStorage.getItem(LAST_ACTIVITY_KEY);
                if (stored) {
                    lastActivity = parseInt(stored, 10);
                }
            } catch (e) {}

            if (Date.now() - lastActivity > 5 * 60 * 1000) {
                // Tự động gọi API đăng xuất và xoá token
                const currentRefresh = typeof window !== 'undefined' && document.cookie.split('; ').find(row => row.startsWith('refresh_token='))?.split('=')[1];
                if (currentRefresh) {
                    fetch(`${API}/auth/logout`, {
                        method: 'POST',
                        headers: { 
                            'Content-Type': 'application/json',
                            'ngrok-skip-browser-warning': '69420'
                        },
                        body: JSON.stringify({ refresh_token: currentRefresh })
                    }).catch(() => {});
                }
                clearTokens();
                setUser(null);
                try {
                    localStorage.removeItem(LAST_ACTIVITY_KEY);
                } catch (e) {}
            }
        }, 10000);

        // Giữ phiên làm việc của người dùng hoạt động bằng cách gọi endpoint (/me) sau mỗi 5 phút
        // Gọi định kỳ để kích hoạt tự động refresh token trong auth.ts
        const keepAlive = setInterval(async () => {
            // Chỉ thực hiện keepalive nếu tab này là tab có hoạt động gần đây nhất để tránh gửi quá nhiều request từ các tab khác
            try {
                const stored = localStorage.getItem(LAST_ACTIVITY_KEY);
                if (stored) {
                    // Nếu không có hoạt động trong vòng 5 phút, bỏ qua keepalive
                    if (Date.now() - parseInt(stored, 10) > 5 * 60 * 1000) {
                        return;
                    }
                }
                await fetchWithAuth(`${API}/auth/me`);
            } catch (err) {
                // Ignore background fetch errors
            }
        }, 5 * 60 * 1000); // 5 minutes

        return () => {
            events.forEach(event => window.removeEventListener(event, updateActivity));
            clearInterval(checkInactivity);
            clearInterval(keepAlive);
        };
    }, [user, pathname]);

    const login = (newUser: User) => {
        setUser(newUser);
        try {
            sessionStorage.setItem(JUST_LOGGED_IN_KEY, '1');
        } catch {
            // ignore storage failures
        }
    };

    const logout = async () => {
        // Optionally alert Server to revoke refresh token
        const refresh = typeof window !== 'undefined' && document.cookie.split('; ').find(row => row.startsWith('refresh_token='))?.split('=')[1];

        if (refresh) {
            try {
                await fetch(`${API}/auth/logout`, {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'ngrok-skip-browser-warning': '69420'
                    },
                    body: JSON.stringify({ refresh_token: refresh })
                });
            } catch (e) {
                // ignore error on logout
            }
        }

        clearTokens();
        setUser(null);
        try {
            sessionStorage.removeItem(JUST_LOGGED_IN_KEY);
            localStorage.removeItem('stockpro:auth:last-activity');
        } catch {
            // ignore storage failures
        }
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                isAuthenticated: !!user,
                isLoading,
                login,
                logout,
                openAuthModal: () => setIsAuthModalOpen(true),
                closeAuthModal: () => setIsAuthModalOpen(false),
                isAuthModalOpen,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
