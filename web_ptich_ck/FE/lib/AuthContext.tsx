'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
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
                const res = await fetchWithAuth('http://localhost:8000/api/v1/auth/me');
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
                await fetch('http://localhost:8000/api/v1/auth/logout', {
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
