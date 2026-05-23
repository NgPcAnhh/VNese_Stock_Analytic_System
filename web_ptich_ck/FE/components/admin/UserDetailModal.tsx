"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fetchWithAuth } from "@/lib/auth";
import { X, LogIn, Clock, Search, TrendingUp, Shield, Key } from "lucide-react";
import { toast } from "sonner";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

interface UserDetailModalProps {
    userId: number;
    onClose: () => void;
}

export function UserDetailModal({ userId, onClose }: UserDetailModalProps) {
    const [detail, setDetail] = useState<any>(null);
    const [tab, setTab] = useState<"info" | "logins" | "sessions">("info");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchWithAuth(`${API}/admin/users/${userId}`)
            .then(r => r.ok ? r.json() : null)
            .then(d => { setDetail(d); setLoading(false); });
    }, [userId]);

    const revokeAll = async () => {
        const r = await fetchWithAuth(`${API}/admin/users/${userId}/sessions`, { method: "DELETE" });
        if (r.ok) {
            const d = await r.json();
            toast.success(`Đã thu hồi ${d.revoked_count} tokens`);
        }
    };

    const fmtDt = (s: string) => s ? new Date(s).toLocaleString("vi-VN", {
        day: "2-digit", month: "2-digit", year: "numeric",
        hour: "2-digit", minute: "2-digit"
    }) : "—";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <div className="bg-card rounded-2xl border border-border shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-border">
                    <h2 className="text-lg font-bold">Chi Tiết Người Dùng</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-muted transition-colors">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {loading ? (
                    <div className="flex flex-1 items-center justify-center">
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                    </div>
                ) : !detail ? (
                    <div className="flex flex-1 items-center justify-center text-muted-foreground">Không tìm thấy thông tin</div>
                ) : (
                    <>
                        {/* User summary header */}
                        <div className="p-6 bg-muted/30 border-b border-border">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xl font-bold overflow-hidden">
                                    {detail.user.avatar_url
                                        ? <img src={detail.user.avatar_url} alt="" className="w-full h-full object-cover" />
                                        : (detail.user.full_name?.[0] || detail.user.email[0]).toUpperCase()
                                    }
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-semibold truncate">{detail.user.full_name || detail.user.email}</div>
                                    <div className="text-sm text-muted-foreground">{detail.user.email}</div>
                                    <div className="flex gap-2 mt-1 flex-wrap">
                                        <Badge variant="outline" className="text-xs capitalize">{detail.user.role}</Badge>
                                        <Badge variant="outline" className="text-xs">{detail.user.auth_provider}</Badge>
                                        {detail.user.is_totp_enabled && <Badge className="text-xs bg-green-500/10 text-green-500 border-none">2FA ON</Badge>}
                                        {!detail.user.is_active && <Badge variant="destructive" className="text-xs">Bị khóa</Badge>}
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3 text-center shrink-0">
                                    {[
                                        { icon: LogIn, label: "Đăng nhập", value: detail.login_count },
                                        { icon: Search, label: "Tìm kiếm", value: detail.total_search_count },
                                        { icon: TrendingUp, label: "Click CK", value: detail.total_stock_click_count },
                                        { icon: Key, label: "Tokens", value: detail.active_token_count },
                                    ].map(({ icon: Icon, label, value }) => (
                                        <div key={label} className="text-center">
                                            <div className="text-lg font-bold">{value}</div>
                                            <div className="text-xs text-muted-foreground">{label}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Tabs */}
                        <div className="flex border-b border-border px-6">
                            {[
                                { key: "info", label: "Thông tin" },
                                { key: "logins", label: `Đăng nhập (${detail.last_10_logins?.length})` },
                                { key: "sessions", label: `Phiên (${detail.recent_sessions?.length})` },
                            ].map(({ key, label }) => (
                                <button
                                    key={key}
                                    onClick={() => setTab(key as any)}
                                    className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${tab === key
                                        ? "border-primary text-primary"
                                        : "border-transparent text-muted-foreground hover:text-foreground"
                                    }`}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>

                        {/* Tab content */}
                        <div className="flex-1 overflow-y-auto p-6">
                            {tab === "info" && (
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    {[
                                        ["ID", detail.user.id],
                                        ["Email", detail.user.email],
                                        ["Tên", detail.user.full_name || "—"],
                                        ["Role", detail.user.role],
                                        ["Provider", detail.user.auth_provider],
                                        ["Trạng thái", detail.user.is_active ? "Hoạt động" : "Bị khóa"],
                                        ["Xác thực email", detail.user.is_verified ? "Đã xác thực" : "Chưa xác thực"],
                                        ["2FA", detail.user.is_totp_enabled ? "Bật" : "Tắt"],
                                        ["Đăng nhập cuối", fmtDt(detail.user.last_login_at)],
                                        ["Ngày tạo", fmtDt(detail.user.created_at)],
                                        ["Cập nhật", fmtDt(detail.user.updated_at)],
                                    ].map(([label, value]) => (
                                        <div key={String(label)} className="space-y-0.5">
                                            <div className="text-muted-foreground">{label}</div>
                                            <div className="font-medium">{String(value)}</div>
                                        </div>
                                    ))}
                                    <div className="col-span-2 pt-2 border-t border-border">
                                        <Button variant="destructive" size="sm" onClick={revokeAll}>
                                            Thu Hồi Tất Cả Tokens
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {tab === "logins" && (
                                <div className="space-y-2">
                                    {detail.last_10_logins?.map((l: any, i: number) => (
                                        <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/40">
                                            <div className="flex items-center gap-3">
                                                <div className={`h-2 w-2 rounded-full ${l.success ? "bg-green-500" : "bg-red-500"}`} />
                                                <div>
                                                    <div className="text-sm font-medium capitalize">{l.method}</div>
                                                    <div className="text-xs text-muted-foreground">{l.ip_address || "—"}</div>
                                                </div>
                                            </div>
                                            <div className="text-xs text-muted-foreground">{fmtDt(l.login_at)}</div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {tab === "sessions" && (
                                <div className="space-y-2">
                                    {detail.recent_sessions?.map((s: any, i: number) => (
                                        <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/40">
                                            <div>
                                                <div className="text-xs font-mono text-muted-foreground">{s.session_id?.slice(0, 16)}...</div>
                                                <div className="text-xs text-muted-foreground mt-1">
                                                    {fmtDt(s.started_at)} → {fmtDt(s.last_seen_at)}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <Badge variant={s.ended ? "outline" : "default"} className="text-xs">
                                                    {s.ended ? "Kết thúc" : "Đang hoạt động"}
                                                </Badge>
                                                <div className="text-xs text-muted-foreground mt-1">{s.duration_seconds}s</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
