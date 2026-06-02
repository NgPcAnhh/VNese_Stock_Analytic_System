"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { StockTicker } from "./StockTicker";
import ScrollToTopButton from "./ScrollToTopButton";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/AuthContext";
import { useSettings } from "@/lib/SettingsContext";
import { useSessionTracking, usePageViewTracking, useErrorTracking } from "@/hooks/useTracking";
import { PriceBoardPopup } from "@/components/dashboard/PriceBoardPopup";
import { Menu } from "lucide-react";

const JUST_LOGGED_IN_KEY = "stockpro:auth:just-logged-in";

export default function MainLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(true);
    const [showPopupForCurrentLogin, setShowPopupForCurrentLogin] = useState(false);
    
    // Trạng thái cho sidebar hover
    const [isHoverSidebarVisible, setIsHoverSidebarVisible] = useState(false);
    const [hoverTimeout, setHoverTimeout] = useState<NodeJS.Timeout | null>(null);

    const { isAuthenticated, isLoading, user, openAuthModal } = useAuth();
    const { autoHideSidebar } = useSettings();

    // Theo dõi thời gian phiên làm việc
    useSessionTracking(user?.id);
    // Tự động track page view khi route thay đổi
    usePageViewTracking(user?.id);
    // Tự động bắt lỗi JS runtime & promise rejections
    useErrorTracking(user?.id);

    // Route Protection Guard
    useEffect(() => {
        if (!isLoading && !isAuthenticated && pathname !== "/") {
            // Bỏ qua chặn các route public khác nếu có
            if (!pathname.startsWith("/auth/callback") && !pathname.startsWith("/reset-password")) {
                router.push("/");
                openAuthModal();
            }
        }
    }, [isLoading, isAuthenticated, pathname, router, openAuthModal]);

    // Chỉ cho phép popup bảng điện hiển thị ở tab Tổng quan ngay sau khi đăng nhập.
    useEffect(() => {
        if (isLoading) {
            return;
        }

        if (!isAuthenticated) {
            setShowPopupForCurrentLogin(false);
            return;
        }

        if (pathname !== "/") {
            setShowPopupForCurrentLogin(false);
            return;
        }

        const justLoggedIn = sessionStorage.getItem(JUST_LOGGED_IN_KEY) === "1";
        if (justLoggedIn) {
            setShowPopupForCurrentLogin(true);
            sessionStorage.removeItem(JUST_LOGGED_IN_KEY);
        }
    }, [isLoading, isAuthenticated, pathname]);

    useEffect(() => {
        if (showPopupForCurrentLogin && pathname !== "/") {
            setShowPopupForCurrentLogin(false);
        }
    }, [pathname, showPopupForCurrentLogin]);

    const hideSidebarFromUrl = searchParams.get("hideSidebar") === "true" || searchParams.get("preview") === "true";
    const hideHeaderFromUrl = searchParams.get("disable_header") === "true" || searchParams.get("preview") === "true";
    const isPriceBoardIframe = pathname === "/price-board" && hideSidebarFromUrl;
    const isPriceBoardMain = pathname === "/price-board" && !hideSidebarFromUrl;

    // logic xác định xem có nên dùng chế độ ẩn sidebar không
    // Luôn ẩn ở PriceBoardMain, hoặc ẩn ở các trang khác nếu setting autoHideSidebar bật
    const useAutoHideMode = isPriceBoardMain || autoHideSidebar;

    const isBIHub = pathname === "/data-sources" || pathname === "/hub";
    const isPriceBoard = pathname === "/price-board";
    const isChatbot = pathname === "/stockpilot";
    const hideScrollToTop = isBIHub || isPriceBoard || isChatbot;

    const isPreviewMode = searchParams.get("preview") === "true";
    const layoutModeParam = searchParams.get("layoutMode");

    // Reset timeout khi thao tác với sidebar hover
    const handleSidebarHoverActivity = () => {
        if (hoverTimeout) {
            clearTimeout(hoverTimeout);
        }
        setIsHoverSidebarVisible(true);
        const timeout = setTimeout(() => {
            setIsHoverSidebarVisible(false);
        }, 3000);
        setHoverTimeout(timeout);
    };

    if (isPriceBoardIframe || (isBIHub && isPreviewMode)) {
        const isSlideMode = layoutModeParam === 'slide';
        return (
            <div className="flex h-screen overflow-hidden bg-background">
                <main className={`flex-1 w-full transition-all duration-300 ${isSlideMode ? 'overflow-y-auto' : 'overflow-hidden'}`}>
                    {children}
                </main>
            </div>
        );
    }

    return (
        <div className="flex h-screen overflow-hidden bg-background relative">
            {/* Vùng trigger bên trái để mở sidebar hover */}
            {useAutoHideMode && (
                <div 
                    className="absolute left-0 top-0 bottom-0 w-8 z-40 bg-transparent" 
                    onMouseEnter={handleSidebarHoverActivity} 
                />
            )}

            {/* Desktop Sidebar - Fixed position (nếu không ở chế độ ẩn) */}
            {!useAutoHideMode && (
                <div className="hidden lg:block transition-all duration-300 ease-in-out">
                    <Sidebar
                        collapsed={isCollapsed}
                        onToggle={() => setIsCollapsed(!isCollapsed)}
                    />
                </div>
            )}

            {/* Desktop Hover Sidebar - Dành cho chế độ ẩn (Price board hoặc setting bật) */}
            {useAutoHideMode && (
                <div 
                    className={cn(
                        "hidden lg:block absolute left-0 top-0 bottom-0 z-50 transition-transform duration-300 ease-in-out bg-background border-r border-border shadow-2xl",
                        isHoverSidebarVisible ? "translate-x-0" : "-translate-x-full"
                    )}
                    onMouseEnter={handleSidebarHoverActivity}
                    onMouseMove={handleSidebarHoverActivity}
                >
                    <Sidebar
                        collapsed={isCollapsed}
                        onToggle={() => setIsCollapsed(!isCollapsed)}
                    />
                </div>
            )}

            {/* Mobile Sidebar Overlay */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/50 lg:hidden"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* Mobile Sidebar - Fixed position */}
            <div className={cn(
                "fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-200 ease-in-out lg:hidden bg-sidebar border-r border-sidebar-border shadow-lg",
                isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                <Sidebar className="h-full w-full border-none" />
            </div>

            <div className="flex flex-col flex-1 overflow-hidden w-full transition-all duration-300">
                {!isBIHub && <Header onMenuClick={() => setIsMobileMenuOpen(true)} />}
                {pathname === "/" && <StockTicker />}
                <main data-scroll-root="app" className="flex-1 overflow-y-auto scroll-smooth bg-muted/20">
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
                        {isBIHub && (
                            <button
                                className="lg:hidden fixed top-4 left-4 z-40 p-2 bg-background/80 backdrop-blur border border-border rounded-full shadow-lg text-foreground hover:bg-muted"
                                onClick={() => setIsMobileMenuOpen(true)}
                            >
                                <Menu className="h-5 w-5" />
                            </button>
                        )}
                        {children}
                    </div>
                </main>
            </div>

            {!hideScrollToTop && <ScrollToTopButton />}
            {isAuthenticated && !isPriceBoardIframe && pathname === "/" && showPopupForCurrentLogin && (
                <PriceBoardPopup onHandled={() => setShowPopupForCurrentLogin(false)} />
            )}
        </div>
    );
}
