"use client";

import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { fetchWithAuth } from "@/lib/auth";
import { DEFAULT_SIDEBAR_ITEMS } from "@/lib/SettingsContext";
import { ScrollArea } from "@/components/ui/scroll-area";

const API = process.env.NEXT_PUBLIC_API_URL ?? "/api/v1";

interface AdminCreateRoleModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

export function AdminCreateRoleModal({ open, onOpenChange, onSuccess }: AdminCreateRoleModalProps) {
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [permissions, setPermissions] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);

    const handleTogglePermission = (id: string) => {
        setPermissions(prev =>
            prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
        );
    };

    const handleSelectAll = () => {
        if (permissions.length === DEFAULT_SIDEBAR_ITEMS.length) {
            setPermissions([]);
        } else {
            setPermissions(DEFAULT_SIDEBAR_ITEMS.map(i => i.id));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!name.trim()) {
            toast.error("Vui lòng nhập tên role");
            return;
        }

        setLoading(true);
        try {
            const res = await fetchWithAuth(`${API}/admin/roles`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    name: name.trim().toLowerCase(), 
                    description: description.trim() || undefined,
                    permissions: permissions 
                }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.detail || "Không thể tạo role");
            }

            toast.success("Đã tạo vai trò mới thành công!");
            setName("");
            setDescription("");
            setPermissions([]);
            onSuccess();
            onOpenChange(false);
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px] flex flex-col max-h-[90vh]">
                <DialogHeader>
                    <DialogTitle>Tạo Vai Trò Mới</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
                    <div className="grid gap-4 py-4 flex-1 overflow-hidden">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Tên vai trò (Key)</Label>
                            <Input
                                id="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="vd: editor, manager..."
                                disabled={loading}
                            />
                            <p className="text-[10px] text-muted-foreground">Tên viết thường, không dấu, không khoảng trắng (vd: "content_creator").</p>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="desc">Mô tả</Label>
                            <Input
                                id="desc"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Mô tả chức năng của role này..."
                                disabled={loading}
                            />
                        </div>
                        
                        <div className="flex flex-col gap-2 min-h-0">
                            <div className="flex items-center justify-between">
                                <Label>Quyền hạn Sidebar</Label>
                                <Button type="button" variant="ghost" size="sm" className="h-6 text-[10px]" onClick={handleSelectAll}>
                                    {permissions.length === DEFAULT_SIDEBAR_ITEMS.length ? "Bỏ chọn tất cả" : "Chọn tất cả"}
                                </Button>
                            </div>
                            <ScrollArea className="h-[200px] border rounded-md p-2">
                                <div className="space-y-2">
                                    {DEFAULT_SIDEBAR_ITEMS.map(item => (
                                        <div key={item.id} className="flex items-center space-x-2">
                                            <Checkbox 
                                                id={`new-perm-${item.id}`} 
                                                checked={permissions.includes(item.id)}
                                                onCheckedChange={() => handleTogglePermission(item.id)}
                                            />
                                            <label 
                                                htmlFor={`new-perm-${item.id}`}
                                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                            >
                                                {item.name}
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        </div>
                    </div>
                    <DialogFooter className="pt-2 mt-auto">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                            Hủy
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? "Đang xử lý..." : "Tạo vai trò"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
