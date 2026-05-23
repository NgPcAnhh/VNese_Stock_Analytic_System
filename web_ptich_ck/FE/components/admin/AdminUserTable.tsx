"use client";

import { useEffect, useState } from "react";
import {
    Table,
    TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { fetchWithAuth } from "@/lib/auth";
import { useAuth } from "@/lib/AuthContext";
import { Search, Loader2, Eye, Trash2, Key, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { UserDetailModal } from "./UserDetailModal";

interface UserAdminResponse {
    id: number;
    email: string;
    full_name: string | null;
    avatar_url: string | null;
    role: string;
    role_id: number;
    auth_provider: string;
    is_active: boolean;
    is_verified: boolean;
    is_totp_enabled: boolean;
    last_login_at: string | null;
    created_at: string;
}

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

export function AdminUserTable() {
    const { user: currentUser } = useAuth();
    const [users, setUsers] = useState<UserAdminResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [roleFilter, setRoleFilter] = useState("all");
    const [providerFilter, setProviderFilter] = useState("all");
    const [activeFilter, setActiveFilter] = useState("all");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalUsers, setTotalUsers] = useState(0);
    const [detailUserId, setDetailUserId] = useState<number | null>(null);

    const loadUsers = async () => {
        setLoading(true);
        try {
            let url = `${API}/admin/users?page=${page}&size=15`;
            if (search) url += `&q=${encodeURIComponent(search)}`;
            if (roleFilter !== "all") url += `&role=${roleFilter}`;
            if (providerFilter !== "all") url += `&auth_provider=${providerFilter}`;
            if (activeFilter !== "all") url += `&is_active=${activeFilter === "active"}`;

            const res = await fetchWithAuth(url);
            if (res.ok) {
                const data = await res.json();
                setUsers(data.items);
                setTotalPages(data.pages);
                setTotalUsers(data.total);
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const t = setTimeout(loadUsers, 300);
        return () => clearTimeout(t);
    }, [page, search, roleFilter, providerFilter, activeFilter]);

    const patchUser = async (id: number, body: object) => {
        const r = await fetchWithAuth(`${API}/admin/users/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });
        if (r.ok) {
            const updated = await r.json();
            setUsers(us => us.map(u => u.id === id ? updated : u));
            toast.success("Đã cập nhật");
        } else {
            const err = await r.json();
            toast.error(err.detail || "Có lỗi xảy ra");
        }
    };

    const revokeAll = async (id: number, email: string) => {
        if (!confirm(`Thu hồi tất cả sessions của ${email}?`)) return;
        const r = await fetchWithAuth(`${API}/admin/users/${id}/sessions`, { method: "DELETE" });
        if (r.ok) { const d = await r.json(); toast.success(`Đã thu hồi ${d.revoked_count} tokens`); }
        else toast.error("Có lỗi xảy ra");
    };

    const deleteUser = async (id: number, email: string) => {
        if (!confirm(`XÓA VĨNH VIỄN tài khoản ${email}? Hành động này không thể hoàn tác.`)) return;
        const r = await fetchWithAuth(`${API}/admin/users/${id}`, { method: "DELETE" });
        if (r.ok) { toast.success("Đã xóa user"); setUsers(us => us.filter(u => u.id !== id)); }
        else toast.error("Không thể xóa user");
    };

    const handleRoleChange = (userId: number, value: string) => {
        const roles: Record<string, number> = { user: 1, admin: 2, moderator: 3 };
        patchUser(userId, { role_id: roles[value] });
    };

    const fmtDate = (s: string | null) => s
        ? new Date(s).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "2-digit" })
        : "—";

    return (
        <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap gap-3 items-center justify-between">
                <div className="flex flex-wrap gap-2 items-center">
                    <div className="relative w-64">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Tìm email, tên..." className="pl-8 h-9" value={search}
                            onChange={e => { setSearch(e.target.value); setPage(1); }} />
                    </div>
                    <Select value={roleFilter} onValueChange={v => { setRoleFilter(v); setPage(1); }}>
                        <SelectTrigger className="w-32 h-9"><SelectValue placeholder="Role" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Tất cả</SelectItem>
                            <SelectItem value="user">User</SelectItem>
                            <SelectItem value="moderator">Moderator</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                    </Select>
                    <Select value={providerFilter} onValueChange={v => { setProviderFilter(v); setPage(1); }}>
                        <SelectTrigger className="w-32 h-9"><SelectValue placeholder="Provider" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Tất cả</SelectItem>
                            <SelectItem value="local">Local</SelectItem>
                            <SelectItem value="google">Google</SelectItem>
                        </SelectContent>
                    </Select>
                    <Select value={activeFilter} onValueChange={v => { setActiveFilter(v); setPage(1); }}>
                        <SelectTrigger className="w-32 h-9"><SelectValue placeholder="Trạng thái" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Tất cả</SelectItem>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="inactive">Bị khóa</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={loadUsers}>
                        <RefreshCw className="h-3.5 w-3.5 mr-1" /> Làm mới
                    </Button>
                    <span className="text-sm text-muted-foreground">Tổng: <strong>{totalUsers}</strong></span>
                </div>
            </div>

            {/* Table */}
            <div className="rounded-md border border-border/50 overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Email</TableHead>
                            <TableHead>Tên</TableHead>
                            <TableHead>Vai trò</TableHead>
                            <TableHead>Provider</TableHead>
                            <TableHead>Bảo mật</TableHead>
                            <TableHead>Đăng nhập cuối</TableHead>
                            <TableHead>Active</TableHead>
                            <TableHead className="text-right">Hành động</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow><TableCell colSpan={8} className="h-24 text-center">
                                <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                            </TableCell></TableRow>
                        ) : users.length === 0 ? (
                            <TableRow><TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                                Không có kết quả
                            </TableCell></TableRow>
                        ) : users.map((u) => (
                            <TableRow key={u.id} className="group">
                                <TableCell className="font-medium max-w-[180px] truncate" title={u.email}>{u.email}</TableCell>
                                <TableCell className="max-w-[120px] truncate">{u.full_name || "—"}</TableCell>
                                <TableCell>
                                    <Select value={u.role} onValueChange={v => handleRoleChange(u.id, v)} disabled={u.id === currentUser?.id}>
                                        <SelectTrigger className="w-28 h-7 text-xs"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="user">User</SelectItem>
                                            <SelectItem value="moderator">Moderator</SelectItem>
                                            <SelectItem value="admin">Admin</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </TableCell>
                                <TableCell>
                                    <Badge variant="outline" className={`text-xs ${u.auth_provider === "google" ? "border-red-500/40 text-red-500" : ""}`}>
                                        {u.auth_provider}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    {u.is_totp_enabled
                                        ? <Badge className="text-xs bg-green-500/10 text-green-500 border-none">2FA ✓</Badge>
                                        : <span className="text-xs text-muted-foreground">—</span>
                                    }
                                </TableCell>
                                <TableCell className="text-xs text-muted-foreground">{fmtDate(u.last_login_at)}</TableCell>
                                <TableCell>
                                    <Switch checked={u.is_active} disabled={u.id === currentUser?.id}
                                        onCheckedChange={c => patchUser(u.id, { is_active: c })} />
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button variant="ghost" size="icon" className="h-7 w-7" title="Chi tiết"
                                            onClick={() => setDetailUserId(u.id)}>
                                            <Eye className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-amber-500 hover:text-amber-500" title="Thu hồi sessions"
                                            onClick={() => revokeAll(u.id, u.email)}>
                                            <Key className="h-3.5 w-3.5" />
                                        </Button>
                                        {u.id !== currentUser?.id && (
                                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" title="Xóa user"
                                                onClick={() => deleteUser(u.id, u.email)}>
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        )}
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1 || loading}>Trước</Button>
                <span className="text-sm">Trang {page} / {totalPages || 1}</span>
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages || loading}>Sau</Button>
            </div>

            {/* User Detail Modal */}
            {detailUserId !== null && (
                <UserDetailModal userId={detailUserId} onClose={() => setDetailUserId(null)} />
            )}
        </div>
    );
}
