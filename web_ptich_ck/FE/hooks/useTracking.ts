'use client';

import { useCallback, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1';

// ── Session ID — tạo một lần per browser tab ──────────────────────
function getSessionId(): string {
    if (typeof window === 'undefined') return 'ssr-anonymous';
    let sid = sessionStorage.getItem('_sid');
    if (!sid) {
        sid = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
        sessionStorage.setItem('_sid', sid);
    }
    return sid;
}

// ── Fire-and-forget POST helper ───────────────────────────────────
function firePost(path: string, body: object): void {
    fetch(`${API}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        // keepalive cho phép request hoàn thành khi tab đóng (dùng cho session/end)
        keepalive: true,
    }).catch(() => {
        // Bỏ qua lỗi — tracking không được làm gián đoạn UX
    });
}

// ────────────────────────────────────────────────────────────────────
// Hook chính
// ────────────────────────────────────────────────────────────────────
export function useTracking(userId?: number | null) {
    const sessionId = typeof window !== 'undefined' ? getSessionId() : 'ssr-anonymous';

    // ── Tìm kiếm chung (tin tức / từ khoá) ───────────────────────
    const trackSearch = useCallback(
        (keyword: string) => {
            if (!keyword.trim()) return;
            firePost('/tracking/search', { keyword: keyword.trim(), session_id: sessionId });
        },
        [sessionId],
    );

    // ── Tìm kiếm mã cổ phiếu ─────────────────────────────────────
    const trackStockSearch = useCallback(
        (keyword: string) => {
            if (!keyword.trim()) return;
            firePost('/tracking/stock-search', { keyword: keyword.trim(), session_id: sessionId });
        },
        [sessionId],
    );

    // ── Click vào sidebar ─────────────────────────────────────────
    const trackSidebarClick = useCallback(
        (menuName: string, menuHref: string) => {
            firePost('/tracking/sidebar-click', {
                menu_name: menuName,
                menu_href: menuHref,
                session_id: sessionId,
                user_id: userId ?? null,
            });
        },
        [sessionId, userId],
    );

    // ── Page view ─────────────────────────────────────────────────
    const trackPageView = useCallback(
        (pagePath: string, pageTitle?: string, referrer?: string) => {
            firePost('/tracking/page-view', {
                page_path: pagePath,
                page_title: pageTitle ?? null,
                session_id: sessionId,
                user_id: userId ?? null,
                referrer: referrer ?? null,
            });
        },
        [sessionId, userId],
    );

    // ── Error logging ─────────────────────────────────────────────
    const trackError = useCallback(
        (errorMessage: string, opts?: { errorType?: string; stackTrace?: string; pageUrl?: string }) => {
            firePost('/tracking/error', {
                error_type: opts?.errorType ?? 'frontend',
                error_message: errorMessage,
                stack_trace: opts?.stackTrace ?? null,
                page_url: opts?.pageUrl ?? (typeof window !== 'undefined' ? window.location.href : null),
                session_id: sessionId,
                user_id: userId ?? null,
            });
        },
        [sessionId, userId],
    );

    // ── Analysis view ─────────────────────────────────────────────
    const trackAnalysisView = useCallback(
        (ticker: string) => {
            if (!ticker.trim()) return;
            firePost('/tracking/analysis-view', {
                ticker: ticker.trim().toUpperCase(),
                session_id: sessionId,
                user_id: userId ?? null,
            });
        },
        [sessionId, userId],
    );

    return { trackSearch, trackStockSearch, trackSidebarClick, trackPageView, trackError, trackAnalysisView };
}

// ────────────────────────────────────────────────────────────────────
// Hook quản lý vòng đời phiên (session lifecycle)
// Dùng một lần duy nhất tại MainLayout
// ────────────────────────────────────────────────────────────────────
export function useSessionTracking(userId?: number | null) {
    const sessionId = typeof window !== 'undefined' ? getSessionId() : 'ssr-anonymous';
    const startedAt = useRef<number>(Date.now());
    const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const sessionStartedRef = useRef(false);

    // Khởi động session khi mount lần đầu
    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (sessionStartedRef.current) return;
        sessionStartedRef.current = true;

        // Bắt đầu session
        fetch(`${API}/tracking/session/start`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                session_id: sessionId,
                user_id: userId ?? null,
            }),
        }).catch(() => {});

        // Heartbeat mỗi 30 giây
        heartbeatRef.current = setInterval(() => {
            const duration = Math.floor((Date.now() - startedAt.current) / 1000);
            firePost('/tracking/session/heartbeat', {
                session_id: sessionId,
                duration_seconds: duration,
            });
        }, 30_000);

        // Kết thúc session khi đóng tab
        const handleUnload = () => {
            const duration = Math.floor((Date.now() - startedAt.current) / 1000);
            firePost('/tracking/session/end', {
                session_id: sessionId,
                duration_seconds: duration,
            });
        };
        window.addEventListener('beforeunload', handleUnload);
        // visibilitychange: khi tab bị ẩn
        const handleVisibility = () => {
            if (document.visibilityState === 'hidden') {
                const duration = Math.floor((Date.now() - startedAt.current) / 1000);
                firePost('/tracking/session/heartbeat', {
                    session_id: sessionId,
                    duration_seconds: duration,
                });
            }
        };
        document.addEventListener('visibilitychange', handleVisibility);

        return () => {
            if (heartbeatRef.current) clearInterval(heartbeatRef.current);
            window.removeEventListener('beforeunload', handleUnload);
            document.removeEventListener('visibilitychange', handleVisibility);
            // Gửi kết thúc phiên khi component unmount
            const duration = Math.floor((Date.now() - startedAt.current) / 1000);
            firePost('/tracking/session/end', {
                session_id: sessionId,
                duration_seconds: duration,
            });
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // chỉ chạy 1 lần khi mount

    // Cập nhật user_id trong session nếu user đăng nhập sau
    useEffect(() => {
        if (!userId) return;
        fetch(`${API}/tracking/session/start`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                session_id: sessionId,
                user_id: userId,
            }),
        }).catch(() => {});
    }, [userId, sessionId]);
}

// ────────────────────────────────────────────────────────────────────
// Hook tự động theo dõi page view khi route thay đổi
// Dùng một lần duy nhất tại MainLayout
// ────────────────────────────────────────────────────────────────────
export function usePageViewTracking(userId?: number | null) {
    const pathname = usePathname();
    const { trackPageView } = useTracking(userId);
    const lastPathRef = useRef<string>('');

    useEffect(() => {
        if (typeof window === 'undefined') return;
        // Tránh track trùng lặp cùng path
        if (pathname === lastPathRef.current) return;
        lastPathRef.current = pathname;

        trackPageView(
            pathname,
            document.title || undefined,
            document.referrer || undefined,
        );
    }, [pathname, trackPageView]);
}

// ────────────────────────────────────────────────────────────────────
// Hook tự động bắt lỗi JS runtime + Promise rejections
// Dùng một lần duy nhất tại MainLayout
// ────────────────────────────────────────────────────────────────────
export function useErrorTracking(userId?: number | null) {
    const { trackError } = useTracking(userId);
    const setupRef = useRef(false);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (setupRef.current) return;
        setupRef.current = true;

        // Bắt JS runtime errors
        const handleError = (event: ErrorEvent) => {
            trackError(event.message, {
                errorType: 'frontend',
                stackTrace: event.error?.stack ?? `${event.filename}:${event.lineno}:${event.colno}`,
                pageUrl: window.location.href,
            });
        };

        // Bắt unhandled promise rejections
        const handleRejection = (event: PromiseRejectionEvent) => {
            const message = event.reason instanceof Error
                ? event.reason.message
                : String(event.reason ?? 'Unhandled Promise Rejection');
            const stack = event.reason instanceof Error
                ? event.reason.stack
                : undefined;

            trackError(message, {
                errorType: 'frontend_promise',
                stackTrace: stack,
                pageUrl: window.location.href,
            });
        };

        window.addEventListener('error', handleError);
        window.addEventListener('unhandledrejection', handleRejection);

        return () => {
            window.removeEventListener('error', handleError);
            window.removeEventListener('unhandledrejection', handleRejection);
            setupRef.current = false;
        };
    }, [trackError]);
}

