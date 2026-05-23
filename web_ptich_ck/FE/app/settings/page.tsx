"use client";

import { useState, useEffect } from "react";
import {
    useSettings,
    SIDEBAR_ICON_MAP,
    DEFAULT_SIDEBAR_ITEMS,
} from "@/lib/SettingsContext";
import { useAuth } from "@/lib/AuthContext";
import { fetchWithAuth } from "@/lib/auth";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
    User,
    Moon,
    Sun,
    ChevronUp,
    ChevronDown,
    Check,
    Crown,
    Zap,
    Shield,
    BarChart2,
    LayoutGrid,
    GripVertical,
    RefreshCcw,
    Pin,
    Lock,
    Eye,
    EyeOff,
    X,
    Smartphone,
    ShieldCheck,
    Copy,
    Loader2,
    Monitor,
    MonitorOff,
} from "lucide-react";
import { cn } from "@/lib/utils";

const API = "http://localhost:8000/api/v1/auth";

// ─── Plan data ───────────────────────────────────────────────────────────────
const PLANS = [
    {
        id: "free",
        name: "Cơ bản",
        price: "Miễn phí",
        priceNote: "mãi mãi",
        icon: Shield,
        color: "text-muted-foreground",
        borderColor: "border-border",
        badge: null,
        features: [
            "Xem giá cổ phiếu thời gian thực",
            "Biểu đồ cơ bản (1D, 1W)",
            "Tin tức thị trường",
            "5 cổ phiếu theo dõi",
            "Dữ liệu lịch sử 3 tháng",
        ],
        disabled: ["Phân tích kỹ thuật nâng cao", "Dự báo AI/ML", "API access", "Xuất báo cáo PDF"],
    },
    {
        id: "pro",
        name: "Pro",
        price: "99.000₫",
        priceNote: "/ tháng",
        icon: Zap,
        color: "text-orange-500",
        borderColor: "border-orange-400",
        badge: "Phổ biến",
        features: [
            "Tất cả tính năng Cơ bản",
            "Biểu đồ nâng cao (1m, 5m, 15m, 1H…)",
            "Phân tích kỹ thuật đầy đủ (20+ chỉ báo)",
            "Dự báo AI/ML",
            "Unlimited danh sách theo dõi",
            "Dữ liệu lịch sử 2 năm",
            "Cảnh báo giá real-time",
            "Xuất báo cáo PDF",
        ],
        disabled: ["API access không giới hạn"],
    },
    {
        id: "enterprise",
        name: "Enterprise",
        price: "299.000₫",
        priceNote: "/ tháng",
        icon: Crown,
        color: "text-yellow-500",
        borderColor: "border-yellow-400",
        badge: "Toàn quyền",
        features: [
            "Tất cả tính năng Pro",
            "API access không giới hạn",
            "Dữ liệu lịch sử 10 năm",
            "Hỗ trợ ưu tiên 24/7",
            "Môi trường sandbox riêng",
            "Tùy chỉnh dashboard không giới hạn",
            "Báo cáo phân tích chuyên sâu",
            "Multi-account management",
        ],
        disabled: [],
    },
];


// ─── Dark Mode Switch ─────────────────────────────────────────────────────────
function DarkModeSwitch({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
    return (
        <button
            role="switch"
            aria-checked={value}
            onClick={() => onChange(!value)}
            className={cn(
                "relative inline-flex h-7 w-14 items-center rounded-full transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                value ? "bg-primary" : "bg-muted-foreground/30"
            )}
        >
            <span
                className={cn(
                    "inline-flex h-5 w-5 transform items-center justify-center rounded-full bg-white shadow-md transition-transform duration-300",
                    value ? "translate-x-8" : "translate-x-1"
                )}
            >
                {value ? (
                    <Moon className="size-3 text-primary" />
                ) : (
                    <Sun className="size-3 text-yellow-500" />
                )}
            </span>
        </button>
    );
}

function PriceBoardSwitch({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
    return (
        <button
            role="switch"
            aria-checked={value}
            onClick={() => onChange(!value)}
            className={cn(
                "relative inline-flex h-7 w-14 items-center rounded-full transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                value ? "bg-emerald-500" : "bg-muted-foreground/30"
            )}
        >
            <span
                className={cn(
                    "inline-flex h-5 w-5 transform items-center justify-center rounded-full bg-white shadow-md transition-transform duration-300",
                    value ? "translate-x-8" : "translate-x-1"
                )}
            >
                {value ? (
                    <Monitor className="size-3 text-emerald-500" />
                ) : (
                    <MonitorOff className="size-3 text-muted-foreground" />
                )}
            </span>
        </button>
    );
}


// ─── Change Password Dialog ───────────────────────────────────────────────────
function ChangePasswordDialog({ onClose }: { onClose: () => void }) {
    const { logout } = useAuth();
    const [oldPassword, setOldPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showOld, setShowOld] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setSuccess("");

        if (newPassword.length < 8) {
            setError("Mật khẩu mới phải từ 8 ký tự trở lên");
            return;
        }
        if (newPassword !== confirmPassword) {
            setError("Mật khẩu xác nhận không khớp");
            return;
        }
        if (oldPassword === newPassword) {
            setError("Mật khẩu mới phải khác mật khẩu cũ");
            return;
        }

        setLoading(true);
        try {
            const res = await fetchWithAuth(`${API}/change-password`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.detail || "Đổi mật khẩu thất bại");
            setSuccess(data.message || "Đã đổi mật khẩu thành công!");
            setTimeout(() => {
                logout();
                onClose();
            }, 2000);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200">
                <div className="relative border-b border-slate-100 dark:border-slate-800 p-6 pb-4">
                    <button onClick={onClose} className="absolute right-4 top-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                        <X size={18} />
                    </button>
                    <div className="flex items-center gap-2">
                        <Lock className="size-5 text-primary" />
                        <h2 className="text-xl font-bold text-foreground">Đổi mật khẩu</h2>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">Sau khi đổi mật khẩu, bạn sẽ cần đăng nhập lại</p>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="rounded-lg bg-red-50 dark:bg-red-500/10 p-3 text-sm text-red-600 dark:text-red-400 border border-red-100 dark:border-red-500/20">
                            {error}
                        </div>
                    )}
                    {success && (
                        <div className="rounded-lg bg-emerald-50 dark:bg-emerald-500/10 p-3 text-sm text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20">
                            {success}
                        </div>
                    )}

                    <div className="space-y-1">
                        <label className="text-sm font-medium text-foreground">Mật khẩu hiện tại</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground">
                                <Lock size={16} />
                            </div>
                            <input
                                type={showOld ? "text" : "password"}
                                required
                                value={oldPassword}
                                onChange={(e) => setOldPassword(e.target.value)}
                                className="w-full rounded-lg border border-border bg-background pl-10 pr-10 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                                placeholder="Nhập mật khẩu hiện tại"
                            />
                            <button type="button" onClick={() => setShowOld(!showOld)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-foreground">
                                {showOld ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-sm font-medium text-foreground">Mật khẩu mới</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground">
                                <Lock size={16} />
                            </div>
                            <input
                                type={showNew ? "text" : "password"}
                                required
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="w-full rounded-lg border border-border bg-background pl-10 pr-10 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                                placeholder="Ít nhất 8 ký tự"
                            />
                            <button type="button" onClick={() => setShowNew(!showNew)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-foreground">
                                {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-sm font-medium text-foreground">Xác nhận mật khẩu mới</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground">
                                <Lock size={16} />
                            </div>
                            <input
                                type={showNew ? "text" : "password"}
                                required
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full rounded-lg border border-border bg-background pl-10 pr-10 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                                placeholder="Nhập lại mật khẩu mới"
                            />
                        </div>
                    </div>

                    <Button type="submit" className="w-full" disabled={loading}>
                        {loading ? (
                            <>
                                <Loader2 className="size-4 mr-2 animate-spin" />
                                Đang xử lý...
                            </>
                        ) : (
                            "Đổi mật khẩu"
                        )}
                    </Button>
                </form>
            </div>
        </div>
    );
}


// ─── 2FA Setup Dialog ─────────────────────────────────────────────────────────
function TwoFASetupDialog({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
    const [step, setStep] = useState<"loading" | "scan" | "verify">("loading");
    const [qrCode, setQrCode] = useState("");
    const [secret, setSecret] = useState("");
    const [otp, setOtp] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);

    // Fetch setup data on mount (runs once)
    useEffect(() => {
        (async () => {
            try {
                const res = await fetchWithAuth(`${API}/2fa/setup`, {
                    method: "POST",
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.detail || "Lỗi thiết lập 2FA");
                setQrCode(data.qr_code_base64);
                setSecret(data.secret);
                setStep("scan");
            } catch (err: any) {
                setError(err.message);
                setStep("scan");
            }
        })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleCopySecret = () => {
        navigator.clipboard.writeText(secret);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            const res = await fetchWithAuth(`${API}/2fa/enable`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ otp }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.detail || "Xác thực OTP thất bại");
            setSuccess("Đã bật xác thực 2 bước thành công! 🎉");
            setTimeout(() => {
                onSuccess();
                onClose();
            }, 1500);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200">
                <div className="relative border-b border-slate-100 dark:border-slate-800 p-6 pb-4">
                    <button onClick={onClose} className="absolute right-4 top-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                        <X size={18} />
                    </button>
                    <div className="flex items-center gap-2">
                        <ShieldCheck className="size-5 text-emerald-500" />
                        <h2 className="text-xl font-bold text-foreground">Thiết lập xác thực 2 bước</h2>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">Sử dụng Google Authenticator hoặc ứng dụng TOTP tương tự</p>
                </div>

                <div className="p-6 space-y-5">
                    {error && (
                        <div className="rounded-lg bg-red-50 dark:bg-red-500/10 p-3 text-sm text-red-600 dark:text-red-400 border border-red-100 dark:border-red-500/20">
                            {error}
                        </div>
                    )}
                    {success && (
                        <div className="rounded-lg bg-emerald-50 dark:bg-emerald-500/10 p-3 text-sm text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20">
                            {success}
                        </div>
                    )}

                    {step === "loading" && (
                        <div className="flex justify-center py-8">
                            <Loader2 className="size-8 animate-spin text-primary" />
                        </div>
                    )}

                    {step === "scan" && !success && (
                        <>
                            {/* Step 1: Instructions */}
                            <div className="space-y-3">
                                <div className="flex items-start gap-3 text-sm">
                                    <span className="flex-shrink-0 size-6 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-xs">1</span>
                                    <span className="text-foreground">Tải và mở ứng dụng <strong>Google Authenticator</strong> trên điện thoại</span>
                                </div>
                                <div className="flex items-start gap-3 text-sm">
                                    <span className="flex-shrink-0 size-6 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-xs">2</span>
                                    <span className="text-foreground">Quét mã QR dưới đây hoặc nhập mã thủ công</span>
                                </div>
                                <div className="flex items-start gap-3 text-sm">
                                    <span className="flex-shrink-0 size-6 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-xs">3</span>
                                    <span className="text-foreground">Nhập mã 6 chữ số từ ứng dụng để xác nhận</span>
                                </div>
                            </div>

                            {/* QR Code */}
                            {qrCode && (
                                <div className="flex flex-col items-center gap-3">
                                    <div className="p-4 bg-white rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={qrCode} alt="QR Code 2FA" className="size-48" />
                                    </div>
                                </div>
                            )}

                            {/* Manual Secret */}
                            {secret && (
                                <div className="space-y-2">
                                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Hoặc nhập mã thủ công:</p>
                                    <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2.5 border border-border">
                                        <code className="flex-1 text-sm font-mono tracking-widest text-foreground break-all">{secret}</code>
                                        <button
                                            onClick={handleCopySecret}
                                            className="shrink-0 p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                            title="Sao chép"
                                        >
                                            {copied ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* OTP Input */}
                            <form onSubmit={handleVerify} className="space-y-3">
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-foreground">Mã xác thực (6 chữ số)</label>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={6}
                                        required
                                        value={otp}
                                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                                        className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-center text-2xl font-mono tracking-[0.5em] focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                                        placeholder="000000"
                                        autoFocus
                                    />
                                </div>
                                <Button type="submit" className="w-full" disabled={loading || otp.length !== 6}>
                                    {loading ? (
                                        <>
                                            <Loader2 className="size-4 mr-2 animate-spin" />
                                            Đang xác thực...
                                        </>
                                    ) : (
                                        "Xác nhận và bật 2FA"
                                    )}
                                </Button>
                            </form>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}


// ─── 2FA Disable Dialog ───────────────────────────────────────────────────────
function TwoFADisableDialog({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
    const [otp, setOtp] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleDisable = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            const res = await fetchWithAuth(`${API}/2fa/disable`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ otp }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.detail || "Tắt 2FA thất bại");
            onSuccess();
            onClose();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200">
                <div className="relative border-b border-slate-100 dark:border-slate-800 p-6 pb-4">
                    <button onClick={onClose} className="absolute right-4 top-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                        <X size={18} />
                    </button>
                    <div className="flex items-center gap-2">
                        <Shield className="size-5 text-amber-500" />
                        <h2 className="text-xl font-bold text-foreground">Tắt xác thực 2 bước</h2>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">Nhập mã OTP từ ứng dụng xác thực để xác nhận tắt 2FA</p>
                </div>

                <form onSubmit={handleDisable} className="p-6 space-y-4">
                    {error && (
                        <div className="rounded-lg bg-red-50 dark:bg-red-500/10 p-3 text-sm text-red-600 dark:text-red-400 border border-red-100 dark:border-red-500/20">
                            {error}
                        </div>
                    )}

                    <div className="rounded-lg bg-amber-50 dark:bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-400 border border-amber-100 dark:border-amber-500/20">
                        ⚠️ Tắt 2FA sẽ giảm mức bảo mật tài khoản của bạn.
                    </div>

                    <div className="space-y-1">
                        <label className="text-sm font-medium text-foreground">Mã xác thực (6 chữ số)</label>
                        <input
                            type="text"
                            inputMode="numeric"
                            maxLength={6}
                            required
                            value={otp}
                            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                            className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-center text-2xl font-mono tracking-[0.5em] focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                            placeholder="000000"
                            autoFocus
                        />
                    </div>

                    <Button type="submit" variant="destructive" className="w-full" disabled={loading || otp.length !== 6}>
                        {loading ? (
                            <>
                                <Loader2 className="size-4 mr-2 animate-spin" />
                                Đang xử lý...
                            </>
                        ) : (
                            "Xác nhận tắt 2FA"
                        )}
                    </Button>
                </form>
            </div>
        </div>
    );
}


// ─── Settings Page ─────────────────────────────────────────────────────────────
export default function SettingsPage() {
    const {
        darkMode, setDarkMode,        showPriceBoardPopup, setShowPriceBoardPopup,        sidebarItems, moveSidebarItem, toggleSidebarItem, resetSidebarItems,
    } = useSettings();
    const { user, isAuthenticated } = useAuth();
    const [currentPlan] = useState("free");
    const [upgradeSuccess, setUpgradeSuccess] = useState<string | null>(null);

    // Dialog states
    const [showChangePassword, setShowChangePassword] = useState(false);
    const [showSetup2FA, setShowSetup2FA] = useState(false);
    const [showDisable2FA, setShowDisable2FA] = useState(false);
    const [is2FAEnabled, setIs2FAEnabled] = useState(user?.is_totp_enabled ?? false);

    const handleUpgrade = (planId: string) => {
        setUpgradeSuccess(planId);
        setTimeout(() => setUpgradeSuccess(null), 3000);
    };

    const initials = user?.full_name
        ? user.full_name.split(" ").map((n) => n[0]).slice(-2).join("").toUpperCase()
        : user?.email?.[0]?.toUpperCase() ?? "?";

    const joinedDate = user?.created_at
        ? new Date(user.created_at).toLocaleDateString("vi-VN", { year: "numeric", month: "long", day: "numeric" })
        : null;

    const isGoogleAccount = user?.auth_provider === "google";

    return (
        <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">Cài đặt</h1>
                <p className="text-muted-foreground text-sm mt-1">
                    Quản lý tài khoản, giao diện và tùy chọn hiển thị của bạn.
                </p>
            </div>

            <Tabs defaultValue="account" className="space-y-6">
                <TabsList className="grid w-full grid-cols-4 h-11">
                    <TabsTrigger value="account" className="gap-1.5 text-xs sm:text-sm">
                        <User className="size-3.5" />
                        <span className="hidden sm:inline">Tài khoản</span>
                        <span className="sm:hidden">TK</span>
                    </TabsTrigger>
                    <TabsTrigger value="plans" className="gap-1.5 text-xs sm:text-sm">
                        <Crown className="size-3.5" />
                        <span className="hidden sm:inline">Gói dịch vụ</span>
                        <span className="sm:hidden">Gói</span>
                    </TabsTrigger>
                    <TabsTrigger value="appearance" className="gap-1.5 text-xs sm:text-sm">
                        <BarChart2 className="size-3.5" />
                        <span className="hidden sm:inline">Giao diện</span>
                        <span className="sm:hidden">Giao diện</span>
                    </TabsTrigger>
                    <TabsTrigger value="layout" className="gap-1.5 text-xs sm:text-sm">
                        <LayoutGrid className="size-3.5" />
                        <span className="hidden sm:inline">Bố cục</span>
                        <span className="sm:hidden">Bố cục</span>
                    </TabsTrigger>
                </TabsList>

                {/* ── Tab: Tài khoản ─────────────────────────────────────── */}
                <TabsContent value="account" className="space-y-4">
                    <Card className="p-6">
                        <div className="flex items-start gap-6">
                            {/* Avatar */}
                            <div className="relative shrink-0">
                                {user?.avatar_url ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                        src={user.avatar_url}
                                        alt="avatar"
                                        className="size-20 rounded-full object-cover border-2 border-primary/30"
                                    />
                                ) : (
                                    <div className="size-20 rounded-full bg-primary/15 flex items-center justify-center text-primary font-bold text-2xl border-2 border-primary/30">
                                        {initials}
                                    </div>
                                )}
                                <span className={cn(
                                    "absolute bottom-0 right-0 size-4 rounded-full border-2 border-background",
                                    isAuthenticated ? "bg-green-500" : "bg-muted-foreground/50"
                                )} />
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0 space-y-3">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h2 className="text-lg font-semibold truncate text-foreground">
                                        {user?.full_name || "Chưa cập nhật tên"}
                                    </h2>
                                    <Badge variant={user?.role === "admin" ? "default" : "secondary"} className="text-xs">
                                        {user?.role === "admin" ? "Quản trị viên" : "Thành viên"}
                                    </Badge>
                                    {user?.is_verified && (
                                        <Badge variant="outline" className="text-xs text-green-500 border-green-500/50">
                                            <Check className="size-3 mr-1" /> Đã xác thực
                                        </Badge>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                                    <div className="space-y-0.5">
                                        <p className="text-xs text-muted-foreground uppercase tracking-wider">Email</p>
                                        <p className="font-medium truncate text-foreground">{user?.email || "—"}</p>
                                    </div>
                                    <div className="space-y-0.5">
                                        <p className="text-xs text-muted-foreground uppercase tracking-wider">Đăng nhập qua</p>
                                        <p className="font-medium capitalize text-foreground">{user?.auth_provider || "—"}</p>
                                    </div>
                                    {joinedDate && (
                                        <div className="space-y-0.5">
                                            <p className="text-xs text-muted-foreground uppercase tracking-wider">Thành viên từ</p>
                                            <p className="font-medium text-foreground">{joinedDate}</p>
                                        </div>
                                    )}
                                    <div className="space-y-0.5">
                                        <p className="text-xs text-muted-foreground uppercase tracking-wider">Gói hiện tại</p>
                                        <p className="font-medium text-primary">Cơ bản (Miễn phí)</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Card>

                    <Card className="p-6 space-y-4">
                        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Bảo mật</h3>
                        <Separator />
                        <div className="space-y-3">
                            {/* Change Password */}
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-medium text-sm text-foreground">Mật khẩu</p>
                                    <p className="text-xs text-muted-foreground">
                                        {isGoogleAccount
                                            ? "Tài khoản Google — không cần mật khẩu"
                                            : "Thay đổi mật khẩu đăng nhập"}
                                    </p>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={isGoogleAccount || !isAuthenticated}
                                    onClick={() => setShowChangePassword(true)}
                                >
                                    Đổi mật khẩu
                                </Button>
                            </div>

                            {/* 2FA */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <p className="font-medium text-sm text-foreground">Xác thực 2 bước</p>
                                            {is2FAEnabled && (
                                                <Badge variant="outline" className="text-xs text-emerald-500 border-emerald-500/50">
                                                    <ShieldCheck className="size-3 mr-1" /> Đang bật
                                                </Badge>
                                            )}
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            {is2FAEnabled
                                                ? "Tài khoản được bảo vệ bởi Google Authenticator"
                                                : "Tăng cường bảo mật bằng Google Authenticator"}
                                        </p>
                                    </div>
                                </div>
                                {is2FAEnabled ? (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="text-red-500 border-red-300 hover:bg-red-50 dark:hover:bg-red-500/10"
                                        onClick={() => setShowDisable2FA(true)}
                                        disabled={!isAuthenticated}
                                    >
                                        Tắt 2FA
                                    </Button>
                                ) : (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="text-emerald-600 border-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-500/10"
                                        onClick={() => setShowSetup2FA(true)}
                                        disabled={!isAuthenticated}
                                    >
                                        <Smartphone className="size-3.5 mr-1.5" />
                                        Bật 2FA
                                    </Button>
                                )}
                            </div>
                        </div>
                    </Card>
                </TabsContent>

                {/* ── Tab: Gói dịch vụ ──────────────────────────────────── */}
                <TabsContent value="plans" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {PLANS.map((plan) => {
                            const Icon = plan.icon;
                            const isCurrent = plan.id === currentPlan;
                            return (
                                <Card
                                    key={plan.id}
                                    className={cn(
                                        "p-6 flex flex-col gap-5 relative transition-all duration-200",
                                        isCurrent && "ring-2 ring-primary shadow-md",
                                        plan.borderColor
                                    )}
                                >
                                    {isCurrent && (
                                        <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-semibold px-3 py-0.5 rounded-full">
                                            Gói hiện tại
                                        </span>
                                    )}
                                    {plan.badge && !isCurrent && (
                                        <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-orange-500 text-white text-xs font-semibold px-3 py-0.5 rounded-full">
                                            {plan.badge}
                                        </span>
                                    )}
                                    <div className="space-y-2">
                                        <div className={cn("flex items-center gap-2", plan.color)}>
                                            <Icon className="size-5" />
                                            <span className="font-bold text-base">{plan.name}</span>
                                        </div>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-2xl font-bold text-foreground">{plan.price}</span>
                                            <span className="text-xs text-muted-foreground">{plan.priceNote}</span>
                                        </div>
                                    </div>
                                    <Separator />
                                    <ul className="space-y-2 flex-1">
                                        {plan.features.map((f) => (
                                            <li key={f} className="flex items-start gap-2 text-sm text-foreground">
                                                <Check className="size-3.5 text-green-500 mt-0.5 shrink-0" />
                                                <span>{f}</span>
                                            </li>
                                        ))}
                                        {plan.disabled.map((f) => (
                                            <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground/50 line-through">
                                                <Check className="size-3.5 mt-0.5 shrink-0 opacity-30" />
                                                <span>{f}</span>
                                            </li>
                                        ))}
                                    </ul>
                                    <Button
                                        className="w-full mt-2"
                                        variant={isCurrent ? "outline" : plan.id === "pro" ? "default" : "outline"}
                                        disabled={isCurrent}
                                        onClick={() => handleUpgrade(plan.id)}
                                    >
                                        {isCurrent
                                            ? "Đang sử dụng"
                                            : upgradeSuccess === plan.id
                                              ? "✓ Đã đăng ký!"
                                              : `Nâng cấp lên ${plan.name}`}
                                    </Button>
                                </Card>
                            );
                        })}
                    </div>
                    <p className="text-xs text-center text-muted-foreground">
                        Tất cả gói đều bao gồm 7 ngày dùng thử miễn phí. Hủy bất kỳ lúc nào.
                    </p>
                </TabsContent>

                {/* ── Tab: Giao diện ────────────────────────────────────── */}
                <TabsContent value="appearance" className="space-y-4">
                    {/* Dark mode toggle */}
                    <Card className="p-6">
                        <div className="flex items-center justify-between gap-4">
                            <div className="space-y-1.5">
                                <div className="flex items-center gap-2">
                                    {darkMode ? <Moon className="size-4 text-primary" /> : <Sun className="size-4 text-yellow-500" />}
                                    <h3 className="font-semibold text-foreground">Chế độ tối</h3>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    Chuyển đổi giữa giao diện sáng và tối. Thay đổi áp dụng ngay, lưu vĩnh viễn.
                                </p>
                                <Badge variant="outline" className="text-xs w-fit text-foreground">
                                    {darkMode ? "Đang bật — Dark mode" : "Đang tắt — Light mode"}
                                </Badge>
                            </div>
                            <DarkModeSwitch value={darkMode} onChange={setDarkMode} />
                        </div>
                    </Card>

                    {/* Price Board Popup toggle */}
                    <Card className="p-6">
                        <div className="flex items-center justify-between gap-4">
                            <div className="space-y-1.5">
                                <div className="flex items-center gap-2">
                                    {showPriceBoardPopup ? <Monitor className="size-4 text-emerald-500" /> : <MonitorOff className="size-4 text-muted-foreground" />}
                                    <h3 className="font-semibold text-foreground">Bảng điện iframe</h3>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    Bật tính năng hiển thị iframe bảng điện thu nhỏ trong giờ giao dịch từ thứ 2 đến thứ 6 (9h - 15h).
                                </p>
                                <Badge variant="outline" className="text-xs w-fit text-foreground">
                                    {showPriceBoardPopup ? "Đang bật" : "Đang tắt"}
                                </Badge>
                            </div>
                            <PriceBoardSwitch value={showPriceBoardPopup} onChange={setShowPriceBoardPopup} />
                        </div>
                    </Card>

                </TabsContent>

                {/* ── Tab: Bố cục — Sidebar nav items ──────────────────── */}
                <TabsContent value="layout" className="space-y-4">
                    <Card className="p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <h3 className="font-semibold text-foreground">Menu điều hướng (Sidebar)</h3>
                                <p className="text-sm text-muted-foreground">
                                    Ẩn/hiện và sắp xếp thứ tự các mục trong sidebar. Thay đổi lưu tự động.
                                </p>
                            </div>
                            <Button variant="outline" size="sm" onClick={resetSidebarItems} className="gap-1.5 shrink-0">
                                <RefreshCcw className="size-3.5" />
                                Đặt lại
                            </Button>
                        </div>

                        <Separator />

                        <div className="space-y-2">
                            {sidebarItems.map((item, index) => {
                                const IconComponent = SIDEBAR_ICON_MAP[item.iconName];
                                const isPinned = item.id === "settings";
                                return (
                                    <div
                                        key={item.id}
                                        className={cn(
                                            "flex items-center gap-3 rounded-lg border px-4 py-3 transition-all duration-150",
                                            item.enabled
                                                ? "bg-card hover:bg-muted/40"
                                                : "bg-muted/20 opacity-60"
                                        )}
                                    >
                                        <GripVertical className="size-4 text-muted-foreground/40 shrink-0" />

                                        {/* Order number */}
                                        <span className="size-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">
                                            {index + 1}
                                        </span>

                                        {/* Icon */}
                                        {IconComponent && (
                                            <IconComponent className={cn(
                                                "size-4 shrink-0",
                                                item.enabled ? "text-foreground" : "text-muted-foreground"
                                            )} />
                                        )}

                                        {/* Label + pinned badge */}
                                        <span className={cn(
                                            "flex-1 text-sm font-medium",
                                            !item.enabled && "line-through text-muted-foreground",
                                            item.enabled && "text-foreground"
                                        )}>
                                            {item.name}
                                        </span>

                                        {isPinned && (
                                            <Badge variant="secondary" className="text-xs gap-1 shrink-0">
                                                <Pin className="size-2.5" /> Cố định
                                            </Badge>
                                        )}

                                        {/* Toggle */}
                                        <button
                                            onClick={() => toggleSidebarItem(item.id)}
                                            disabled={isPinned}
                                            title={isPinned ? "Mục này không thể ẩn" : item.enabled ? "Ẩn khỏi sidebar" : "Hiện trong sidebar"}
                                            className={cn(
                                                "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40 disabled:cursor-not-allowed",
                                                item.enabled ? "bg-primary" : "bg-muted-foreground/30"
                                            )}
                                        >
                                            <span className={cn(
                                                "inline-block size-3.5 transform rounded-full bg-white shadow-sm transition-transform",
                                                item.enabled ? "translate-x-4" : "translate-x-1"
                                            )} />
                                        </button>

                                        {/* Move up/down */}
                                        <div className="flex flex-col gap-0.5 shrink-0">
                                            <button
                                                onClick={() => moveSidebarItem(index, index - 1)}
                                                disabled={index === 0}
                                                className="p-0.5 rounded hover:bg-muted text-muted-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                            >
                                                <ChevronUp className="size-3.5" />
                                            </button>
                                            <button
                                                onClick={() => moveSidebarItem(index, index + 1)}
                                                disabled={index === sidebarItems.length - 1}
                                                className="p-0.5 rounded hover:bg-muted text-muted-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                            >
                                                <ChevronDown className="size-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <p className="text-xs text-muted-foreground">
                            Mục <span className="font-medium text-foreground">Cài đặt</span> luôn hiển thị và không thể ẩn.
                        </p>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Dialogs */}
            {showChangePassword && (
                <ChangePasswordDialog onClose={() => setShowChangePassword(false)} />
            )}
            {showSetup2FA && (
                <TwoFASetupDialog
                    onClose={() => setShowSetup2FA(false)}
                    onSuccess={() => setIs2FAEnabled(true)}
                />
            )}
            {showDisable2FA && (
                <TwoFADisableDialog
                    onClose={() => setShowDisable2FA(false)}
                    onSuccess={() => setIs2FAEnabled(false)}
                />
            )}
        </div>
    );
}
