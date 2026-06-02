"use client";

import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { useAuth } from "./AuthContext";
import { marketEvents } from "./socketEvents";
import { INDEX_CODES, CHART_INDEX_IDS } from "./priceBoardData";
import { safeFloat } from "./priceBoardUtils";

const WS_URL = "wss://stream2.simplize.vn/ws";
const SUB_BATCH = 500;
const RECONNECT_MS = 3_000;

interface StockWebSocketContextType {
  connected: boolean;
  registerSubscription: (id: string, symbols: string[]) => void;
  unregisterSubscription: (id: string) => void;
  getIndexHistory: (symbol: string) => number[];
  getIndexState: (symbol: string) => Record<string, unknown> | undefined;
  getAllIndexStates: () => Record<string, Record<string, unknown>>;
}

export const StockWebSocketContext = createContext<StockWebSocketContextType | undefined>(undefined);

export function StockWebSocketProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  // Dynamic component subscriptions: subscriberId -> list of symbols
  const subscriptionsRef = useRef<Map<string, string[]>>(new Map());
  const subscribedSetRef = useRef<Set<string>>(new Set());

  // Cached index states & sparkline history
  const indexHistoriesRef = useRef<Record<string, number[]>>({});
  const indexStatesRef = useRef<Record<string, Record<string, unknown>>>({});

  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const alive = useRef(true);

  // Send subscriptions to WS
  const sendSub = useCallback((ws: WebSocket, symbols: string[]) => {
    for (let i = 0; i < symbols.length; i += SUB_BATCH) {
      const batch = symbols.slice(i, i + SUB_BATCH);
      try {
        ws.send(JSON.stringify({ event: "sub", topic: "STOCK_RETIME_LIST", params: batch }));
      } catch { /* ws may be closing */ }
    }
  }, []);

  const sendUnsub = useCallback((ws: WebSocket, symbols: string[]) => {
    if (symbols.length === 0) return;
    try {
      ws.send(JSON.stringify({ event: "unsub", topic: "STOCK_RETIME_LIST", params: symbols }));
    } catch { /* noop */ }
  }, []);

  // Synchronize WebSocket subscriptions with the union of dynamic subscriptions + INDEX_CODES
  const syncSubscription = useCallback(() => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    const targetSet = new Set<string>(INDEX_CODES);
    for (const symbols of subscriptionsRef.current.values()) {
      symbols.forEach((s) => targetSet.add(s));
    }

    const oldSet = subscribedSetRef.current;
    const toUnsub = [...oldSet].filter((s) => !targetSet.has(s));
    const toSub = [...targetSet].filter((s) => !oldSet.has(s));

    if (toUnsub.length > 0) sendUnsub(ws, toUnsub);
    if (toSub.length > 0) sendSub(ws, toSub);

    subscribedSetRef.current = targetSet;
  }, [sendSub, sendUnsub]);

  // Connect to WS
  const connect = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) return;
    try {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        // Build initial subscription set: INDEX_CODES + all active dynamic subscriptions
        const targetSet = new Set<string>(INDEX_CODES);
        for (const symbols of subscriptionsRef.current.values()) {
          symbols.forEach((s) => targetSet.add(s));
        }
        sendSub(ws, Array.from(targetSet));
        subscribedSetRef.current = targetSet;
      };

      ws.onmessage = (evt) => {
        try {
          const payload = JSON.parse(evt.data as string);

          if (payload.event === "ping") {
            ws.send('{"event":"pong"}');
            return;
          }

          if (payload.topic === "quotes") {
            const data = payload.data;
            const items = Array.isArray(data) ? data : [data];
            for (const item of items) {
              const sym = item?.s as string | undefined;
              if (sym) {
                // Emit events to local listeners
                marketEvents.emit(sym, item);
                marketEvents.emit("__all__", item);

                // Accumulate index price history for charts
                if ((CHART_INDEX_IDS as readonly string[]).includes(sym) && item.p != null) {
                  const newPrice = safeFloat(item.p);
                  if (newPrice > 0) {
                    if (!indexHistoriesRef.current[sym]) {
                      indexHistoriesRef.current[sym] = [];
                    }
                    const hist = indexHistoriesRef.current[sym];
                    if (hist.length === 0 || hist[hist.length - 1] !== newPrice) {
                      hist.push(newPrice);
                      if (hist.length > 60) hist.shift();
                    }
                  }
                }

                // Update index state cache
                if ((INDEX_CODES as readonly string[]).includes(sym)) {
                  const prev = indexStatesRef.current[sym] || {};
                  indexStatesRef.current[sym] = { ...prev, ...item };
                }
              }
            }
          }
        } catch { /* malformed msg – ignore */ }
      };

      ws.onclose = () => {
        setConnected(false);
        wsRef.current = null;
        if (alive.current) {
          reconnectTimer.current = setTimeout(connect, RECONNECT_MS);
        }
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch { /* connection failed – onclose handles retry */ }
  }, [sendSub]);

  // Hook-like subscription management functions
  const registerSubscription = useCallback((id: string, symbols: string[]) => {
    subscriptionsRef.current.set(id, symbols);
    syncSubscription();
  }, [syncSubscription]);

  const unregisterSubscription = useCallback((id: string) => {
    subscriptionsRef.current.delete(id);
    syncSubscription();
  }, [syncSubscription]);

  const getIndexHistory = useCallback((symbol: string) => {
    return indexHistoriesRef.current[symbol] || [];
  }, []);

  const getIndexState = useCallback((symbol: string) => {
    return indexStatesRef.current[symbol];
  }, []);

  const getAllIndexStates = useCallback(() => {
    return indexStatesRef.current;
  }, []);

  // Manage WS connection based on auth state
  useEffect(() => {
    if (isLoading) return;

    if (isAuthenticated) {
      alive.current = true;
      connect();
    } else {
      alive.current = false;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      setConnected(false);
      // Clear data on logout
      indexHistoriesRef.current = {};
      indexStatesRef.current = {};
      subscriptionsRef.current.clear();
      subscribedSetRef.current.clear();
    }

    return () => {
      alive.current = false;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [isAuthenticated, isLoading, connect]);

  return (
    <StockWebSocketContext.Provider
      value={{
        connected,
        registerSubscription,
        unregisterSubscription,
        getIndexHistory,
        getIndexState,
        getAllIndexStates,
      }}
    >
      {children}
    </StockWebSocketContext.Provider>
  );
}

export function useStockWebSocketContext() {
  const context = useContext(StockWebSocketContext);
  if (!context) {
    throw new Error("useStockWebSocketContext must be used within a StockWebSocketProvider");
  }
  return context;
}
