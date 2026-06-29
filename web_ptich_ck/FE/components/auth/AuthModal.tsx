'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { setTokens, AuthResponse } from '@/lib/auth';
import { X, Mail, Lock, User as UserIcon, ShieldCheck, Loader2 } from 'lucide-react';

type AuthView = 'login' | 'register' | 'forgot-password' | '2fa';
const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export function AuthModal() {
    const { isAuthModalOpen, closeAuthModal, login } = useAuth();
    const [view, setView] = useState<AuthView>('login');

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');

    // 2FA state
    const [tempToken, setTempToken] = useState('');
    const [otp, setOtp] = useState('');

    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');

    if (!isAuthModalOpen) return null;

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const res = await fetch(`${API}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.detail || 'Login failed');

            // Check if 2FA is required
            if (data.status === 'requires_2fa') {
                setTempToken(data.temp_token);
                setOtp('');
                setView('2fa');
                setLoading(false);
                return;
            }

            const authData = data as AuthResponse;
            setTokens(authData.access_token, authData.refresh_token);
            login(authData.user);
            closeAuthModal();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handle2FAVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const res = await fetch(`${API}/auth/login/2fa`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ temp_token: tempToken, otp }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.detail || 'OTP verification failed');

            const authData = data as AuthResponse;
            setTokens(authData.access_token, authData.refresh_token);
            login(authData.user);
            closeAuthModal();
        } catch (err: any) {
            setError(err.message);
            setOtp('');
        } finally {
            setLoading(false);
        }
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        if (password.length < 8) {
            setError('Mật khẩu phải từ 8 ký tự trở lên');
            setLoading(false);
            return;
        }
        try {
            const res = await fetch(`${API}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, full_name: fullName }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.detail || 'Register failed');

            const authData = data as AuthResponse;
            setTokens(authData.access_token, authData.refresh_token);
            login(authData.user);
            closeAuthModal();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleForgot = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccessMsg('');
        setLoading(true);
        try {
            const res = await fetch(`${API}/auth/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.detail || 'Request failed');
            setSuccessMsg(data.message || 'Vui lòng kiểm tra email của bạn.');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div
                className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="relative border-b border-slate-100 dark:border-slate-800 p-6 pb-4">
                    <button
                        onClick={closeAuthModal}
                        className="absolute right-4 top-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                    >
                        <X size={20} />
                    </button>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
                        {view === 'login' && 'Chào mừng trở lại'}
                        {view === 'register' && 'Tạo tài khoản'}
                        {view === 'forgot-password' && 'Khôi phục mật khẩu'}
                        {view === '2fa' && 'Xác thực 2 bước'}
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        {view === 'login' && 'Đăng nhập để lưu danh mục đầu tư'}
                        {view === 'register' && 'Bắt đầu hành trình đầu tư thông minh'}
                        {view === 'forgot-password' && 'Nhập email để nhận link tạo lại mật khẩu'}
                        {view === '2fa' && 'Nhập mã 6 chữ số từ ứng dụng Google Authenticator'}
                    </p>
                </div>

                {/* Body */}
                <div className="p-6">
                    {error && (
                        <div className="mb-4 rounded-lg bg-red-50 dark:bg-red-500/10 p-3 text-sm text-red-600 dark:text-red-400 border border-red-100 dark:border-red-500/20">
                            {error}
                        </div>
                    )}

                    {successMsg && (
                        <div className="mb-4 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 p-3 text-sm text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20">
                            {successMsg}
                        </div>
                    )}

                    {view === 'login' && (
                        <form onSubmit={handleLogin} className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Email</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                        <Mail size={18} />
                                    </div>
                                    <input
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 pl-10 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all dark:text-white"
                                        placeholder="name@example.com"
                                    />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <div className="flex items-center justify-between">
                                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Mật khẩu</label>
                                    <button type="button" onClick={() => setView('forgot-password')} className="text-sm font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400">
                                        Quên mật khẩu?
                                    </button>
                                </div>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                        <Lock size={18} />
                                    </div>
                                    <input
                                        type="password"
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 pl-10 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all dark:text-white"
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-70 disabled:cursor-not-allowed transition-all"
                            >
                                {loading ? 'Đang xử lý...' : 'Đăng nhập'}
                            </button>
                        </form>
                    )}

                    {view === '2fa' && (
                        <form onSubmit={handle2FAVerify} className="space-y-5">
                            <div className="flex justify-center">
                                <div className="size-16 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center">
                                    <ShieldCheck className="size-8 text-emerald-500" />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Mã xác thực (6 chữ số)</label>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    maxLength={6}
                                    required
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 text-center text-2xl font-mono tracking-[0.5em] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all dark:text-white"
                                    placeholder="000000"
                                    autoFocus
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading || otp.length !== 6}
                                className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-70 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="size-4 animate-spin" />
                                        Đang xác thực...
                                    </>
                                ) : (
                                    'Xác thực'
                                )}
                            </button>

                            <button
                                type="button"
                                onClick={() => { setView('login'); setError(''); setOtp(''); }}
                                className="w-full text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
                            >
                                ← Quay lại đăng nhập
                            </button>
                        </form>
                    )}

                    {view === 'register' && (
                        <form onSubmit={handleRegister} className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Họ và tên</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                        <UserIcon size={18} />
                                    </div>
                                    <input
                                        type="text"
                                        required
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 pl-10 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all dark:text-white"
                                        placeholder="Nguyễn Văn A"
                                    />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Email</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                        <Mail size={18} />
                                    </div>
                                    <input
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 pl-10 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all dark:text-white"
                                        placeholder="name@example.com"
                                    />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Mật khẩu</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                        <Lock size={18} />
                                    </div>
                                    <input
                                        type="password"
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 pl-10 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all dark:text-white"
                                        placeholder="Ít nhất 8 ký tự"
                                    />
                                </div>
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-70 disabled:cursor-not-allowed transition-all"
                            >
                                {loading ? 'Đang xử lý...' : 'Đăng ký tài khoản'}
                            </button>
                        </form>
                    )}

                    {view === 'forgot-password' && (
                        <form onSubmit={handleForgot} className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Email</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                        <Mail size={18} />
                                    </div>
                                    <input
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 pl-10 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all dark:text-white"
                                        placeholder="name@example.com"
                                    />
                                </div>
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-70 disabled:cursor-not-allowed transition-all"
                            >
                                {loading ? 'Đang gửi...' : 'Gửi link khôi phục'}
                            </button>
                        </form>
                    )}



                    <div className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
                        {view === 'login' && (
                            <p>Chưa có tài khoản? <button onClick={() => setView('register')} className="font-semibold text-blue-600 hover:text-blue-500 dark:text-blue-400">Đăng ký ngay</button></p>
                        )}
                        {view === 'register' && (
                            <p>Đã có tài khoản? <button onClick={() => setView('login')} className="font-semibold text-blue-600 hover:text-blue-500 dark:text-blue-400">Đăng nhập</button></p>
                        )}
                        {view === 'forgot-password' && (
                            <p>Nhớ mật khẩu? <button onClick={() => setView('login')} className="font-semibold text-blue-600 hover:text-blue-500 dark:text-blue-400">Đăng nhập</button></p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
