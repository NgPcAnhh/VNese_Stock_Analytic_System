"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, UserPlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { fetchWithAuth } from "@/lib/auth";

interface AdminCreateUserModalProps {
    onClose: () => void;
    onSuccess: () => void;
}

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

export function AdminCreateUserModal({ onClose, onSuccess }: AdminCreateUserModalProps) {
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [fullName, setFullName] = useState("");
    const [role, setRole] = useState("user");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Register user first
            const res = await fetch(`${API}/auth/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password, full_name: fullName }),
            });

            if (!res.ok) {
                const err = await res.json();
                toast.error(err.detail || "Không thể tạo tài khoản");
                setLoading(false);
                return;
            }

            const data = await res.json();
            const newUserId = data.user.id;

            // Update role if not 'user'
            if (role !== "user") {
                const roleId = role === "admin" ? 2 : role === "moderator" ? 3 : 1;
                await fetchWithAuth(`${API}/admin/users/${newUserId}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ role_id: roleId }),
                });
            }

            toast.success("Đã tạo người dùng mới thành công");
            onSuccess();
        } catch (error) {
            console.error(error);
            toast.error("Có lỗi xảy ra khi tạo người dùng");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-md bg-card rounded-xl shadow-xl border border-border/50 animate-in fade-in zoom-in duration-200">
                <div className="flex items-center justify-between p-4 border-b border-border/50">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                        <UserPlus className="h-5 w-5 text-primary" /> Tạo Người Dùng Mới
                    </h2>
                    <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
                        <X className="h-4 w-4" />
                    </Button>
                </div>
                
                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Họ và Tên</label>
                        <Input 
                            placeholder="Nhập họ tên" 
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            required
                        />
                    </div>
                    
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Email</label>
                        <Input 
                            type="email"
                            placeholder="Nhập email" 
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Mật khẩu</label>
                        <Input 
                            type="password"
                            placeholder="Nhập mật khẩu" 
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            minLength={6}
                        />
                    </div>
                    
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Vai trò</label>
                        <select 
                            className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            value={role}
                            onChange={(e) => setRole(e.target.value)}
                        >
                            <option value="user">User</option>
                            <option value="moderator">Moderator</option>
                            <option value="admin">Admin</option>
                        </select>
                    </div>

                    <div className="pt-4 flex justify-end gap-2">
                        <Button variant="outline" type="button" onClick={onClose} disabled={loading}>
                            Hủy
                        </Button>
                        <Button type="submit" disabled={loading} className="min-w-[120px]">
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Tạo Tài Khoản"}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
