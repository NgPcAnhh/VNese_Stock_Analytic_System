"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, UserPlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { fetchWithAuth } from "@/lib/auth";

interface AdminCreateUserModalProps {
    onClose: () => void;
    onSuccess: () => void;
}

const API = process.env.NEXT_PUBLIC_API_URL ?? "/api/v1";

export function AdminCreateUserModal({ onClose, onSuccess }: AdminCreateUserModalProps) {
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [fullName, setFullName] = useState("");
    const [role, setRole] = useState("user");
    const [roles, setRoles] = useState<{id: number, name: string}[]>([]);

    useEffect(() => {
        fetchWithAuth(`${API}/admin/roles`)
            .then(r => r.ok ? r.json() : [])
            .then(data => setRoles(data));
    }, []);

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
                let errorMsg = "Không thể tạo tài khoản";
                if (err && err.detail) {
                    if (typeof err.detail === "string") {
                        errorMsg = err.detail;
                    } else if (Array.isArray(err.detail)) {
                        errorMsg = err.detail.map((e: any) => e.msg).join(", ");
                    }
                }
                toast.error(errorMsg);
                setLoading(false);
                return;
            }

            const data = await res.json();
            const newUserId = data.user.id;

            // Update role if not 'user'
            if (role !== "user") {
                const selectedRole = roles.find(r => r.name === role);
                if (selectedRole) {
                    await fetchWithAuth(`${API}/admin/users/${newUserId}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ role_id: selectedRole.id }),
                    });
                }
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
                            minLength={2}
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
                            placeholder="Nhập mật khẩu (tối thiểu 8 ký tự)" 
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            minLength={8}
                        />
                    </div>
                    
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Vai trò</label>
                        <select 
                            className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 capitalize"
                            value={role}
                            onChange={(e) => setRole(e.target.value)}
                        >
                            {roles.map(r => (
                                <option key={r.id} value={r.name}>{r.name}</option>
                            ))}
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
