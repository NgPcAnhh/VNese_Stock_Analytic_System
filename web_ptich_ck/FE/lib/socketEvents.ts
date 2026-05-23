/**
 * Lightweight pub/sub event bus for per-symbol real-time updates.
 * Each StockRow subscribes to its own symbol — avoids re-rendering the entire table.
 */
type Listener = (data: Record<string, unknown>) => void;

const listeners = new Map<string, Set<Listener>>();

export const marketEvents = {
  on(key: string, callback: Listener) {
    if (!listeners.has(key)) listeners.set(key, new Set());
    listeners.get(key)!.add(callback);
    return () => {
      const set = listeners.get(key);
      if (set) {
        set.delete(callback);
        if (set.size === 0) listeners.delete(key);
      }
    };
  },
  emit(key: string, data: Record<string, unknown>) {
    listeners.get(key)?.forEach((cb) => cb(data));
  },
};
