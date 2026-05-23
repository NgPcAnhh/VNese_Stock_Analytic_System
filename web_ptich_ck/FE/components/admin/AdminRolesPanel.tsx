"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fetchWithAuth } from "@/lib/auth";
import { Shield, Users } from "lucide-react";
import { toast } from "sonner";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

const ROLE_COLORS: Record<string, string> = {
    admin: "bg-red-500/10 text-red-500 border-red-500/30",
    moderator: "bg-amber-500/10 text-amber-500 border-amber-500/30",
    user: "bg-blue-500/10 text-blue-500 border-blue-500/30",
};

export function AdminRolesPanel() {
    const [roles, setRoles] = useState<any[]>([]);
    const [editing, setEditing] = useState<Record<number, string>>({});
    const [loading, setLoading] = useState(true);

    const load = async () => {
        setLoading(true);
        const r = await fetchWithAuth(`${API}/admin/roles`);
        if (r.ok) setRoles(await r.json());
        setLoading(false);
    };

    useEffect(() => { load(); }, []);

    const save = async (id: number) => {
        const desc = editing[id];
        if (desc === undefined) return;
        const r = await fetchWithAuth(`${API}/admin/roles/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ description: desc }),
        });
        if (r.ok) {
            toast.success("Đã cập nhật mô tả role");
            setEditing(prev => { const n = { ...prev }; delete n[id]; return n; });
            load();
        } else {
            toast.error("Có lỗi xảy ra");
        }
    };

    if (loading) return (
        <div className="flex h-48 items-center justify-center">
            <div className="h-7 w-7 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
    );

    return (
        <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Quản lý các vai trò trong hệ thống. Chỉ có thể chỉnh sửa mô tả — tên role được cố định.</p>
            <div className="grid gap-4 md:grid-cols-3">
                {roles.map((role) => (
                    <Card key={role.id} className="border-border/50">
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Shield className="h-5 w-5 text-muted-foreground" />
                                    <CardTitle className="text-base capitalize">{role.name}</CardTitle>
                                </div>
                                <Badge className={`text-xs ${ROLE_COLORS[role.name] || ""}`} variant="outline">
                                    {role.name}
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center gap-2 text-sm">
                                <Users className="h-4 w-4 text-muted-foreground" />
                                <span className="text-muted-foreground">Số người dùng:</span>
                                <strong>{role.user_count}</strong>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs text-muted-foreground font-medium">Mô tả</label>
                                <Input
                                    value={editing[role.id] !== undefined ? editing[role.id] : (role.description || "")}
                                    onChange={(e) => setEditing(prev => ({ ...prev, [role.id]: e.target.value }))}
                                    placeholder="Nhập mô tả cho role..."
                                    className="h-8 text-sm"
                                />
                                {editing[role.id] !== undefined && (
                                    <div className="flex gap-2">
                                        <Button size="sm" className="h-7 text-xs" onClick={() => save(role.id)}>Lưu</Button>
                                        <Button variant="outline" size="sm" className="h-7 text-xs"
                                            onClick={() => setEditing(prev => { const n = { ...prev }; delete n[role.id]; return n; })}>
                                            Hủy
                                        </Button>
                                    </div>
                                )}
                            </div>

                            <div className="text-xs text-muted-foreground">
                                Tạo lúc: {new Date(role.created_at).toLocaleDateString("vi-VN")}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
