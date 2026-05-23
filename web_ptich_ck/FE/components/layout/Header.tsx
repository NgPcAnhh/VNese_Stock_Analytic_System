"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
    Search,
    Bell,
    User,
    ChevronDown,
    Menu,
    X,
    TrendingUp,
    Newspaper,
    Briefcase,
    Loader2,
    ShieldCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/AuthContext";
import { useRouter } from "next/navigation";
import { useTracking } from "@/hooks/useTracking";
import { useAlerts, type StockAlert } from "@/hooks/useAlerts";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";
const ALERT_ACK_KEY = "alerts_ack_ids";

interface StockSearchResult {
    ticker: string;
    company_name: string | null;
    sector: string | null;
    current_price: number | null;
    price_change: number | null;
    price_change_percent: number | null;
}

interface NewsSearchResult {
    id: number;
    title: string | null;
    source: string | null;
    published: string | null;
    link: string | null;
}

interface HeaderProps {
    onMenuClick?: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
    const { isAuthenticated, user, logout, openAuthModal } = useAuth();
    const { listAlerts, updateAlert, deleteAlert } = useAlerts();
    const [isSearchActive, setIsSearchActive] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [liveStocks, setLiveStocks] = useState<StockSearchResult[]>([]);
    const [liveNews, setLiveNews] = useState<NewsSearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isBellOpen, setIsBellOpen] = useState(false);
    const [isAlertLoading, setIsAlertLoading] = useState(false);
    const [alerts, setAlerts] = useState<StockAlert[]>([]);
    const [acknowledgedIds, setAcknowledgedIds] = useState<number[]>([]);
    const [activeAlertCount, setActiveAlertCount] = useState(0);

    const searchInputRef = useRef<HTMLInputElement>(null);
    const bellRef = useRef<HTMLDivElement>(null);
    const searchTimerRef = useRef<NodeJS.Timeout | undefined>(undefined);
    const router = useRouter();
    const { trackSearch, trackStockSearch } = useTracking(user?.id);

    const loadAlerts = useCallback(async () => {
        try {
            setIsAlertLoading(true);
            const nextAlerts = await listAlerts();
            setAlerts(nextAlerts);
        } catch {
            setAlerts([]);
        } finally {
            setIsAlertLoading(false);
        }
    }, [listAlerts]);

    const persistAck = useCallback((ids: number[]) => {
        try {
            localStorage.setItem(ALERT_ACK_KEY, JSON.stringify(ids));
        } catch {
            // noop
        }
    }, []);

    const markAlertAsRead = useCallback(
        (id: number) => {
            setAcknowledgedIds((prev) => {
                if (prev.includes(id)) return prev;
                const next = [...prev, id];
                persistAck(next);
                return next;
            });
        },
        [persistAck],
    );

    const markAllAsRead = useCallback(() => {
        const ids = alerts.map((a) => a.id);
        setAcknowledgedIds(ids);
        persistAck(ids);
    }, [alerts, persistAck]);

    const suspendAlert = useCallback(
        async (id: number) => {
            try {
                await updateAlert(id, { status: "DISMISSED" });
                markAlertAsRead(id);
                await loadAlerts();
            } catch {
                // noop
            }
        },
        [updateAlert, markAlertAsRead, loadAlerts],
    );

    const removeAlert = useCallback(
        async (id: number) => {
            try {
                await deleteAlert(id);
                setAcknowledgedIds((prev) => {
                    const next = prev.filter((n) => n !== id);
                    persistAck(next);
                    return next;
                });
                await loadAlerts();
            } catch {
                // noop
            }
        },
        [deleteAlert, loadAlerts, persistAck],
    );

    useEffect(() => {
        try {
            const raw = localStorage.getItem(ALERT_ACK_KEY);
            if (raw) {
                const ids = JSON.parse(raw) as number[];
                setAcknowledgedIds(Array.isArray(ids) ? ids : []);
            }
        } catch {
            setAcknowledgedIds([]);
        }
        loadAlerts();
        const timer = setInterval(loadAlerts, 15000);
        return () => clearInterval(timer);
    }, [loadAlerts]);

    useEffect(() => {
        const validAck = acknowledgedIds.filter((id) => alerts.some((a) => a.id === id));
        if (validAck.length !== acknowledgedIds.length) {
            setAcknowledgedIds(validAck);
            persistAck(validAck);
        }
        const count = alerts.filter(
            (a) => (a.status === "ACTIVE" || a.status === "TRIGGERED") && !validAck.includes(a.id),
        ).length;
        setActiveAlertCount(count);
    }, [alerts, acknowledgedIds, persistAck]);

    // Handle escape key to close search
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape" && isSearchActive) {
                setIsSearchActive(false);
            }
            if (e.key === "Escape" && isBellOpen) {
                setIsBellOpen(false);
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isSearchActive, isBellOpen]);

    useEffect(() => {
        const onPointerDown = (e: MouseEvent) => {
            if (!isBellOpen) return;
            if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
                setIsBellOpen(false);
            }
        };
        document.addEventListener("mousedown", onPointerDown);
        return () => document.removeEventListener("mousedown", onPointerDown);
    }, [isBellOpen]);

    // Handle body locking when search is active
    useEffect(() => {
        if (isSearchActive) {
            document.body.style.overflow = "hidden";
            // Check if we already have trending data
            if (!searchQuery && liveStocks.length === 0) {
                // Pre-fetch some hot stocks or default view initially here if desired
            }
        } else {
            document.body.style.overflow = "unset";
        }
        return () => { document.body.style.overflow = "unset"; };
    }, [isSearchActive, searchQuery, liveStocks.length]);

    // Format utility
    const formatPrice = (p: number | null) => p != null ? p.toLocaleString("vi-VN") : "—";
    const formatCondition = (condition: string) => {
        if (condition === "LESS_THAN") return "<=";
        return ">=";
    };
    const timeAgo = (iso: string | null) => {
        if (!iso) return "";
        const diff = Date.now() - new Date(iso).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 60) return `${mins} phút trước`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours} giờ trước`;
        const days = Math.floor(hours / 24);
        return `${days} ngày trước`;
    };

    const sortedAlerts = useMemo(
        () =>
            [...alerts].sort(
                (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
            ),
        [alerts],
    );

    const unreadIds = useMemo(
        () =>
            sortedAlerts
                .filter(
                    (a) => (a.status === "ACTIVE" || a.status === "TRIGGERED") && !acknowledgedIds.includes(a.id),
                )
                .map((a) => a.id),
        [sortedAlerts, acknowledgedIds],
    );

    // Live Search Effect
    useEffect(() => {
        if (!searchQuery.trim()) {
            setLiveStocks([]);
            setLiveNews([]);
            setIsSearching(false);
            return;
        }

        if (searchTimerRef.current) clearTimeout(searchTimerRef.current);

        setIsSearching(true);
        searchTimerRef.current = setTimeout(async () => {
            try {
                // Fetch stocks and news simultaneously
                const [stocksRes, newsRes] = await Promise.all([
                    fetch(`${API}/stock-list/overview?page=1&page_size=6&search=${encodeURIComponent(searchQuery)}`),
                    fetch(`${API}/news/list?page=1&page_size=4&search=${encodeURIComponent(searchQuery)}`)
                ]);

                if (stocksRes.ok) {
                    const stockData = await stocksRes.json();
                    setLiveStocks(stockData.data || []);
                }

                if (newsRes.ok) {
                    const newsData = await newsRes.json();
                    setLiveNews(newsData.data || []);
                }
            } catch (error) {
                console.error("Search API error:", error);
            } finally {
                setIsSearching(false);
            }
        }, 400); // 400ms debounce

        return () => {
            if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
        };
    }, [searchQuery]);

    const handleStockClick = (symbol: string) => {
        // Ghi log tìm kiếm mã cổ phiếu
        trackStockSearch(symbol);
        setIsSearchActive(false);
        setSearchQuery("");
        router.push(`/stock/${symbol}`);
    };

    const handleNewsClick = (id: number, link: string | null) => {
        setIsSearchActive(false);
        setSearchQuery("");
        if (link) {
            window.open(link, "_blank");
        } else {
            router.push(`/tin-tuc`);
        }
    };

    // Ghi log khi user nhấn Enter hoặc xác nhận tìm kiếm
    const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" && searchQuery.trim()) {
            // Nếu query ngắn dạng mã CK (1-5 ký tự) → stock search, ngược lại → general search
            const q = searchQuery.trim();
            const isTickerLike = q.length <= 5 && /^[a-zA-Z0-9]+$/.test(q);
            if (isTickerLike) {
                trackStockSearch(q);
            } else {
                trackSearch(q);
            }
        }
    };

    return (
        <>
            {/* Search Overlay Backdrop */}
            {isSearchActive && (
                <div
                    className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-md transition-all duration-300 animate-in fade-in"
                    onClick={() => setIsSearchActive(false)}
                />
            )}

            {/* Centered Active Search Container - Modified width for two columns */}
            <div className={`fixed left-1/2 top-4 -translate-x-1/2 w-[95%] lg:w-[800px] xl:w-[900px] z-[110] transition-all duration-300 ease-out ${isSearchActive ? 'opacity-100 translate-y-20' : 'opacity-0 -translate-y-full pointer-events-none'}`}>
                <div className="relative bg-card rounded-2xl border border-border/50 shadow-2xl overflow-hidden ring-1 ring-primary/20">
                    <div className="flex items-center p-4 border-b border-border/50">
                        <Search className="h-5 w-5 text-primary ml-2 mr-3 opacity-70" />
                        <input
                            ref={searchInputRef}
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={handleSearchKeyDown}
                            placeholder="Gõ mã cổ phiếu bạn muốn phân tích..."
                            className="flex-1 bg-transparent text-lg outline-none placeholder:text-muted-foreground/60 w-full font-medium"
                        />
                        {searchQuery && (
                            <button onClick={() => setSearchQuery("")} className="p-1 hover:bg-muted rounded-full mr-2 text-muted-foreground hover:text-foreground transition-colors">
                                <X className="h-4 w-4" />
                            </button>
                        )}
                        <div className="px-2 py-1 bg-muted rounded text-xs font-semibold text-muted-foreground mr-1 hidden sm:block">ESC</div>
                    </div>

                    {/* Search Suggestions */}
                    <div className="p-2 max-h-[400px] overflow-y-auto">
                        {!searchQuery ? (
                            <div className="p-4 text-sm text-muted-foreground">
                                <div className="flex items-center gap-2 mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
                                    <TrendingUp className="h-3.5 w-3.5" /> Xu hướng tìm kiếm
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {['VHM', 'SSI', 'DIG', 'DXG', 'VND', 'MWG'].map(tag => (
                                        <button
                                            key={tag}
                                            onClick={() => { setSearchQuery(tag); trackStockSearch(tag); }}
                                            className="px-3 py-1.5 rounded-full bg-muted hover:bg-primary/10 hover:text-primary transition-colors border border-transparent hover:border-primary/20"
                                        >
                                            {tag}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="py-2 px-2 flex flex-col gap-6 relative min-h-[150px]">
                                {isSearching ? (
                                    <div className="absolute inset-0 z-10 bg-card/50 flex flex-col items-center justify-center pt-8">
                                        <Loader2 className="h-8 w-8 text-primary animate-spin mb-2" />
                                        <span className="text-sm text-muted-foreground font-medium">Đang tìm kết quả...</span>
                                    </div>
                                ) : null}

                                {/* Stocks Section */}
                                <div className="flex flex-col">
                                    <div className="flex items-center gap-2 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 bg-muted/30 rounded-lg mb-2">
                                        <Briefcase className="h-3.5 w-3.5" /> Mã Cổ Phiếu
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                        {liveStocks.map((stock) => {
                                            const isUp = (stock.price_change_percent ?? 0) >= 0;
                                            return (
                                                <div
                                                    key={stock.ticker}
                                                    onClick={() => handleStockClick(stock.ticker)}
                                                    className="flex items-center justify-between p-3 hover:bg-muted/50 rounded-xl cursor-pointer transition-colors group"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-10 h-10 rounded-lg text-white flex items-center justify-center font-bold text-base shadow-sm group-hover:scale-105 transition-transform ${isUp ? "bg-gradient-to-br from-green-500 to-green-600" : "bg-gradient-to-br from-red-500 to-red-600"}`}>
                                                            {stock.ticker.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <h4 className="font-semibold text-foreground text-sm line-clamp-1 group-hover:text-primary transition-colors">{stock.ticker}</h4>
                                                            <span className="text-xs text-muted-foreground line-clamp-1 max-w-[150px]">{stock.company_name || stock.sector || "Không xác định"}</span>
                                                        </div>
                                                    </div>
                                                    <div className="text-right ml-2 shrink-0">
                                                        <div className="font-medium text-sm">{formatPrice(stock.current_price)}</div>
                                                        <div className={`text-xs font-medium ${isUp ? 'text-green-500' : 'text-red-500'}`}>
                                                            {stock.price_change_percent != null ? `${isUp ? '+' : ''}${stock.price_change_percent.toFixed(2)}%` : ""}
                                                        </div>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                    {liveStocks.length === 0 && !isSearching && (
                                        <div className="p-6 text-center text-sm text-muted-foreground">
                                            Không tìm thấy mã nào
                                        </div>
                                    )}
                                </div>

                                {/* News Section */}
                                <div className="flex flex-col pt-4 border-t border-border/50">
                                    <div className="flex items-center gap-2 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 bg-muted/30 rounded-lg mb-2">
                                        <Newspaper className="h-3.5 w-3.5" /> Tin tức liên quan
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        {liveNews.map((news) => (
                                            <div
                                                key={news.id}
                                                onClick={() => handleNewsClick(news.id, news.link)}
                                                className="flex flex-col p-3 hover:bg-muted/50 rounded-xl cursor-pointer transition-colors group gap-1.5"
                                            >
                                                <h4 className="font-medium text-sm text-foreground group-hover:text-primary transition-colors line-clamp-2">
                                                    {news.title}
                                                </h4>
                                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                    {news.source && <span className="font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary/80">{news.source}</span>}
                                                    {news.published && <span>•</span>}
                                                    <span>{timeAgo(news.published)}</span>
                                                </div>
                                            </div>
                                        ))}
                                        {liveNews.length === 0 && !isSearching && (
                                            <div className="p-6 text-center text-sm text-muted-foreground">
                                                Không có tin tức liên quan
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/95 px-6 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="flex flex-1 items-center gap-4">
                    <button className="lg:hidden p-2 -ml-2 hover:bg-muted rounded-md" onClick={onMenuClick}>
                        <Menu className="h-6 w-6" />
                    </button>

                    {/* Normal Search Bar Container */}
                    <div className={`relative w-full max-w-md hidden md:flex ${isSearchActive ? 'invisible' : 'visible'}`}>
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <input
                            type="search"
                            placeholder="Tìm kiếm mã cổ phiếu, tin tức..."
                            className="w-full rounded-full bg-muted/50 px-9 py-2 text-sm outline-hidden border border-transparent hover:border-border cursor-text transition-all"
                            onFocus={(e) => {
                                if (!isAuthenticated) {
                                    e.target.blur();
                                    openAuthModal();
                                    return;
                                }
                                setIsSearchActive(true);
                                setTimeout(() => searchInputRef.current?.focus(), 100);
                            }}
                            readOnly
                        />
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative" ref={bellRef}>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setIsBellOpen((prev) => !prev)}
                            className="relative rounded-full text-muted-foreground hover:text-foreground"
                            title="Thông báo cảnh báo"
                        >
                            <Bell className="h-5 w-5" />
                            {activeAlertCount > 0 && (
                                <>
                                    <span className="absolute top-2.5 right-2.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-background" />
                                    <span className="absolute -top-1 -right-1 text-[10px] leading-none min-w-4 h-4 px-1 rounded-full bg-red-500 text-white flex items-center justify-center">
                                        {activeAlertCount > 9 ? "9+" : activeAlertCount}
                                    </span>
                                </>
                            )}
                        </Button>

                        {isBellOpen && (
                            <div className="absolute right-0 mt-2 w-[360px] max-w-[90vw] rounded-xl border border-border bg-card shadow-xl z-40 overflow-hidden">
                                <div className="px-4 py-3 border-b border-border/60 flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-semibold">Thông báo cảnh báo</p>
                                        <p className="text-xs text-muted-foreground">{activeAlertCount} chưa đọc</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={markAllAsRead}
                                        className="text-xs text-primary hover:underline"
                                    >
                                        Đánh dấu đọc tất cả
                                    </button>
                                </div>

                                <div className="max-h-[380px] overflow-y-auto">
                                    {isAlertLoading ? (
                                        <div className="px-4 py-6 text-sm text-muted-foreground">Đang tải cảnh báo...</div>
                                    ) : sortedAlerts.length === 0 ? (
                                        <div className="px-4 py-6 text-sm text-muted-foreground">Chưa có cảnh báo nào.</div>
                                    ) : (
                                        sortedAlerts.map((alert) => {
                                            const isUnread = unreadIds.includes(alert.id);
                                            return (
                                                <div key={alert.id} className="px-4 py-3 border-b last:border-b-0 border-border/40">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                markAlertAsRead(alert.id);
                                                                setIsBellOpen(false);
                                                                router.push(`/stock/${alert.ticker}`);
                                                            }}
                                                            className="text-left group"
                                                        >
                                                            <p className="text-sm font-medium group-hover:text-primary">
                                                                {alert.ticker} {formatCondition(alert.condition_type)} {Number(alert.target_price).toLocaleString("vi-VN")}
                                                            </p>
                                                            <p className="text-xs text-muted-foreground">
                                                                {alert.status === "DISMISSED" ? "Đã tắt" : "Đang theo dõi"} • {timeAgo(alert.created_at)}
                                                            </p>
                                                        </button>
                                                        {isUnread && <span className="mt-1 inline-block h-2 w-2 rounded-full bg-red-500" />}
                                                    </div>

                                                    <div className="mt-2 flex items-center gap-3 text-xs">
                                                        <button
                                                            type="button"
                                                            onClick={() => markAlertAsRead(alert.id)}
                                                            className="text-muted-foreground hover:text-foreground"
                                                        >
                                                            Đánh dấu đã đọc
                                                        </button>
                                                        {(alert.status === "ACTIVE" || alert.status === "TRIGGERED") && (
                                                            <button
                                                                type="button"
                                                                onClick={() => suspendAlert(alert.id)}
                                                                className="text-amber-700 hover:text-amber-800"
                                                            >
                                                                Tắt cảnh báo
                                                            </button>
                                                        )}
                                                        <button
                                                            type="button"
                                                            onClick={() => removeAlert(alert.id)}
                                                            className="text-red-600 hover:text-red-700"
                                                        >
                                                            Xóa
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-2 pl-2 border-l border-border/50">
                        {isAuthenticated && user ? (
                            <>
                                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium overflow-hidden">
                                    {user.avatar_url ? (
                                        <img src={user.avatar_url} alt={user.full_name || 'User'} className="w-full h-full object-cover" />
                                    ) : (
                                        (user.full_name?.[0] || user.email[0]).toUpperCase()
                                    )}
                                </div>
                                <div className="hidden md:block text-sm">
                                    <p className="font-medium leading-none">{user.full_name || user.email.split('@')[0]}</p>
                                    <p className="text-xs text-muted-foreground capitalize">{user.role}</p>
                                </div>
                                {user.role === 'admin' && (
                                    <Button variant="outline" size="sm" onClick={() => router.push('/admin')} className="ml-2 hidden lg:flex items-center gap-1 border-primary/50 text-primary hover:bg-primary/10">
                                        <ShieldCheck className="h-4 w-4" />
                                        <span className="hidden xl:inline">Quản Trị</span>
                                    </Button>
                                )}
                                <Button variant="ghost" size="icon" onClick={() => logout()} title="Đăng xuất" className="ml-2 h-8 w-8 text-muted-foreground hover:text-red-500">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                                </Button>
                            </>
                        ) : (
                            <Button onClick={openAuthModal} size="sm" className="ml-2">
                                Đăng Nhập
                            </Button>
                        )}
                    </div>
                </div>
            </header>
        </>
    );
}
