'use client';

import { useCallback } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1';

export interface StockAlert {
    id: number;
    ticker: string;
    condition_type: 'GREATER_THAN' | 'LESS_THAN' | string;
    target_price: number;
    status: 'ACTIVE' | 'TRIGGERED' | 'DISMISSED' | string;
    created_at: string;
    triggered_at: string | null;
}

function getOrCreateSessionId(): string {
    const key = 'session_id';
    const existing = localStorage.getItem(key);
    if (existing) return existing;
    const generated = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(key, generated);
    return generated;
}

async function toErrorMessage(res: Response): Promise<string> {
    try {
        const data = await res.json();
        if (typeof data?.detail === 'string') return data.detail;
    } catch {
        // noop
    }
    return `Request failed (${res.status})`;
}

export function useAlerts() {
    const listAlerts = useCallback(async (): Promise<StockAlert[]> => {
        const sessionId = getOrCreateSessionId();
        const res = await fetch(`${API}/alerts?session_id=${encodeURIComponent(sessionId)}`, {
            cache: 'no-store',
        });
        if (!res.ok) throw new Error(await toErrorMessage(res));
        return (await res.json()) as StockAlert[];
    }, []);

    const createAlert = useCallback(
        async (payload: { ticker: string; condition_type: string; target_price: number }): Promise<StockAlert> => {
            const res = await fetch(`${API}/alerts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...payload,
                    session_id: getOrCreateSessionId(),
                }),
            });
            if (!res.ok) throw new Error(await toErrorMessage(res));
            return (await res.json()) as StockAlert;
        },
        [],
    );

    const updateAlert = useCallback(
        async (
            alertId: number,
            payload: { condition_type?: string; target_price?: number; status?: 'ACTIVE' | 'TRIGGERED' | 'DISMISSED' },
        ): Promise<StockAlert> => {
            const sessionId = getOrCreateSessionId();
            const res = await fetch(`${API}/alerts/${alertId}?session_id=${encodeURIComponent(sessionId)}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (!res.ok) throw new Error(await toErrorMessage(res));
            return (await res.json()) as StockAlert;
        },
        [],
    );

    const deleteAlert = useCallback(async (alertId: number): Promise<void> => {
        const sessionId = getOrCreateSessionId();
        const res = await fetch(`${API}/alerts/${alertId}?session_id=${encodeURIComponent(sessionId)}`, {
            method: 'DELETE',
        });
        if (!res.ok) throw new Error(await toErrorMessage(res));
    }, []);

    return {
        getOrCreateSessionId,
        listAlerts,
        createAlert,
        updateAlert,
        deleteAlert,
    };
}
