"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { marketEvents } from "@/lib/socketEvents";

/**
 * Direct WebSocket connection to Simplize streaming service.
 *
 * Architecture (learned from phan_tich_co_phieu/sockets.py):
 *  - connect to wss://stream2.simplize.vn/ws
 *  - subscribe: {"event":"sub","topic":"STOCK_RETIME_LIST","params":[symbols]}
 *  - receive:   {"topic":"quotes","data":[{s,p,v,...},...]}
 *  - keep-alive: respond to {"event":"ping"} with {"event":"pong"}
 *
 * Each incoming quote is emitted on the per-symbol marketEvents bus
 * so that individual StockRow components pick up only their own symbol.
 */

const WS_URL = "wss://stream2.simplize.vn/ws";
const SUB_BATCH = 500;
const RECONNECT_MS = 3_000;

export function useStockWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const subscribedRef = useRef<Set<string>>(new Set());
  const pendingSubRef = useRef<string[]>([]);
  const [connected, setConnected] = useState(false);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const alive = useRef(true);

  // ── send subscription batches ──
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

  // ── connect / reconnect ──
  const connect = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) return;
    try {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        // Re-subscribe previously tracked symbols
        const syms = Array.from(subscribedRef.current);
        if (syms.length > 0) sendSub(ws, syms);
        // Flush any pending subscriptions queued before connection
        if (pendingSubRef.current.length > 0) {
          sendSub(ws, pendingSubRef.current);
          pendingSubRef.current.forEach((s) => subscribedRef.current.add(s));
          pendingSubRef.current = [];
        }
      };

      ws.onmessage = (evt) => {
        try {
          const payload = JSON.parse(evt.data as string);

          // Keep-alive
          if (payload.event === "ping") {
            ws.send('{"event":"pong"}');
            return;
          }

          // Quotes topic
          if (payload.topic === "quotes") {
            const data = payload.data;
            const items: Record<string, unknown>[] = Array.isArray(data) ? data : [data];
            for (const item of items) {
              const sym = item?.s as string | undefined;
              if (sym) {
                marketEvents.emit(sym, item);
                marketEvents.emit("__all__", item); // for global listeners (indices, breadth)
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

  // ── public: update subscription dynamically ──
  const updateSubscription = useCallback(
    (symbols: string[]) => {
      const ws = wsRef.current;
      const newSet = new Set(symbols);
      const oldSet = subscribedRef.current;

      const toUnsub = [...oldSet].filter((s) => !newSet.has(s));
      const toSub = [...newSet].filter((s) => !oldSet.has(s));

      if (ws && ws.readyState === WebSocket.OPEN) {
        if (toUnsub.length > 0) sendUnsub(ws, toUnsub);
        if (toSub.length > 0) sendSub(ws, toSub);
      } else {
        // Queue subscriptions for when connection opens
        pendingSubRef.current.push(...toSub);
      }

      subscribedRef.current = newSet;
    },
    [sendSub, sendUnsub],
  );

  // ── lifecycle ──
  useEffect(() => {
    alive.current = true;
    connect();
    return () => {
      alive.current = false;
      clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [connect]);

  return { connected, updateSubscription };
}
