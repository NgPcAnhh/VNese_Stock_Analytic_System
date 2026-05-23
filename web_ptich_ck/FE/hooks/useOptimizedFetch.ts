import { useCallback, useEffect, useRef, useState } from "react";

/**
 * useOptimizedFetch — Hook tối ưu fetch dữ liệu cho nhiều user:
 *
 * 1. Stale-while-revalidate: hiện data cũ ngay, fetch mới ngầm
 * 2. Visibility API: dừng polling khi tab ẩn → tiết kiệm bandwidth
 * 3. Dedup: chống gọi API trùng khi component remount nhanh
 * 4. Auto-refresh: interval chỉ chạy khi tab visible
 * 5. Race condition: bỏ qua response cũ khi fetch mới đã bắt đầu
 */

interface UseOptimizedFetchOptions<T> {
    /** URL to fetch */
    url: string;
    /** Auto-refresh interval in ms (0 = disabled). Default: 120_000 */
    refreshInterval?: number;
    /** Transform response JSON. Default: identity */
    transform?: (json: unknown) => T;
    /** Fetch on mount? Default: true */
    immediate?: boolean;
}

interface UseOptimizedFetchResult<T> {
    data: T | null;
    loading: boolean;
    error: string | null;
    refresh: () => void;
}

// Global dedup: nếu cùng URL đang fetch → trả về cùng promise
const _inflight = new Map<string, Promise<unknown>>();

export function useOptimizedFetch<T>({
    url,
    refreshInterval = 120_000,
    transform,
    immediate = true,
}: UseOptimizedFetchOptions<T>): UseOptimizedFetchResult<T> {
    const [data, setData] = useState<T | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Race-condition protection
    const fetchIdRef = useRef(0);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const visibleRef = useRef(true);

    const fetchData = useCallback(async () => {
        const id = ++fetchIdRef.current;

        // Dedup: nếu cùng URL đang fetch → chờ kết quả
        let promise = _inflight.get(url) as Promise<unknown> | undefined;
        if (!promise) {
            promise = fetch(url).then((res) => {
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                return res.json();
            });
            _inflight.set(url, promise);
            // Cleanup after resolve/reject
            promise.finally(() => _inflight.delete(url));
        }

        // Chỉ set loading nếu chưa có data (stale-while-revalidate)
        if (!data) setLoading(true);
        setError(null);

        try {
            const json = await promise;
            if (id !== fetchIdRef.current) return; // stale response
            const result = transform ? transform(json) : (json as T);
            setData(result);
        } catch (err: unknown) {
            if (id !== fetchIdRef.current) return;
            const msg = err instanceof Error ? err.message : "Fetch failed";
            setError(msg);
            console.error(`[useOptimizedFetch] ${url}:`, msg);
        } finally {
            if (id === fetchIdRef.current) setLoading(false);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [url, transform]);

    // Visibility API: dừng/resume polling khi tab ẩn/hiện
    useEffect(() => {
        const handleVisibility = () => {
            visibleRef.current = document.visibilityState === "visible";
            if (visibleRef.current && refreshInterval > 0) {
                // Refetch ngay khi tab quay lại
                fetchData();
            }
        };
        document.addEventListener("visibilitychange", handleVisibility);
        return () => document.removeEventListener("visibilitychange", handleVisibility);
    }, [fetchData, refreshInterval]);

    // Initial fetch
    useEffect(() => {
        if (immediate) fetchData();
    }, [fetchData, immediate]);

    // Auto-refresh interval — chỉ khi tab visible
    useEffect(() => {
        if (refreshInterval <= 0) return;

        intervalRef.current = setInterval(() => {
            if (visibleRef.current) fetchData();
        }, refreshInterval);

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [fetchData, refreshInterval]);

    return { data, loading, error, refresh: fetchData };
}
