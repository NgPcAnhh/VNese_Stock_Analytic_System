"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fetchWithAuth } from "@/lib/auth";
import { Shield, Users, Plus, Check } from "lucide-react";
import { toast } from "sonner";
import { AdminCreateRoleModal } from "./AdminCreateRoleModal";
import { DEFAULT_SIDEBAR_ITEMS } from "@/lib/SettingsContext";
import { Checkbox } from "@/components/ui/checkbox";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

const ROLE_COLORS: Record<string, string> = {
    admin: "bg-red-500/10 text-red-500 border-red-500/30",
    moderator: "bg-amber-500/10 text-amber-500 border-amber-500/30",
    user: "bg-blue-500/10 text-blue-500 border-blue-500/30",
};

interface EditState {
    description: string;
    permissions: string[];
}

export function AdminRolesPanel() {
    const [roles, setRoles] = useState<any[]>([]);
    const [editing, setEditing] = useState<Record<number, EditState>>({});
    const [loading, setLoading] = useState(true);
    const [createModalOpen, setCreateModalOpen] = useState(false);

    const load = async () => {
        setLoading(true);
        const r = await fetchWithAuth(`${API}/admin/roles`);
        if (r.ok) setRoles(await r.json());
        setLoading(false);
    };

    useEffect(() => { load(); }, []);

    const startEditing = (role: any) => {
        setEditing(prev => ({
            ...prev,
            [role.id]: {
                description: role.description || "",
                permissions: role.permissions || [],
            }
        }));
    };

    const togglePermission = (roleId: number, permId: string) => {
        setEditing(prev => {
            const current = prev[roleId];
            if (!current) return prev;
            
            const has = current.permissions.includes(permId);
            const newPerms = has 
                ? current.permissions.filter(p => p !== permId)
                : [...current.permissions, permId];
                
            return {
                ...prev,
                [roleId]: { ...current, permissions: newPerms }
            };
        });
    };

    const save = async (id: number) => {
        const state = editing[id];
        if (!state) return;
        
        const r = await fetchWithAuth(`${API}/admin/roles/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                description: state.description,
                permissions: state.permissions,
            }),
        });
        if (r.ok) {
            toast.success("Đã cập nhật vai trò");
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
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <p className="text-sm text-muted-foreground">
                    Quản lý các vai trò trong hệ thống và thiết lập quyền truy cập Sidebar cho từng vai trò.
                </p>
                <Button onClick={() => setCreateModalOpen(true)} size="sm" className="gap-2">
                    <Plus className="h-4 w-4" /> Tạo Vai Trò
                </Button>
            </div>
            
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {roles.map((role) => {
                    const isEditing = editing[role.id] !== undefined;
                    const currentState = editing[role.id];
                    
                    return (
                        <Card key={role.id} className="border-border/50 flex flex-col">
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
                            <CardContent className="space-y-4 flex-1 flex flex-col">
                                <div className="flex items-center gap-2 text-sm">
                                    <Users className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-muted-foreground">Số người dùng:</span>
                                    <strong>{role.user_count}</strong>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs text-muted-foreground font-medium">Mô tả</label>
                                        {!isEditing && (
                                            <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => startEditing(role)}>
                                                Chỉnh sửa
                                            </Button>
                                        )}
                                    </div>
                                    
                                    {isEditing ? (
                                        <Input
                                            value={currentState.description}
                                            onChange={(e) => setEditing(prev => ({ ...prev, [role.id]: { ...currentState, description: e.target.value } }))}
                                            placeholder="Nhập mô tả cho role..."
                                            className="h-8 text-sm"
                                        />
                                    ) : (
                                        <p className="text-sm min-h-[32px]">{role.description || <span className="italic text-muted-foreground">Chưa có mô tả</span>}</p>
                                    )}
                                </div>

                                {/* Permissions List */}
                                <div className="space-y-2 flex-1">
                                    <label className="text-xs text-muted-foreground font-medium">Quyền hạn Sidebar</label>
                                    <div className="bg-muted/30 rounded-md border p-2 h-[150px] overflow-y-auto space-y-1">
                                        {DEFAULT_SIDEBAR_ITEMS.map(item => {
                                            const isChecked = isEditing 
                                                ? currentState.permissions.includes(item.id)
                                                : (role.permissions || []).includes(item.id);
                                                
                                            return (
                                                <div key={item.id} className="flex items-center justify-between p-1 rounded hover:bg-muted/50">
                                                    <div className="flex items-center space-x-2">
                                                        {isEditing ? (
                                                            <Checkbox 
                                                                id={`perm-${role.id}-${item.id}`} 
                                                                checked={isChecked}
                                                                onCheckedChange={() => togglePermission(role.id, item.id)}
                                                            />
                                                        ) : (
                                                            <div className="w-4 h-4 flex items-center justify-center">
                                                                {isChecked && <Check className="h-3.5 w-3.5 text-green-500" />}
                                                            </div>
                                                        )}
                                                        <label 
                                                            htmlFor={`perm-${role.id}-${item.id}`}
                                                            className={`text-xs ${isEditing ? 'cursor-pointer' : ''} ${isChecked ? 'font-medium' : 'text-muted-foreground'}`}
                                                        >
                                                            {item.name}
                                                        </label>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {isEditing ? (
                                    <div className="flex gap-2 pt-2">
                                        <Button size="sm" className="flex-1 h-8 text-xs" onClick={() => save(role.id)}>Lưu thay đổi</Button>
                                        <Button variant="outline" size="sm" className="flex-1 h-8 text-xs"
                                            onClick={() => setEditing(prev => { const n = { ...prev }; delete n[role.id]; return n; })}>
                                            Hủy
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="text-xs text-muted-foreground pt-2">
                                        Tạo lúc: {new Date(role.created_at).toLocaleDateString("vi-VN")}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
            
            <AdminCreateRoleModal 
                open={createModalOpen} 
                onOpenChange={setCreateModalOpen} 
                onSuccess={load}
            />
        </div>
    );
}
