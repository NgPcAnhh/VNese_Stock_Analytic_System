"use client";

import { useContext, useEffect, useId } from "react";
import { StockWebSocketContext } from "@/lib/StockWebSocketContext";

/**
 * Adapter hook that uses the global StockWebSocketContext.
 *
 * Each component calling this hook gets a unique subscription slot.
 * When updateSubscription is called, it registers the component's symbols globally.
 * On unmount, the component's symbols are automatically unsubscribed.
 */
export function useStockWebSocket() {
  const context = useContext(StockWebSocketContext);
  if (!context) {
    throw new Error("useStockWebSocket must be used within a StockWebSocketProvider");
  }

  const { connected, registerSubscription, unregisterSubscription } = context;
  const id = useId();

  const updateSubscription = (symbols: string[]) => {
    registerSubscription(id, symbols);
  };

  useEffect(() => {
    return () => {
      unregisterSubscription(id);
    };
  }, [id, unregisterSubscription]);

  return { connected, updateSubscription };
}
