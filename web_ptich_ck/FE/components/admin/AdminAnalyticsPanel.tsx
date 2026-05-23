"use client";

import { useEffect, useState } from "react";
import {
    AreaChart, Area, BarChart, Bar, LineChart, Line,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fetchWithAuth } from "@/lib/auth";
import { TrendingUp, Search, MousePointer, LayoutDashboard, Clock } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

interface DayCount { date: string; count: number }

function StatCard({ title, value, icon: Icon, color, sub }: any) {
    return (
        <Card className="border-border/50 overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
                <div className={`p-2 rounded-full ${color.replace("text-", "bg-").replace("-500", "-500/10")}`}>
                    <Icon className={`h-4 w-4 ${color}`} />
                </div>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value ?? "—"}</div>
                {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
            </CardContent>
        </Card>
    );
}

export function AdminAnalyticsPanel() {
    const [searches, setSearches] = useState<any>(null);
    const [stockClicks, setStockClicks] = useState<any>(null);
    const [logins, setLogins] = useState<any>(null);
    const [sessions, setSessions] = useState<any>(null);
    const [sidebar, setSidebar] = useState<any>(null);
    const [days, setDays] = useState(30);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const [r1, r2, r3, r4, r5] = await Promise.all([
                    fetchWithAuth(`${API}/admin/analytics/searches?days=${days}`),
                    fetchWithAuth(`${API}/admin/analytics/stock-clicks?days=${days}`),
                    fetchWithAuth(`${API}/admin/analytics/logins?days=${days}`),
                    fetchWithAuth(`${API}/admin/analytics/sessions?days=${days}`),
                    fetchWithAuth(`${API}/admin/analytics/sidebar?days=${days}`),
                ]);
                if (r1.ok) setSearches(await r1.json());
                if (r2.ok) setStockClicks(await r2.json());
                if (r3.ok) setLogins(await r3.json());
                if (r4.ok) setSessions(await r4.json());
                if (r5.ok) setSidebar(await r5.json());
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [days]);

    const COLORS = ["hsl(var(--primary))", "hsl(var(--destructive))", "#22c55e", "#f59e0b"];

    const dayBtns = [7, 14, 30, 60];

    return (
        <div className="space-y-6">
            {/* Time filter */}
            <div className="flex gap-2">
                {dayBtns.map(d => (
                    <button key={d}
                        onClick={() => setDays(d)}
                        className={`px-3 py-1.5 text-sm rounded-full transition-colors ${days === d
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                        }`}
                    >
                        {d} ngày
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="flex h-64 items-center justify-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                </div>
            ) : (
                <>
                    {/* Summary KPIs */}
                    <div className="grid gap-4 md:grid-cols-4">
                        <StatCard title="Tổng Tìm Kiếm" value={searches?.search_by_day?.reduce((a: number, b: DayCount) => a + b.count, 0)} icon={Search} color="text-blue-500" />
                        <StatCard title="Tìm CK" value={searches?.stock_search_by_day?.reduce((a: number, b: DayCount) => a + b.count, 0)} icon={TrendingUp} color="text-green-500" />
                        <StatCard title="Click CK" value={stockClicks?.clicks_by_day?.reduce((a: number, b: DayCount) => a + b.count, 0)} icon={MousePointer} color="text-orange-500" />
                        <StatCard title="Tổng Phiên" value={sessions?.total_sessions_7d} icon={Clock} color="text-purple-500" sub={`TB ${sessions?.avg_duration_7d ? Math.round(sessions.avg_duration_7d) + "s" : "—"}/phiên (7 ngày)`} />
                    </div>

                    {/* Login trend */}
                    <Card className="border-border/50">
                        <CardHeader>
                            <CardTitle className="text-base">Xu Hướng Đăng Nhập</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[250px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={[...(logins?.by_day ?? [])].reverse()}>
                                        <defs>
                                            <linearGradient id="gs" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor={COLORS[0]} stopOpacity={0.3} />
                                                <stop offset="95%" stopColor={COLORS[0]} stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="gf" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor={COLORS[1]} stopOpacity={0.3} />
                                                <stop offset="95%" stopColor={COLORS[1]} stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.4} />
                                        <XAxis dataKey="date" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => v.slice(5)} />
                                        <YAxis fontSize={11} tickLine={false} axisLine={false} />
                                        <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))" }} />
                                        <Legend />
                                        <Area type="monotone" dataKey="success" name="Thành công" stroke={COLORS[0]} fill="url(#gs)" strokeWidth={2} />
                                        <Area type="monotone" dataKey="fail" name="Thất bại" stroke={COLORS[1]} fill="url(#gf)" strokeWidth={2} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="flex gap-4 mt-4 text-sm">
                                <span className="text-muted-foreground">Hôm nay: <strong className="text-foreground">{logins?.total_today ?? 0} đăng nhập</strong></span>
                                {logins?.success_rate_30d !== null && (
                                    <span className="text-muted-foreground">Tỷ lệ thành công: <strong className="text-green-500">{logins?.success_rate_30d}%</strong></span>
                                )}
                                {logins?.by_method?.map((m: any) => (
                                    <span key={m.method} className="text-muted-foreground capitalize">{m.method}: <strong className="text-foreground">{m.count}</strong></span>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* 3-column: Search trend, Stock clicks, Session trend */}
                    <div className="grid gap-4 md:grid-cols-2">
                        {/* Search trend */}
                        <Card className="border-border/50">
                            <CardHeader>
                                <CardTitle className="text-base">Lượt Tìm Kiếm Theo Ngày</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="h-[200px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={[...(searches?.search_by_day ?? [])].reverse()}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.4} />
                                            <XAxis dataKey="date" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => v.slice(5)} />
                                            <YAxis fontSize={11} tickLine={false} axisLine={false} />
                                            <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))" }} />
                                            <Line type="monotone" dataKey="count" name="Tin tức" stroke={COLORS[0]} dot={false} strokeWidth={2} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Stock clicks trend */}
                        <Card className="border-border/50">
                            <CardHeader>
                                <CardTitle className="text-base">Click Mã CK Theo Ngày</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="h-[200px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={[...(stockClicks?.clicks_by_day ?? [])].reverse()}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.4} />
                                            <XAxis dataKey="date" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => v.slice(5)} />
                                            <YAxis fontSize={11} tickLine={false} axisLine={false} />
                                            <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))" }} />
                                            <Bar dataKey="count" name="Clicks" fill={COLORS[2]} radius={[2, 2, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Top lists */}
                    <div className="grid gap-4 md:grid-cols-3">
                        {/* Hot keywords */}
                        <Card className="border-border/50">
                            <CardHeader>
                                <CardTitle className="text-base">Top Từ Khóa Tin Tức</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    {searches?.hot_keywords?.slice(0, 10).map((k: any, i: number) => (
                                        <div key={i} className="flex justify-between text-sm">
                                            <div className="flex items-center gap-2">
                                                <span className="w-5 text-xs text-muted-foreground">{i + 1}.</span>
                                                <span className="truncate max-w-[140px]" title={k.keyword}>{k.keyword}</span>
                                            </div>
                                            <Badge variant="outline">{k.count}</Badge>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Hot stock searches */}
                        <Card className="border-border/50">
                            <CardHeader>
                                <CardTitle className="text-base">Top Tìm Kiếm CK</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    {searches?.hot_stock_keywords?.slice(0, 10).map((k: any, i: number) => (
                                        <div key={i} className="flex justify-between text-sm">
                                            <div className="flex items-center gap-2">
                                                <span className="w-5 text-xs text-muted-foreground">{i + 1}.</span>
                                                <span className="font-medium">{k.keyword}</span>
                                            </div>
                                            <Badge variant="outline">{k.count}</Badge>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Top tickers */}
                        <Card className="border-border/50">
                            <CardHeader>
                                <CardTitle className="text-base">Top Mã CK Được Xem</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    {stockClicks?.top_tickers?.slice(0, 10).map((t: any, i: number) => (
                                        <div key={i} className="flex justify-between text-sm">
                                            <div className="flex items-center gap-2">
                                                <span className="w-5 text-xs text-muted-foreground">{i + 1}.</span>
                                                <span className="font-bold">{t.ticker}</span>
                                                <span className="text-xs text-muted-foreground">({t.unique_sessions} user)</span>
                                            </div>
                                            <Badge variant="outline">{t.click_count}</Badge>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Session stats */}
                    <div className="grid gap-4 md:grid-cols-2">
                        <Card className="border-border/50">
                            <CardHeader>
                                <CardTitle className="text-base">Phiên Làm Việc Theo Ngày</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="h-[200px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={[...(sessions?.by_day ?? [])].reverse()}>
                                            <defs>
                                                <linearGradient id="gse" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor={COLORS[3]} stopOpacity={0.3} />
                                                    <stop offset="95%" stopColor={COLORS[3]} stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.4} />
                                            <XAxis dataKey="date" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => v.slice(5)} />
                                            <YAxis fontSize={11} tickLine={false} axisLine={false} />
                                            <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))" }} />
                                            <Area type="monotone" dataKey="session_count" name="Phiên" stroke={COLORS[3]} fill="url(#gse)" strokeWidth={2} />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                                    <span>Authenticated: <strong className="text-foreground">{sessions?.auth_sessions_7d}</strong></span>
                                    <span>Anonymous: <strong className="text-foreground">{sessions?.anon_sessions_7d}</strong></span>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Sidebar usage */}
                        <Card className="border-border/50">
                            <CardHeader>
                                <CardTitle className="text-base">Sử Dụng Sidebar</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {sidebar?.by_menu?.slice(0, 8).map((m: any, i: number) => {
                                        const pct = Math.round(100 * m.click_count / (sidebar.by_menu[0]?.click_count || 1));
                                        return (
                                            <div key={i} className="space-y-1">
                                                <div className="flex justify-between text-xs">
                                                    <span className="truncate text-sm font-medium max-w-[160px]" title={m.menu_name}>{m.menu_name}</span>
                                                    <span className="text-muted-foreground">{m.click_count} clicks</span>
                                                </div>
                                                <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                                                    <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </>
            )}
        </div>
    );
}
