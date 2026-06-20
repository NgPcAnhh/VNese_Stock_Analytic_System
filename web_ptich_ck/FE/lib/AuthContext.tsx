'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { User, getAccessToken, clearTokens, fetchWithAuth } from './auth';

const JUST_LOGGED_IN_KEY = 'stockpro:auth:just-logged-in';

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
                const res = await fetchWithAuth('/api/v1/auth/me');
                if (res.ok) {
                    const userData = await res.json();
                    setUser(userData);
                } else {
                    clearTokens();
                    setUser(null);
                }
            } catch (err) {
                clearTokens();
                setUser(null);
            } finally {
                setIsLoading(false);
            }
        };

        loadUser();
    }, []);

    useEffect(() => {
        if (!user) return;

        let lastActivity = Date.now();

        const updateActivity = () => {
            lastActivity = Date.now();
        };

        const events = ['mousemove', 'keydown', 'scroll', 'click', 'touchstart'];
        events.forEach(event => window.addEventListener(event, updateActivity, { passive: true }));

        // Kiểm tra mỗi 10 giây: nếu không thao tác trong 5 phút (300,000 ms) thì auto logout
        const checkInactivity = setInterval(() => {
            // Không áp dụng quy tắc 5 phút cho trang bảng điện
            if (pathname.startsWith('/price-board')) {
                return;
            }

            if (Date.now() - lastActivity > 5 * 60 * 1000) {
                // Tự động gọi API đăng xuất và xoá token
                const refresh = typeof window !== 'undefined' && document.cookie.split('; ').find(row => row.startsWith('refresh_token='))?.split('=')[1];
                if (refresh) {
                    fetch('/api/v1/auth/logout', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ refresh_token: refresh })
                    }).catch(() => {});
                }
                clearTokens();
                setUser(null);
            }
        }, 10000);

        // Giữ phiên làm việc của người dùng hoạt động bằng cách gọi endpoint (/me) sau mỗi 5 phút
        // Gọi định kỳ để kích hoạt tự động refresh token trong auth.ts
        const keepAlive = setInterval(async () => {
            try {
                await fetchWithAuth('/api/v1/auth/me');
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
                await fetch('/api/v1/auth/logout', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
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
