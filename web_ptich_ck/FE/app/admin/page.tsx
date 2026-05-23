"use client";

import { useEffect, useState } from "react";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { AdminStatsCards } from "@/components/admin/AdminStatsCards";
import { AdminOverviewPanel } from "@/components/admin/AdminOverviewPanel";
import { AdminUserTable } from "@/components/admin/AdminUserTable";
import { AdminAnalyticsPanel } from "@/components/admin/AdminAnalyticsPanel";
import { AdminDataHealthPanel } from "@/components/admin/AdminDataHealthPanel";
import { AdminSessionsPanel } from "@/components/admin/AdminSessionsPanel";
import { AdminRolesPanel } from "@/components/admin/AdminRolesPanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { fetchWithAuth } from "@/lib/auth";
import {
    ShieldCheck, Users, BarChart3, Monitor, Shield, RefreshCw,
    Database, LayoutDashboard, UserPlus, LogIn, Wifi, Search,
    AlertTriangle, TrendingUp
} from "lucide-react";
import { Button } from "@/components/ui/button";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

export default function AdminDashboardPage() {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    const loadStats = async () => {
        setLoading(true);
        try {
            const res = await fetchWithAuth(`${API}/admin/stats`);
            if (res.ok) {
                setStats(await res.json());
                setLastUpdated(new Date());
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadStats(); }, []);

    return (
        <AdminGuard>
            <div className="min-h-screen bg-background">
                <div className="container mx-auto py-8 px-4 max-w-7xl space-y-6">

                    {/* Hero Header */}
                    <div className="flex items-start justify-between flex-wrap gap-4">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 text-primary border border-primary/20">
                                <ShieldCheck className="h-8 w-8" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold tracking-tight">Quản Trị Hệ Thống</h1>
                                <p className="text-muted-foreground mt-0.5">
                                    Admin Dashboard — Toàn bộ hoạt động hệ thống
                                </p>
                                {lastUpdated && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Cập nhật lúc: {lastUpdated.toLocaleTimeString("vi-VN")}
                                    </p>
                                )}
                            </div>
                        </div>
                        <Button variant="outline" size="sm" onClick={loadStats} disabled={loading} className="gap-2">
                            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                            Làm mới
                        </Button>
                    </div>

                    {/* ═══ Row 1: 6 old stat cards (compact) ═══ */}
                    {stats && !loading && (
                        <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
                            {[
                                { label: "Tổng User", value: stats.total_users, icon: Users, color: "#3b82f6" },
                                { label: "Mới 7 ngày", value: stats.new_users_7d, icon: UserPlus, color: "#22c55e" },
                                { label: "Đăng nhập hôm nay", value: stats.logins_today, icon: LogIn, color: "#f59e0b" },
                                { label: "Phiên hôm nay", value: stats.sessions_today, icon: Monitor, color: "#a855f7" },
                                { label: "Active sessions", value: stats.active_sessions_count, icon: Wifi, color: "#10b981" },
                                { label: "User bị khóa", value: stats.inactive_users, icon: Shield, color: "#ef4444" },
                            ].map(({ label, value, icon: Icon, color }) => (
                                <div key={label} className="rounded-xl border border-border/50 px-3 py-2 flex items-center gap-2.5">
                                    <div className="p-1.5 rounded-lg shrink-0" style={{ backgroundColor: `${color}18` }}>
                                        <Icon className="h-3.5 w-3.5" style={{ color }} />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="text-base font-bold leading-tight">{value ?? 0}</div>
                                        <div className="text-[10px] text-muted-foreground leading-tight truncate">{label}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* ═══ Row 2: 6 new KPI cards (compact) ═══ */}
                    {stats && !loading && (
                        <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
                            {[
                                { label: "Click bài báo (7 ngày)", value: stats.total_article_clicks_7d, icon: BarChart3, color: "#6366f1" },
                                { label: "Click mã CK (7 ngày)", value: stats.total_stock_clicks_7d, icon: TrendingUp, color: "#ec4899" },
                                { label: "2FA kích hoạt", value: stats.totp_enabled_count, icon: ShieldCheck, color: "#f97316" },
                                { label: "Phiên đang online", value: stats.active_sessions_count, icon: Wifi, color: "#10b981" },
                                { label: "Tìm kiếm (7 ngày)", value: stats.total_search_events_7d, icon: Search, color: "#0ea5e9" },
                                { label: "Lỗi (30 ngày)", value: stats.error_count_30d ?? 0, icon: AlertTriangle, color: "#ef4444" },
                            ].map(({ label, value, icon: Icon, color }) => (
                                <div key={label} className="rounded-xl border border-border/50 px-3 py-2 flex items-center gap-2.5">
                                    <div className="p-1.5 rounded-lg shrink-0" style={{ backgroundColor: `${color}18` }}>
                                        <Icon className="h-3.5 w-3.5" style={{ color }} />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="text-base font-bold leading-tight">{value ?? 0}</div>
                                        <div className="text-[10px] text-muted-foreground leading-tight truncate">{label}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* ═══ Tab Navigation ═══ */}
                    <Tabs defaultValue="overview" className="w-full">
                        <TabsList className="grid w-full grid-cols-6 max-w-3xl mb-6">
                            <TabsTrigger value="overview" className="flex gap-1.5 items-center text-xs sm:text-sm">
                                <LayoutDashboard className="h-3.5 w-3.5" /> Tổng Quan
                            </TabsTrigger>
                            <TabsTrigger value="users" className="flex gap-1.5 items-center text-xs sm:text-sm">
                                <Users className="h-3.5 w-3.5" /> Người Dùng
                            </TabsTrigger>
                            <TabsTrigger value="analytics" className="flex gap-1.5 items-center text-xs sm:text-sm">
                                <BarChart3 className="h-3.5 w-3.5" /> Hành Vi
                            </TabsTrigger>
                            <TabsTrigger value="data" className="flex gap-1.5 items-center text-xs sm:text-sm">
                                <Database className="h-3.5 w-3.5" /> Dữ Liệu
                            </TabsTrigger>
                            <TabsTrigger value="sessions" className="flex gap-1.5 items-center text-xs sm:text-sm">
                                <Monitor className="h-3.5 w-3.5" /> Phiên
                            </TabsTrigger>
                            <TabsTrigger value="roles" className="flex gap-1.5 items-center text-xs sm:text-sm">
                                <Shield className="h-3.5 w-3.5" /> Vai Trò
                            </TabsTrigger>
                        </TabsList>

                        {/* ── Tab: Overview ── */}
                        <TabsContent value="overview" className="space-y-6">
                            {loading ? (
                                <div className="flex h-64 items-center justify-center">
                                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                                </div>
                            ) : stats ? (
                                <AdminOverviewPanel stats={stats} />
                            ) : null}
                        </TabsContent>

                        {/* ── Tab: Users ── */}
                        <TabsContent value="users">
                            <div className="bg-card rounded-xl p-6 border border-border/50 shadow-sm">
                                <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                                    <Users className="h-5 w-5" /> Quản Lý Tài Khoản Người Dùng
                                </h2>
                                <AdminUserTable />
                            </div>
                        </TabsContent>

                        {/* ── Tab: Analytics (Hành Vi) ── */}
                        <TabsContent value="analytics">
                            <div className="bg-card rounded-xl p-6 border border-border/50 shadow-sm">
                                <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                                    <BarChart3 className="h-5 w-5" /> Phân Tích Hành Vi Người Dùng
                                </h2>
                                <AdminAnalyticsPanel />
                            </div>
                        </TabsContent>

                        {/* ── Tab: Data Health (MỚI) ── */}
                        <TabsContent value="data">
                            <div className="bg-card rounded-xl p-6 border border-border/50 shadow-sm">
                                <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                                    <Database className="h-5 w-5" /> Giám Sát Dữ Liệu
                                </h2>
                                <AdminDataHealthPanel />
                            </div>
                        </TabsContent>

                        {/* ── Tab: Sessions ── */}
                        <TabsContent value="sessions">
                            <div className="bg-card rounded-xl p-6 border border-border/50 shadow-sm">
                                <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                                    <Monitor className="h-5 w-5" /> Quản Lý Phiên & Token
                                </h2>
                                <AdminSessionsPanel />
                            </div>
                        </TabsContent>

                        {/* ── Tab: Roles ── */}
                        <TabsContent value="roles">
                            <div className="bg-card rounded-xl p-6 border border-border/50 shadow-sm">
                                <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                                    <Shield className="h-5 w-5" /> Quản Lý Vai Trò
                                </h2>
                                <AdminRolesPanel />
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </AdminGuard>
    );
}
