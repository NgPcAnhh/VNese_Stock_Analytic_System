"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Users, UserPlus, Activity, Lock, LogIn, Clock,
    TrendingUp, MousePointer, Search, Wifi, ShieldOff
} from "lucide-react";

interface AdminStatsCardsProps {
    stats: any | null;
}

const CARDS = [
    {
        title: "Tổng Người Dùng",
        key: "total_users",
        icon: Users,
        color: "text-blue-500",
        bg: "bg-blue-500/10",
        sub: (s: any) => `${s.active_users} đang hoạt động`,
    },
    {
        title: "Người Dùng Mới (7 ngày)",
        key: "new_users_7d",
        icon: UserPlus,
        color: "text-green-500",
        bg: "bg-green-500/10",
        sub: (s: any) => `${s.new_users_30d} trong 30 ngày`,
    },
    {
        title: "Đăng Nhập (30 ngày)",
        key: "total_logins_30d",
        icon: LogIn,
        color: "text-orange-500",
        bg: "bg-orange-500/10",
        sub: (s: any) => `${s.logins_today} hôm nay`,
    },
    {
        title: "Phiên Hôm Nay",
        key: "sessions_today",
        icon: Clock,
        color: "text-purple-500",
        bg: "bg-purple-500/10",
        sub: (s: any) => s.avg_session_duration_today ? `TB ${Math.round(s.avg_session_duration_today)}s/phiên` : null,
    },
    {
        title: "Active Sessions",
        key: "active_sessions_count",
        icon: Wifi,
        color: "text-emerald-500",
        bg: "bg-emerald-500/10",
        sub: () => "Đang trực tuyến",
    },
    {
        title: "Kích Hoạt 2FA",
        key: "totp_enabled_count",
        icon: Lock,
        color: "text-amber-500",
        bg: "bg-amber-500/10",
        sub: (s: any) => {
            const pct = s.total_users ? Math.round(100 * s.totp_enabled_count / s.total_users) : 0;
            return `${pct}% tài khoản`;
        },
    },
    {
        title: "Tìm Kiếm (7 ngày)",
        key: "total_search_events_7d",
        icon: Search,
        color: "text-sky-500",
        bg: "bg-sky-500/10",
        sub: () => "Tìm kiếm tin tức",
    },
    {
        title: "Click Mã CK (7 ngày)",
        key: "total_stock_clicks_7d",
        icon: MousePointer,
        color: "text-indigo-500",
        bg: "bg-indigo-500/10",
        sub: () => "Lượt xem chi tiết CK",
    },
    {
        title: "Click Bài Báo (7 ngày)",
        key: "total_article_clicks_7d",
        icon: TrendingUp,
        color: "text-pink-500",
        bg: "bg-pink-500/10",
        sub: () => "Lượt click bài viết",
    },
    {
        title: "Tài Khoản Bị Khóa",
        key: "inactive_users",
        icon: ShieldOff,
        color: "text-red-500",
        bg: "bg-red-500/10",
        sub: (s: any) => `${s.total_users - s.inactive_users} đang active`,
    },
    {
        title: "Google OAuth",
        key: "google_auth_count",
        icon: Activity,
        color: "text-rose-500",
        bg: "bg-rose-500/10",
        sub: (s: any) => `${s.local_auth_count} local`,
    },
    {
        title: "Admin",
        key: null,
        icon: Lock,
        color: "text-violet-500",
        bg: "bg-violet-500/10",
        sub: (s: any) => {
            const dist = s.role_distribution || {};
            return `${dist.moderator || 0} moderator`;
        },
        getValue: (s: any) => s.role_distribution?.admin || 0,
    },
];

export function AdminStatsCards({ stats }: AdminStatsCardsProps) {
    if (!stats) return null;

    return (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {CARDS.map((card, i) => {
                const value = card.getValue ? card.getValue(stats) : stats[card.key!];
                const sub = card.sub(stats);
                return (
                    <Card key={i} className="overflow-hidden border-border/50 hover:border-border transition-colors">
                        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                            <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
                            <div className={`p-2 rounded-full ${card.bg}`}>
                                <card.icon className={`h-4 w-4 ${card.color}`} />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{value ?? "—"}</div>
                            {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
}
