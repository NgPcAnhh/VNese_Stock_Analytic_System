"use client";

import {
    LogOut,
    ChevronLeft,
    ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/AuthContext";
import { useTracking } from "@/hooks/useTracking";
import { useSettings, SIDEBAR_ICON_MAP } from "@/lib/SettingsContext";

interface SidebarProps {
    className?: string;
    collapsed?: boolean;
    onToggle?: () => void;
}

export function Sidebar({ className, collapsed, onToggle }: SidebarProps) {
    const pathname = usePathname();
    const { sidebarItems } = useSettings();
    const { isAuthenticated, user, openAuthModal, logout } = useAuth();
    const { trackSidebarClick } = useTracking(user?.id);

    // Auth Guard handle
    const handleNavigation = (e: React.MouseEvent<HTMLAnchorElement>, href: string, name: string) => {
        // Ghi log click sidebar
        trackSidebarClick(name, href);

        if (!isAuthenticated && href !== "/") {
            e.preventDefault();
            openAuthModal();
            // Close sidebar on mobile
            if (onToggle) onToggle();
        } else {
            // Close sidebar on mobile normally after click
            if (onToggle && window.innerWidth < 1024) onToggle();
        }
    };

    return (
        <div className={cn(
            "flex h-screen flex-col border-r bg-sidebar text-sidebar-foreground transition-all duration-300 ease-in-out",
            collapsed ? "w-20" : "w-64",
            className
        )}>
            <div className={cn(
                "flex h-16 items-center border-b border-sidebar-border/50",
                collapsed ? "justify-center px-0" : "px-6 justify-between"
            )}>
                <div className="flex items-center gap-2 font-bold text-xl text-primary overflow-hidden">
                    <img
                        src="/favicon.ico"
                        alt="StockPro Logo"
                        className="h-8 w-8 min-w-8 object-contain rounded-lg bg-white/10"
                    />
                    {!collapsed && <span className="whitespace-nowrap transition-opacity duration-300">StockPro</span>}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto py-4 overflow-x-hidden">
                <nav className="grid gap-1 px-3">
                    {sidebarItems
                        .filter((item) => item.enabled)
                        .map((item) => {
                            const IconComponent = SIDEBAR_ICON_MAP[item.iconName];
                            const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
                            return (
                                <Link
                                    key={item.id}
                                    href={item.href}
                                    onClick={(e) => handleNavigation(e, item.href, item.name)}
                                    className={cn(
                                        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors relative group",
                                        isActive
                                            ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                                            : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground",
                                        collapsed && "justify-center px-0"
                                    )}
                                    title={collapsed ? item.name : undefined}
                                >
                                    {IconComponent && <IconComponent className="h-5 w-5 min-w-5" />}
                                    {!collapsed && <span className="whitespace-nowrap transition-opacity duration-300">{item.name}</span>}
                                </Link>
                            );
                        })}
                </nav>
            </div>

            <div className="border-t border-sidebar-border/50 p-4 flex flex-col gap-2">
                <button
                    onClick={onToggle}
                    className={cn(
                        "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground transition-colors",
                        collapsed && "justify-center px-0"
                    )}
                >
                    {collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
                    {!collapsed && <span>Thu gọn</span>}
                </button>

                {isAuthenticated && (
                    <button
                        onClick={() => logout()}
                        className={cn(
                            "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-sidebar-accent/50 hover:text-red-500 transition-colors",
                            collapsed && "justify-center px-0"
                        )}
                    >
                        <LogOut className="h-5 w-5" />
                        {!collapsed && <span>Đăng xuất</span>}
                    </button>
                )}
            </div>
        </div>
    );
}
