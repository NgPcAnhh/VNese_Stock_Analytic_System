"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fetchWithAuth } from "@/lib/auth";
import { Monitor, Wifi, WifiOff, Trash2 } from "lucide-react";
import { toast } from "sonner";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

export function AdminSessionsPanel() {
    const [sessions, setSessions] = useState<any[]>([]);
    const [tokens, setTokens] = useState<any[]>([]);
    const [totalSessions, setTotalSessions] = useState(0);
    const [totalTokens, setTotalTokens] = useState(0);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<"sessions" | "tokens">("sessions");

    const load = async () => {
        setLoading(true);
        try {
            const [r1, r2] = await Promise.all([
                fetchWithAuth(`${API}/admin/sessions?page=1&size=30&only_active=true`),
                fetchWithAuth(`${API}/admin/tokens?page=1&size=30&only_active=true`),
            ]);
            if (r1.ok) { const d = await r1.json(); setSessions(d.items); setTotalSessions(d.total); }
            if (r2.ok) { const d = await r2.json(); setTokens(d.items); setTotalTokens(d.total); }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const revokeToken = async (id: number) => {
        const r = await fetchWithAuth(`${API}/admin/tokens/${id}`, { method: "DELETE" });
        if (r.ok) { toast.success("Đã thu hồi token"); load(); }
        else toast.error("Có lỗi xảy ra");
    };

    const fmtDuration = (s: number) => {
        if (s < 60) return `${s}s`;
        if (s < 3600) return `${Math.floor(s / 60)}m ${s % 60}s`;
        return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
    };

    const fmtDatetime = (d: string) =>
        new Date(d).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

    return (
        <div className="space-y-4">
            <div className="flex gap-2">
                <Button variant={tab === "sessions" ? "default" : "outline"} size="sm" onClick={() => setTab("sessions")}>
                    Active Sessions ({totalSessions})
                </Button>
                <Button variant={tab === "tokens" ? "default" : "outline"} size="sm" onClick={() => setTab("tokens")}>
                    Refresh Tokens ({totalTokens})
                </Button>
            </div>

            {loading ? (
                <div className="flex h-48 items-center justify-center">
                    <div className="h-7 w-7 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                </div>
            ) : tab === "sessions" ? (
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {sessions.length === 0 ? (
                        <div className="text-center text-muted-foreground col-span-3 py-12">Không có phiên đang hoạt động</div>
                    ) : sessions.map((s, i) => (
                        <Card key={i} className="border-border/50">
                            <CardContent className="p-4 space-y-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Wifi className="h-4 w-4 text-green-500" />
                                        <span className="text-xs font-mono text-muted-foreground">{s.session_id?.slice(0, 12)}...</span>
                                    </div>
                                    <Badge variant={s.user_email ? "default" : "outline"} className="text-xs">
                                        {s.user_email ? "Auth" : "Anon"}
                                    </Badge>
                                </div>
                                {s.user_email && <div className="text-sm font-medium">{s.user_email}</div>}
                                <div className="text-xs text-muted-foreground space-y-1">
                                    <div>IP: {s.ip_address || "—"}</div>
                                    <div>Bắt đầu: {fmtDatetime(s.started_at)}</div>
                                    <div>Cuối: {fmtDatetime(s.last_seen_at)}</div>
                                    <div>Thời gian: {fmtDuration(s.duration_seconds)}</div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : (
                <div className="rounded-md border border-border/50 overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-muted/50 border-b border-border/50">
                            <tr>
                                <th className="text-left px-4 py-3 font-medium text-muted-foreground">User</th>
                                <th className="text-left px-4 py-3 font-medium text-muted-foreground">IP / Thiết bị</th>
                                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Tạo lúc</th>
                                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Hết hạn</th>
                                <th className="px-4 py-3" />
                            </tr>
                        </thead>
                        <tbody>
                            {tokens.map((t) => (
                                <tr key={t.id} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                                    <td className="px-4 py-3">{t.user_email || `User #${t.user_id}`}</td>
                                    <td className="px-4 py-3 text-xs text-muted-foreground">
                                        <div>{t.ip_address || "—"}</div>
                                        <div className="truncate max-w-[180px]" title={t.device_info}>{t.device_info || "—"}</div>
                                    </td>
                                    <td className="px-4 py-3 text-xs text-muted-foreground">{fmtDatetime(t.created_at)}</td>
                                    <td className="px-4 py-3 text-xs text-muted-foreground">{fmtDatetime(t.expires_at)}</td>
                                    <td className="px-4 py-3">
                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => revokeToken(t.id)}>
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {tokens.length === 0 && (
                        <div className="text-center text-muted-foreground py-12">Không có refresh token đang hoạt động</div>
                    )}
                </div>
            )}
        </div>
    );
}
