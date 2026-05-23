'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lock } from 'lucide-react';

function ResetPasswordForm() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const [token, setToken] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        const urlToken = searchParams.get('token');
        if (urlToken) {
            setToken(urlToken);
        } else {
            setError('Thiếu token khôi phục mật khẩu hợp lệ.');
        }
    }, [searchParams]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError('Mật khẩu không khớp.');
            return;
        }

        if (password.length < 8) {
            setError('Mật khẩu phải từ 8 ký tự trở lên.');
            return;
        }

        setLoading(true);

        try {
            const res = await fetch('http://localhost:8000/api/v1/auth/reset-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    token,
                    new_password: password
                })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.detail || 'Không thể khôi phục mật khẩu.');
            }

            setSuccess(true);
            setTimeout(() => {
                router.push('/');
            }, 3000);

        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="flex flex-col items-center justify-center p-8 text-center animate-in zoom-in-95 duration-300">
                <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                </div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Đổi mật khẩu thành công!</h2>
                <p className="text-slate-500 max-w-sm mb-6">Mật khẩu của bạn đã được cập nhật an toàn. Hệ thống sẽ tự động chuyển về trang chủ trong vài giây.</p>
                <button
                    onClick={() => router.push('/')}
                    className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition"
                >
                    Về trang chủ ngay
                </button>
            </div>
        );
    }

    return (
        <div className="w-full max-w-md p-8 bg-white border border-slate-200 shadow-xl rounded-2xl dark:bg-slate-900 dark:border-slate-800">
            <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">Tạo mật khẩu mới</h2>
                <p className="text-sm text-slate-500">Vui lòng nhập mật khẩu mới cho tài khoản của bạn.</p>
            </div>

            {error && (
                <div className="mb-6 rounded-lg bg-red-50 p-4 text-sm text-red-600 border border-red-100 dark:bg-red-500/10 dark:border-red-500/20">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Mật khẩu mới</label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                            <Lock size={18} />
                        </div>
                        <input
                            type="password"
                            required
                            disabled={!token || loading}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 pl-10 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all dark:text-white disabled:bg-slate-50 disabled:text-slate-500"
                            placeholder="Ít nhất 8 ký tự"
                        />
                    </div>
                </div>

                <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Xác nhận mật khẩu</label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                            <Lock size={18} />
                        </div>
                        <input
                            type="password"
                            required
                            disabled={!token || loading}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 pl-10 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all dark:text-white disabled:bg-slate-50 disabled:text-slate-500"
                            placeholder="Nhập lại mật khẩu"
                        />
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={!token || loading}
                    className="w-full rounded-lg bg-blue-600 mt-2 py-2.5 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-70 disabled:cursor-not-allowed transition-all"
                >
                    {loading ? 'Đang cập nhật...' : 'Đổi mật khẩu'}
                </button>
            </form>
        </div>
    );
}

export default function ResetPasswordPage() {
    return (
        <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
            <Suspense fallback={<div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600"></div>}>
                <ResetPasswordForm />
            </Suspense>
        </div>
    );
}
