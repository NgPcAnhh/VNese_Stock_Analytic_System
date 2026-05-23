"use client";

import { Facebook, Linkedin, Mail, MapPin, Phone, Twitter, Youtube } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";

export function Footer() {
    const { isAuthenticated } = useAuth();

    if (isAuthenticated) {
        return null;
    }

    return (
        <footer className="relative w-full overflow-hidden border-t border-orange-200/40 bg-gradient-to-b from-[#fff8f1] via-[#fff3e6] to-[#fff] pt-14 pb-8 text-slate-800">
            <div className="pointer-events-none absolute -top-24 -left-24 h-64 w-64 rounded-full bg-orange-300/25 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-28 -right-20 h-72 w-72 rounded-full bg-amber-200/25 blur-3xl" />

            <div className="container relative mx-auto px-6">
                <div className="mb-10 grid grid-cols-1 gap-5 lg:grid-cols-12">
                    <div className="rounded-2xl border border-orange-200/80 bg-white/85 p-6 shadow-[0_10px_30px_rgba(251,146,60,0.08)] backdrop-blur-sm lg:col-span-7">
                        <div className="flex items-center gap-3 text-2xl font-bold text-orange-600">
                            <img
                                src="/favicon.ico"
                                alt="StockPro Logo"
                                className="h-10 w-10 rounded-xl border border-orange-200 bg-white object-contain"
                            />
                            <span>StockPro</span>
                        </div>
                        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600">
                            Hệ sinh thái dữ liệu và phân tích đầu tư dành cho thị trường Việt Nam. Tập trung vào tốc độ, độ tin cậy và trải nghiệm trực quan để hỗ trợ nhà đầu tư đưa ra quyết định tốt hơn mỗi phiên.
                        </p>
                        <div className="mt-5 flex flex-wrap items-center gap-2 text-xs">
                            <span className="rounded-full border border-orange-200 bg-orange-50 px-3 py-1 font-semibold text-orange-700">Realtime Market Data</span>
                            <span className="rounded-full border border-orange-200 bg-orange-50 px-3 py-1 font-semibold text-orange-700">Smart Screener</span>
                            <span className="rounded-full border border-orange-200 bg-orange-50 px-3 py-1 font-semibold text-orange-700">Portfolio Insights</span>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-sm lg:col-span-5">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-orange-600">Nhận bản tin thị trường</p>
                        <h4 className="mt-2 text-lg font-bold text-slate-900">Tóm tắt nhanh trước giờ mở cửa</h4>
                        <p className="mt-2 text-sm text-slate-600">Nhận tín hiệu nổi bật, biến động ngành và danh sách cổ phiếu đáng chú ý mỗi ngày.</p>
                        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                            <input
                                type="email"
                                placeholder="Email của bạn"
                                className="h-11 flex-1 rounded-xl border border-slate-300 bg-white px-4 text-sm outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-200"
                            />
                            <button className="h-11 rounded-xl bg-orange-500 px-5 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(249,115,22,0.35)] transition hover:bg-orange-600">
                                Đăng ký
                            </button>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-10 border-t border-orange-200/70 pt-10 md:grid-cols-2 lg:grid-cols-4">
                    <div>
                        <h4 className="mb-4 text-base font-bold text-slate-900">Kết nối</h4>
                        <div className="flex gap-3">
                            <Link href="#" className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-500 transition hover:border-orange-300 hover:text-orange-600"><Facebook size={18} /></Link>
                            <Link href="#" className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-500 transition hover:border-orange-300 hover:text-orange-600"><Twitter size={18} /></Link>
                            <Link href="#" className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-500 transition hover:border-orange-300 hover:text-orange-600"><Linkedin size={18} /></Link>
                            <Link href="#" className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-500 transition hover:border-orange-300 hover:text-orange-600"><Youtube size={18} /></Link>
                        </div>
                    </div>

                    <div>
                        <h4 className="mb-4 text-base font-bold text-slate-900">Sản phẩm</h4>
                        <ul className="space-y-2.5 text-sm text-slate-600">
                            <li><Link href="#" className="transition hover:text-orange-600">Bảng giá thời gian thực</Link></li>
                            <li><Link href="#" className="transition hover:text-orange-600">Lọc cổ phiếu nâng cao</Link></li>
                            <li><Link href="#" className="transition hover:text-orange-600">Phân tích tài chính chuyên sâu</Link></li>
                            <li><Link href="#" className="transition hover:text-orange-600">Cảnh báo giá & danh mục</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="mb-4 text-base font-bold text-slate-900">Công ty</h4>
                        <ul className="space-y-2.5 text-sm text-slate-600">
                            <li><Link href="#" className="transition hover:text-orange-600">Giới thiệu</Link></li>
                            <li><Link href="#" className="transition hover:text-orange-600">Đối tác</Link></li>
                            <li><Link href="#" className="transition hover:text-orange-600">Tuyển dụng</Link></li>
                            <li><Link href="#" className="transition hover:text-orange-600">Trung tâm hỗ trợ</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="mb-4 text-base font-bold text-slate-900">Liên hệ</h4>
                        <ul className="space-y-3 text-sm text-slate-600">
                            <li className="flex items-start gap-2.5"><Phone className="mt-0.5 h-4 w-4 text-orange-500" /><span>1900 1234 (08:00 - 17:30)</span></li>
                            <li className="flex items-start gap-2.5"><Mail className="mt-0.5 h-4 w-4 text-orange-500" /><span>support@stockpro.vn</span></li>
                            <li className="flex items-start gap-2.5"><MapPin className="mt-0.5 h-4 w-4 text-orange-500" /><span>Bitexco Financial Tower, Q.1, TP.HCM</span></li>
                        </ul>
                    </div>
                </div>

                <div className="mt-8 flex flex-col items-start justify-between gap-3 border-t border-slate-200 pt-6 text-xs text-slate-500 md:flex-row md:items-center">
                    <p>© 2026 StockPro JSC. All rights reserved.</p>
                    <div className="flex flex-wrap gap-5">
                        <Link href="#" className="transition hover:text-orange-600">Điều khoản sử dụng</Link>
                        <Link href="#" className="transition hover:text-orange-600">Chính sách bảo mật</Link>
                        <Link href="#" className="transition hover:text-orange-600">Quy chế hoạt động</Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}
