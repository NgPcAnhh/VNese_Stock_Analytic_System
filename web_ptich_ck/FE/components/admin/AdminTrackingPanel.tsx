"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface AdminTrackingPanelProps {
    trackingStats: any | null;
}

export function AdminTrackingPanel({ trackingStats }: AdminTrackingPanelProps) {
    if (!trackingStats) return null;

    // Process login stats for chart
    const loginData = [...trackingStats.login_stats].reverse().map((item: any) => ({
        date: new Date(item.date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }),
        "Thành công": item.success_count,
        "Thất bại": item.fail_count
    }));

    return (
        <div className="grid gap-6 md:grid-cols-2">
            <Card className="md:col-span-2 border-border/50">
                <CardHeader>
                    <CardTitle>Xu Hướng Đăng Nhập (30 Ngày Gần Nhất)</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={loginData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorSuccess" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                                    </linearGradient>
                                    <linearGradient id="colorFail" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.8}/>
                                        <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="date" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`} />
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
                                    itemStyle={{ color: 'hsl(var(--foreground))' }}
                                />
                                <Area type="monotone" dataKey="Thành công" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorSuccess)" />
                                <Area type="monotone" dataKey="Thất bại" stroke="hsl(var(--destructive))" fillOpacity={1} fill="url(#colorFail)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>

            <Card className="border-border/50">
                <CardHeader>
                    <CardTitle>Top Tìm Kiếm Mã CK</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {trackingStats.hot_stock_searches?.map((item: any, i: number) => (
                            <div key={i} className="flex items-center justify-between">
                                <span className="font-medium">{item.keyword}</span>
                                <span className="text-muted-foreground">{item.search_count} lượt</span>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            <Card className="border-border/50">
                <CardHeader>
                    <CardTitle>Top Menu Được Click</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {trackingStats.sidebar_stats?.slice(0, 10).map((item: any, i: number) => (
                            <div key={i} className="flex items-center justify-between">
                                <span className="font-medium truncate mr-2" title={item.menu_name}>
                                    {item.menu_name}
                                </span>
                                <span className="text-muted-foreground whitespace-nowrap">{item.click_count} lượt</span>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
