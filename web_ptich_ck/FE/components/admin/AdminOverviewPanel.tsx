"use client";

import { useEffect, useState } from "react";
import {
    AreaChart, Area, BarChart, Bar, LineChart, Line,
    PieChart, Pie, Cell, ComposedChart,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fetchWithAuth } from "@/lib/auth";
import {
    TrendingUp, Users, LogIn, Clock, Search, MousePointer,
    Eye, BarChart3, Activity, Wifi, ShieldCheck, Globe,
    AlertTriangle, CheckCircle2, Zap, UserPlus
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

interface AdminOverviewPanelProps {
    stats: any;
}

const C = {
    primary: "hsl(var(--primary))",
    destructive: "hsl(var(--destructive))",
    green: "#22c55e",
    amber: "#f59e0b",
    blue: "#3b82f6",
    purple: "#a855f7",
    pink: "#ec4899",
    indigo: "#6366f1",
    sky: "#0ea5e9",
    emerald: "#10b981",
    red: "#ef4444",
    orange: "#f97316",
};

const tooltipStyle = {
    backgroundColor: "hsl(var(--card))",
    borderColor: "hsl(var(--border))",
    borderRadius: "8px",
    fontSize: "12px",
};

/* ── Reusable KPI card ───────────────────────────────────── */
function KPI({ icon: Icon, label, value, sub, color, trend }: any) {
    return (
        <Card className="border-border/50 hover:shadow-md transition-all duration-200">
            <CardContent className="p-4">
                <div className="flex items-start justify-between">
                    <div className="space-y-1">
                        <p className="text-xs text-muted-foreground font-medium">{label}</p>
                        <p className="text-2xl font-bold tracking-tight">{value ?? "—"}</p>
                        {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
                    </div>
                    <div className="p-2 rounded-xl" style={{ backgroundColor: `${color}18` }}>
                        <Icon className="h-5 w-5" style={{ color }} />
                    </div>
                </div>
                {trend !== undefined && (
                    <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${trend >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                        <TrendingUp className={`h-3 w-3 ${trend < 0 ? "rotate-180" : ""}`} />
                        {Math.abs(trend)}% so với tuần trước
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

export function AdminOverviewPanel({ stats }: AdminOverviewPanelProps) {
    const [logins, setLogins] = useState<any>(null);
    const [sessions, setSessions] = useState<any>(null);
    const [searches, setSearches] = useState<any>(null);
    const [stockClicks, setStockClicks] = useState<any>(null);
    const [sidebar, setSidebar] = useState<any>(null);
    const [pageViews, setPageViews] = useState<any>(null);
    const [errors, setErrors] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const fetchers = [
                    fetchWithAuth(`${API}/admin/analytics/logins?days=30`),
                    fetchWithAuth(`${API}/admin/analytics/sessions?days=30`),
                    fetchWithAuth(`${API}/admin/analytics/searches?days=30`),
                    fetchWithAuth(`${API}/admin/analytics/stock-clicks?days=30`),
                    fetchWithAuth(`${API}/admin/analytics/sidebar?days=30`),
                    fetchWithAuth(`${API}/admin/analytics/page-views?days=30`).catch(() => null),
                    fetchWithAuth(`${API}/admin/analytics/errors?days=30`).catch(() => null),
                ];
                const [r1, r2, r3, r4, r5, r6, r7] = await Promise.all(fetchers);
                if (r1 && r1.ok) setLogins(await r1.json());
                if (r2 && r2.ok) setSessions(await r2.json());
                if (r3 && r3.ok) setSearches(await r3.json());
                if (r4 && r4.ok) setStockClicks(await r4.json());
                if (r5 && r5.ok) setSidebar(await r5.json());
                if (r6 && r6.ok) setPageViews(await r6.json());
                if (r7 && r7.ok) setErrors(await r7.json());
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    /* ── Prepare data ── */
    const loginChartData = [...(logins?.by_day ?? [])].reverse().map((d: any) => ({
        date: d.date?.slice(5),
        "Thành công": d.success,
        "Thất bại": d.fail,
    }));

    const sessionChartData = [...(sessions?.by_day ?? [])].reverse().map((d: any) => ({
        date: d.date?.slice(5),
        phien: d.session_count,
        tb_s: d.avg_duration_seconds ? Math.round(d.avg_duration_seconds) : 0,
    }));

    const searchChartData = [...(searches?.search_by_day ?? [])].reverse().map((d: any) => ({
        date: d.date?.slice(5),
        "Tin tức": d.count,
    }));
    const stockSearchData = [...(searches?.stock_search_by_day ?? [])].reverse().map((d: any) => ({
        date: d.date?.slice(5),
        "Mã CK": d.count,
    }));
    // Merge search data
    const mergedSearchData = searchChartData.map((d: any, i: number) => ({
        ...d,
        "Mã CK": stockSearchData[i]?.["Mã CK"] ?? 0,
    }));

    const pvChartData = [...(pageViews?.views_by_day ?? [])].reverse().map((d: any) => ({
        date: d.date?.slice(5),
        views: d.count,
    }));

    const clickData = [...(stockClicks?.clicks_by_day ?? [])].reverse().map((d: any) => ({
        date: d.date?.slice(5),
        clicks: d.count,
    }));

    // Auth provider pie
    const authPieData = [
        { name: "Local", value: stats?.local_auth_count ?? 0, color: C.blue },
        { name: "Google", value: stats?.google_auth_count ?? 0, color: C.red },
    ].filter(d => d.value > 0);

    // Role distribution
    const roleDist = stats?.role_distribution ?? {};
    const roleBarData = Object.entries(roleDist).map(([name, count]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        count,
    }));

    // Sidebar top 6
    const sidebarTop = (sidebar?.by_menu ?? []).slice(0, 6);
    const sidebarMax = sidebarTop[0]?.click_count || 1;

    // Top tickers
    const topTickers = (stockClicks?.top_tickers ?? []).slice(0, 8);

    // Top search keywords
    const topKeywords = (searches?.hot_keywords ?? []).slice(0, 8);

    // Error summary
    const totalErrors = (errors?.by_day ?? []).reduce((a: number, d: any) => a + (d.count || 0), 0);
    const recentErrors = (errors?.recent_errors ?? []).slice(0, 5);

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
        );
    }

    return (
        <div className="space-y-6">

            {/* ═══════════════════════════════════════════════════ */}
            {/* ROW 2 — Login Trend (full-width)                   */}
            {/* ═══════════════════════════════════════════════════ */}
            <Card className="border-border/50">
                <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-base flex items-center gap-2">
                            <LogIn className="h-4 w-4 text-amber-500" /> Xu Hướng Đăng Nhập (30 ngày)
                        </CardTitle>
                        <div className="flex gap-3 text-xs text-muted-foreground">
                            <span>Hôm nay: <strong className="text-foreground">{logins?.total_today ?? 0}</strong></span>
                            {logins?.by_method?.map((m: any) => (
                                <span key={m.method} className="capitalize">{m.method}: <strong className="text-foreground">{m.count}</strong></span>
                            ))}
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="h-[260px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={loginChartData}>
                                <defs>
                                    <linearGradient id="gLoginS" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={C.green} stopOpacity={0.3} />
                                        <stop offset="95%" stopColor={C.green} stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="gLoginF" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={C.red} stopOpacity={0.3} />
                                        <stop offset="95%" stopColor={C.red} stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.4} />
                                <XAxis dataKey="date" fontSize={11} tickLine={false} axisLine={false} />
                                <YAxis fontSize={11} tickLine={false} axisLine={false} />
                                <Tooltip contentStyle={tooltipStyle} />
                                <Legend verticalAlign="top" height={30} />
                                <Area type="monotone" dataKey="Thành công" stroke={C.green} fill="url(#gLoginS)" strokeWidth={2} />
                                <Area type="monotone" dataKey="Thất bại" stroke={C.red} fill="url(#gLoginF)" strokeWidth={2} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>

            {/* ═══════════════════════════════════════════════════ */}
            {/* ROW 3 — Session + Stock Click (2-col)              */}
            {/* ═══════════════════════════════════════════════════ */}
            <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
                {/* Sessions — Composed chart with bars + line */}
                <Card className="border-border/50">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Clock className="h-4 w-4 text-purple-500" /> Phiên Làm Việc
                        </CardTitle>
                        <div className="flex gap-3 text-xs text-muted-foreground">
                            <span>7 ngày: <strong className="text-foreground">{sessions?.total_sessions_7d ?? 0} phiên</strong></span>
                            <span>TB: <strong className="text-foreground">{sessions?.avg_duration_7d ? Math.round(sessions.avg_duration_7d) + "s" : "—"}</strong></span>
                            <span>Auth: <strong className="text-foreground">{sessions?.auth_sessions_7d ?? 0}</strong></span>
                            <span>Anon: <strong className="text-foreground">{sessions?.anon_sessions_7d ?? 0}</strong></span>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[220px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={sessionChartData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.4} />
                                    <XAxis dataKey="date" fontSize={11} tickLine={false} axisLine={false} />
                                    <YAxis yAxisId="left" fontSize={11} tickLine={false} axisLine={false} />
                                    <YAxis yAxisId="right" orientation="right" fontSize={11} tickLine={false} axisLine={false} />
                                    <Tooltip contentStyle={tooltipStyle} />
                                    <Legend verticalAlign="top" height={30} />
                                    <Bar yAxisId="left" dataKey="phien" name="Số phiên" fill={C.purple} radius={[2, 2, 0, 0]} opacity={0.7} />
                                    <Line yAxisId="right" type="monotone" dataKey="tb_s" name="TB (giây)" stroke={C.amber} strokeWidth={2} dot={false} />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Stock Clicks */}
                <Card className="border-border/50">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-2">
                            <MousePointer className="h-4 w-4 text-green-500" /> Click Mã CK (30 ngày)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[220px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={clickData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.4} />
                                    <XAxis dataKey="date" fontSize={11} tickLine={false} axisLine={false} />
                                    <YAxis fontSize={11} tickLine={false} axisLine={false} />
                                    <Tooltip contentStyle={tooltipStyle} />
                                    <Bar dataKey="clicks" name="Clicks" fill={C.green} radius={[3, 3, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* ═══════════════════════════════════════════════════ */}
            {/* ROW 4 — Search Trend + Page Views (2-col)          */}
            {/* ═══════════════════════════════════════════════════ */}
            <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
                {/* Search Trend */}
                <Card className="border-border/50">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Search className="h-4 w-4 text-sky-500" /> Xu Hướng Tìm Kiếm (30 ngày)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[200px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={mergedSearchData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.4} />
                                    <XAxis dataKey="date" fontSize={11} tickLine={false} axisLine={false} />
                                    <YAxis fontSize={11} tickLine={false} axisLine={false} />
                                    <Tooltip contentStyle={tooltipStyle} />
                                    <Legend verticalAlign="top" height={30} />
                                    <Line type="monotone" dataKey="Tin tức" stroke={C.sky} strokeWidth={2} dot={false} />
                                    <Line type="monotone" dataKey="Mã CK" stroke={C.indigo} strokeWidth={2} dot={false} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Page Views */}
                <Card className="border-border/50">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Eye className="h-4 w-4 text-emerald-500" /> Lượt Xem Trang (30 ngày)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[200px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={pvChartData}>
                                    <defs>
                                        <linearGradient id="gPV" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor={C.emerald} stopOpacity={0.3} />
                                            <stop offset="95%" stopColor={C.emerald} stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.4} />
                                    <XAxis dataKey="date" fontSize={11} tickLine={false} axisLine={false} />
                                    <YAxis fontSize={11} tickLine={false} axisLine={false} />
                                    <Tooltip contentStyle={tooltipStyle} />
                                    <Area type="monotone" dataKey="views" name="Lượt xem" stroke={C.emerald} fill="url(#gPV)" strokeWidth={2} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* ═══════════════════════════════════════════════════ */}
            {/* ROW 5 — Top Lists + Pie + Sidebar                 */}
            {/* ═══════════════════════════════════════════════════ */}
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">

                {/* Top Mã CK */}
                <Card className="border-border/50">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                            <TrendingUp className="h-3.5 w-3.5 text-green-500" /> Top Mã CK Được Xem
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {topTickers.length === 0 && <p className="text-xs text-muted-foreground py-4 text-center">Chưa có dữ liệu</p>}
                            {topTickers.map((t: any, i: number) => (
                                <div key={i} className="flex justify-between items-center text-sm">
                                    <div className="flex items-center gap-2">
                                        <span className="w-5 text-xs text-muted-foreground font-mono">{i + 1}</span>
                                        <span className="font-bold">{t.ticker}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] text-muted-foreground">{t.unique_sessions} user</span>
                                        <Badge variant="outline" className="text-xs min-w-[36px] justify-center">{t.click_count}</Badge>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Top Keywords */}
                <Card className="border-border/50">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                            <Search className="h-3.5 w-3.5 text-sky-500" /> Top Từ Khóa Tìm Kiếm
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {topKeywords.length === 0 && <p className="text-xs text-muted-foreground py-4 text-center">Chưa có dữ liệu</p>}
                            {topKeywords.map((k: any, i: number) => (
                                <div key={i} className="flex justify-between items-center text-sm">
                                    <div className="flex items-center gap-2">
                                        <span className="w-5 text-xs text-muted-foreground font-mono">{i + 1}</span>
                                        <span className="truncate max-w-[120px]" title={k.keyword}>{k.keyword}</span>
                                    </div>
                                    <Badge variant="outline" className="text-xs">{k.count}</Badge>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Auth Provider Pie */}
                <Card className="border-border/50">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                            <Globe className="h-3.5 w-3.5 text-blue-500" /> Phương Thức Xác Thực
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[180px] flex items-center justify-center">
                            {authPieData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={authPieData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={4} dataKey="value">
                                            {authPieData.map((entry, idx) => (
                                                <Cell key={idx} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip contentStyle={tooltipStyle} />
                                        <Legend verticalAlign="bottom" height={28} />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <span className="text-muted-foreground text-sm">Chưa có dữ liệu</span>
                            )}
                        </div>
                        <div className="flex justify-center gap-4 text-xs mt-1">
                            <span className="text-muted-foreground">Local: <strong className="text-foreground">{stats?.local_auth_count ?? 0}</strong></span>
                            <span className="text-muted-foreground">Google: <strong className="text-foreground">{stats?.google_auth_count ?? 0}</strong></span>
                        </div>
                    </CardContent>
                </Card>

                {/* Sidebar Usage */}
                <Card className="border-border/50">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                            <BarChart3 className="h-3.5 w-3.5 text-purple-500" /> Sử Dụng Sidebar
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2.5">
                            {sidebarTop.length === 0 && <p className="text-xs text-muted-foreground py-4 text-center">Chưa có dữ liệu</p>}
                            {sidebarTop.map((m: any, i: number) => {
                                const pct = Math.round(100 * m.click_count / sidebarMax);
                                return (
                                    <div key={i} className="space-y-1">
                                        <div className="flex justify-between text-xs">
                                            <span className="truncate max-w-[120px] font-medium" title={m.menu_name}>{m.menu_name}</span>
                                            <span className="text-muted-foreground">{m.click_count}</span>
                                        </div>
                                        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                                            <div className="h-full rounded-full bg-purple-500 transition-all" style={{ width: `${pct}%` }} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* ═══════════════════════════════════════════════════ */}
            {/* ROW 6 — Role Distribution + Security + Errors      */}
            {/* ═══════════════════════════════════════════════════ */}
            <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
                {/* Roles bar */}
                <Card className="border-border/50">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                            <ShieldCheck className="h-3.5 w-3.5 text-amber-500" /> Phân Bổ Vai Trò
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[160px]">
                            {roleBarData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={roleBarData} layout="vertical" margin={{ left: 10 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" opacity={0.4} />
                                        <XAxis type="number" fontSize={11} tickLine={false} axisLine={false} />
                                        <YAxis type="category" dataKey="name" fontSize={12} tickLine={false} axisLine={false} width={75} />
                                        <Tooltip contentStyle={tooltipStyle} />
                                        <Bar dataKey="count" name="Số lượng" radius={[0, 4, 4, 0]}>
                                            {roleBarData.map((_: any, idx: number) => (
                                                <Cell key={idx} fill={[C.red, C.amber, C.blue, C.green][idx % 4]} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <span className="text-muted-foreground text-sm">Chưa có dữ liệu</span>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Security overview */}
                <Card className="border-border/50">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                            <Zap className="h-3.5 w-3.5 text-emerald-500" /> Bảo Mật Hệ Thống
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {[
                            {
                                icon: ShieldCheck, color: C.green, label: "Kích hoạt 2FA",
                                value: stats?.totp_enabled_count ?? 0,
                                sub: `${stats?.total_users ? Math.round(100 * (stats.totp_enabled_count ?? 0) / stats.total_users) : 0}% tài khoản`,
                            },
                            {
                                icon: Activity, color: C.red, label: "User bị khóa",
                                value: stats?.inactive_users ?? 0,
                                sub: `${stats?.total_users ? (stats.total_users - (stats.inactive_users ?? 0)) : 0} đang active`,
                            },
                            {
                                icon: LogIn, color: C.amber, label: "Login thất bại (30 ngày)",
                                value: loginChartData.reduce((a: number, d: any) => a + (d["Thất bại"] || 0), 0),
                                sub: `Tỷ lệ TC: ${logins?.success_rate_30d ?? "—"}%`,
                            },
                            {
                                icon: MousePointer, color: C.indigo, label: "Click CK (7 ngày)",
                                value: stats?.total_stock_clicks_7d ?? 0,
                                sub: `${stats?.total_article_clicks_7d ?? 0} click bài báo`,
                            },
                        ].map((item, i) => (
                            <div key={i} className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <item.icon className="h-3.5 w-3.5" style={{ color: item.color }} />
                                    <div>
                                        <span className="text-xs">{item.label}</span>
                                        <div className="text-[10px] text-muted-foreground">{item.sub}</div>
                                    </div>
                                </div>
                                <span className="text-sm font-bold">{item.value}</span>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                {/* Recent Errors */}
                <Card className="border-border/50">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                            <AlertTriangle className="h-3.5 w-3.5 text-red-500" /> Lỗi Gần Đây
                            {totalErrors > 0 && <Badge className="text-xs bg-red-500/10 text-red-500 border-none ml-1">{totalErrors}</Badge>}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {recentErrors.length === 0 ? (
                            <div className="flex flex-col items-center gap-2 py-6">
                                <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                                <p className="text-sm text-muted-foreground">Không có lỗi nào</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {recentErrors.map((e: any, i: number) => (
                                    <div key={i} className="rounded-lg border border-border/40 p-2 text-xs space-y-0.5">
                                        <div className="flex items-center justify-between">
                                            <Badge variant="outline" className={`text-[10px] ${e.error_type === "frontend" ? "border-amber-500/40 text-amber-500" : "border-red-500/40 text-red-500"}`}>
                                                {e.error_type}
                                            </Badge>
                                            <span className="text-muted-foreground text-[10px]">
                                                {new Date(e.created_at).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                                            </span>
                                        </div>
                                        <p className="text-muted-foreground truncate" title={e.error_message}>
                                            {e.error_message?.slice(0, 80)}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
