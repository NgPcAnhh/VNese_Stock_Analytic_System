'use client';

import { useEffect, Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { setTokens, AuthResponse } from '@/lib/auth';

function CallbackContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { login } = useAuth();
    const [error, setError] = useState('');

    useEffect(() => {
        const accessToken = searchParams.get('access_token');
        const refreshToken = searchParams.get('refresh_token');

        if (accessToken && refreshToken) {
            // Lưu lại tokens
            setTokens(accessToken, refreshToken);

            // Fetch thông tin user để update AuthContext
            fetch('http://localhost:8000/api/v1/auth/me', {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            })
                .then(res => res.json())
                .then(userData => {
                    login(userData);
                    // Điều hướng mượt mà về trang chủ sau khi lưu thông tin
                    router.push('/');
                })
                .catch((err) => {
                    console.error('Lỗi khi fetch user từ callback', err);
                    setError('Có lỗi khi xác thực tài khoản qua Google.');
                });
        } else {
            const err = searchParams.get('error');
            setError(err || 'Thiếu thông tin xác thực từ URL.');
        }
    }, [searchParams, router, login]);

    return (
        <div className="flex h-screen w-full items-center justify-center bg-muted/20">
            <div className="text-center w-full max-w-sm p-6 bg-white rounded-xl shadow-lg border border-slate-100 dark:border-slate-800 dark:bg-slate-900">
                {error ? (
                    <div>
                        <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                        </div>
                        <h2 className="mb-2 text-xl font-semibold">Đăng nhập thất bại</h2>
                        <p className="mb-6 text-sm text-slate-500">{error}</p>
                        <button
                            onClick={() => router.push('/')}
                            className="w-full rounded-lg bg-slate-900 py-2.5 text-sm font-medium text-white hover:bg-slate-800 transition-colors"
                        >
                            Quay về trang chủ
                        </button>
                    </div>
                ) : (
                    <div>
                        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600"></div>
                        <h2 className="text-xl font-semibold">Đang xác thực...</h2>
                        <p className="mt-2 text-sm text-slate-500">Xin vui lòng chờ một chút để chúng tôi thiết lập phiên đăng nhập cho bạn.</p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function AuthCallback() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600"></div></div>}>
            <CallbackContent />
        </Suspense>
    );
}
