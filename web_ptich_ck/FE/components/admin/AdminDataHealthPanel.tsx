"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fetchWithAuth } from "@/lib/auth";
import {
    Database, HardDrive, Clock, AlertTriangle,
    CheckCircle2, TrendingUp, FileText, BarChart3, RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

const TABLE_LABELS: Record<string, { label: string; icon: any; color: string }> = {
    history_price: { label: "Giá lịch sử", icon: TrendingUp, color: "text-blue-500" },
    realtime_quotes: { label: "Giá realtime", icon: BarChart3, color: "text-green-500" },
    financial_ratio: { label: "Chỉ số tài chính", icon: FileText, color: "text-purple-500" },
    bctc: { label: "Báo cáo tài chính", icon: FileText, color: "text-indigo-500" },
    news: { label: "Tin tức", icon: FileText, color: "text-orange-500" },
    company_overview: { label: "Thông tin DN", icon: HardDrive, color: "text-sky-500" },
    market_index: { label: "Chỉ số thị trường", icon: TrendingUp, color: "text-emerald-500" },
    // Tracking tables
    page_views: { label: "Lượt xem trang", icon: Database, color: "text-blue-400" },
    analysis_views: { label: "Lượt phân tích", icon: Database, color: "text-violet-400" },
    error_logs: { label: "Lỗi hệ thống", icon: AlertTriangle, color: "text-red-400" },
    article_clicks: { label: "Click bài báo", icon: Database, color: "text-pink-400" },
    search_logs: { label: "Tìm kiếm", icon: Database, color: "text-cyan-400" },
    stock_clicks: { label: "Click mã CK", icon: Database, color: "text-amber-400" },
    session_logs: { label: "Phiên làm việc", icon: Database, color: "text-purple-400" },
    login_logs: { label: "Đăng nhập", icon: Database, color: "text-green-400" },
};

function formatNumber(n: number): string {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
    if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
    return String(n);
}

function isStale(dateStr: string | null): boolean {
    if (!dateStr) return true;
    const d = new Date(dateStr);
    const now = new Date();
    const diffHours = (now.getTime() - d.getTime()) / (1000 * 60 * 60);
    return diffHours > 48;
}

export function AdminDataHealthPanel() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const load = async () => {
        setLoading(true);
        try {
            const res = await fetchWithAuth(`${API}/admin/data-health`);
            if (res.ok) setData(await res.json());
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    if (loading) return (
        <div className="flex h-64 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
    );

    if (!data) return (
        <div className="text-center text-muted-foreground py-12">Không thể tải dữ liệu sức khỏe hệ thống</div>
    );

    const stockTables = data.stock_tables ?? [];
    const trackingTables = data.tracking_tables ?? [];

    const totalStockRows = stockTables.reduce((a: number, t: any) => a + (parseInt(t.row_count) || 0), 0);
    const totalTrackingRows = trackingTables.reduce((a: number, t: any) => a + (parseInt(t.row_count) || 0), 0);
    const staleCount = stockTables.filter((t: any) => isStale(t.latest_date)).length;

    return (
        <div className="space-y-6">
            {/* Refresh button */}
            <div className="flex justify-end">
                <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-2">
                    <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                    Làm mới
                </Button>
            </div>

            {/* Summary KPIs */}
            <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
                <Card className="border-border/50">
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-blue-500/10">
                            <Database className="h-5 w-5 text-blue-500" />
                        </div>
                        <div>
                            <div className="text-xl font-bold">{formatNumber(totalStockRows)}</div>
                            <div className="text-xs text-muted-foreground">Bản ghi dữ liệu CK</div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-border/50">
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-green-500/10">
                            <HardDrive className="h-5 w-5 text-green-500" />
                        </div>
                        <div>
                            <div className="text-xl font-bold">{formatNumber(totalTrackingRows)}</div>
                            <div className="text-xs text-muted-foreground">Bản ghi tracking</div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-border/50">
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-emerald-500/10">
                            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                        </div>
                        <div>
                            <div className="text-xl font-bold">{stockTables.length + trackingTables.length}</div>
                            <div className="text-xs text-muted-foreground">Tổng bảng dữ liệu</div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-border/50">
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${staleCount > 0 ? "bg-amber-500/10" : "bg-emerald-500/10"}`}>
                            {staleCount > 0
                                ? <AlertTriangle className="h-5 w-5 text-amber-500" />
                                : <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                            }
                        </div>
                        <div>
                            <div className="text-xl font-bold">{staleCount}</div>
                            <div className="text-xs text-muted-foreground">Bảng dữ liệu cũ (&gt;48h)</div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Stock Data Tables */}
            <Card className="border-border/50">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-blue-500" />
                        Dữ Liệu Chứng Khoán
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border border-border/50 overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-muted/50 border-b border-border/50">
                                <tr>
                                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Bảng</th>
                                    <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Số bản ghi</th>
                                    <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Mã CK</th>
                                    <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Dữ liệu mới nhất</th>
                                    <th className="text-center px-4 py-2.5 font-medium text-muted-foreground">Trạng thái</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stockTables.map((t: any, i: number) => {
                                    const info = TABLE_LABELS[t.table_name] ?? { label: t.table_name, icon: Database, color: "text-muted-foreground" };
                                    const stale = isStale(t.latest_date);
                                    const Icon = info.icon;
                                    return (
                                        <tr key={i} className="border-b border-border/30 last:border-0 hover:bg-muted/20 transition-colors">
                                            <td className="px-4 py-2.5">
                                                <div className="flex items-center gap-2">
                                                    <Icon className={`h-4 w-4 ${info.color}`} />
                                                    <span className="font-medium">{info.label}</span>
                                                    <span className="text-xs text-muted-foreground">({t.table_name})</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-2.5 text-right font-mono">
                                                {formatNumber(parseInt(t.row_count) || 0)}
                                            </td>
                                            <td className="px-4 py-2.5 text-right">
                                                {parseInt(t.unique_tickers) > 0 ? (
                                                    <Badge variant="outline" className="text-xs">{t.unique_tickers}</Badge>
                                                ) : "—"}
                                            </td>
                                            <td className="px-4 py-2.5 text-right text-xs text-muted-foreground">
                                                {t.latest_date ? t.latest_date.slice(0, 19) : "—"}
                                            </td>
                                            <td className="px-4 py-2.5 text-center">
                                                {t.latest_date ? (
                                                    stale ? (
                                                        <Badge className="text-xs bg-amber-500/10 text-amber-500 border-amber-500/30" variant="outline">
                                                            <AlertTriangle className="h-3 w-3 mr-1" /> Cũ
                                                        </Badge>
                                                    ) : (
                                                        <Badge className="text-xs bg-green-500/10 text-green-500 border-green-500/30" variant="outline">
                                                            <CheckCircle2 className="h-3 w-3 mr-1" /> OK
                                                        </Badge>
                                                    )
                                                ) : (
                                                    <Badge variant="outline" className="text-xs">N/A</Badge>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            {/* Tracking Tables */}
            <Card className="border-border/50">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                        <BarChart3 className="h-4 w-4 text-purple-500" />
                        Bảng Tracking Hệ Thống
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
                        {trackingTables.map((t: any, i: number) => {
                            const info = TABLE_LABELS[t.table_name] ?? { label: t.table_name, icon: Database, color: "text-muted-foreground" };
                            const Icon = info.icon;
                            return (
                                <div
                                    key={i}
                                    className="rounded-lg border border-border/50 p-3 hover:bg-muted/20 transition-colors"
                                >
                                    <div className="flex items-center gap-2 mb-2">
                                        <Icon className={`h-4 w-4 ${info.color}`} />
                                        <span className="text-xs font-medium truncate">{info.label}</span>
                                    </div>
                                    <div className="text-lg font-bold">{formatNumber(parseInt(t.row_count) || 0)}</div>
                                    <div className="text-[10px] text-muted-foreground mt-1">
                                        {t.latest ? `Cuối: ${new Date(t.latest).toLocaleDateString("vi-VN")}` : "Chưa có dữ liệu"}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
