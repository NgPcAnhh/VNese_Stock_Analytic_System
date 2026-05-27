"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import {
    LayoutDashboard, BarChart2, LineChart, PieChart,
    Newspaper, Activity, Settings, Monitor, BriefcaseBusiness, Bot, Database, BarChart3, type LucideIcon,
} from "lucide-react";

// ─── Sidebar icon registry ────────────────────────────────────────────────────
export const SIDEBAR_ICON_MAP: Record<string, LucideIcon> = {
    LayoutDashboard,
    BarChart2,
    LineChart,
    PieChart,
    Newspaper,
    Activity,
    Settings,
    Monitor,
    BriefcaseBusiness,
    Bot,
    Database,
    BarChart3,
};

// ─── Sidebar nav items ────────────────────────────────────────────────────────
export interface SidebarNavItem {
    id: string;
    name: string;
    href: string;
    iconName: string;
    enabled: boolean;
}

export const DEFAULT_SIDEBAR_ITEMS: SidebarNavItem[] = [
    { id: "overview",    name: "Tổng quan",  href: "/",            iconName: "LayoutDashboard", enabled: true },
    { id: "market",      name: "Thị trường", href: "/market",      iconName: "BarChart2",       enabled: true },
    { id: "indices",     name: "Chỉ số",     href: "/indices",     iconName: "Activity",        enabled: true },
    { id: "price-board", name: "Bảng điện",  href: "/price-board", iconName: "Monitor",         enabled: true },
    { id: "stocks",      name: "Cổ phiếu",   href: "/stocks",      iconName: "LineChart",       enabled: true },
    { id: "analysis",    name: "Phân tích",  href: "/analysis",    iconName: "PieChart",        enabled: true },
    { id: "portfolio", name: "Quản trị danh mục", href: "/portfolio", iconName: "BriefcaseBusiness", enabled: true },
    { id: "news",        name: "Tin tức",    href: "/news",        iconName: "Newspaper",       enabled: true },
    { id: "stockpilot",    name: "StockPilot",   href: "/stockpilot",    iconName: "Bot",             enabled: true },
    { id: "data-sources",  name: "Data Hub",     href: "/data-sources",  iconName: "Database",        enabled: true },
    { id: "hub",           name: "BI Hub",       href: "/hub",           iconName: "BarChart3",       enabled: true },
    { id: "settings",    name: "Cài đặt",    href: "/settings",    iconName: "Settings",        enabled: true },
];

function reconcileSidebarItems(savedItems: SidebarNavItem[]): SidebarNavItem[] {
    const defaultById = new Map(DEFAULT_SIDEBAR_ITEMS.map((item) => [item.id, item]));
    const merged: SidebarNavItem[] = savedItems
        .filter((item) => defaultById.has(item.id))
        .map((item) => ({ ...defaultById.get(item.id)!, ...item }));

    const findInsertIndex = (defaultIndex: number): number => {
        for (let i = defaultIndex - 1; i >= 0; i--) {
            const prevId = DEFAULT_SIDEBAR_ITEMS[i].id;
            const existingIndex = merged.findIndex((item) => item.id === prevId);
            if (existingIndex >= 0) return existingIndex + 1;
        }
        for (let i = defaultIndex + 1; i < DEFAULT_SIDEBAR_ITEMS.length; i++) {
            const nextId = DEFAULT_SIDEBAR_ITEMS[i].id;
            const existingIndex = merged.findIndex((item) => item.id === nextId);
            if (existingIndex >= 0) return existingIndex;
        }
        return merged.length;
    };

    for (let idx = 0; idx < DEFAULT_SIDEBAR_ITEMS.length; idx++) {
        const defaultItem = DEFAULT_SIDEBAR_ITEMS[idx];
        const exists = merged.some((item) => item.id === defaultItem.id);
        if (!exists) {
            const insertAt = findInsertIndex(idx);
            merged.splice(insertAt, 0, defaultItem);
        }
    }

    return merged;
}

// ─── Context ──────────────────────────────────────────────────────────────────
interface SettingsContextType {
    darkMode: boolean;
    setDarkMode: (v: boolean) => void;
    showPriceBoardPopup: boolean;
    setShowPriceBoardPopup: (v: boolean) => void;
    sidebarItems: SidebarNavItem[];
    setSidebarItems: (items: SidebarNavItem[]) => void;
    moveSidebarItem: (fromIndex: number, toIndex: number) => void;
    toggleSidebarItem: (id: string) => void;
    resetSidebarItems: () => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
    const [darkMode, setDarkModeState] = useState(false);
    const [showPriceBoardPopup, setShowPriceBoardPopupState] = useState(true);
    const [sidebarItems, setSidebarItemsState] = useState<SidebarNavItem[]>(DEFAULT_SIDEBAR_ITEMS);
    const [mounted, setMounted] = useState(false);

    // Load from localStorage on mount
    useEffect(() => {
        try {
            const saved = localStorage.getItem("app-settings");
            if (saved) {
                const parsed = JSON.parse(saved);
                if (typeof parsed.darkMode === "boolean") setDarkModeState(parsed.darkMode);
                if (typeof parsed.showPriceBoardPopup === "boolean") setShowPriceBoardPopupState(parsed.showPriceBoardPopup);
                if (Array.isArray(parsed.sidebarItems)) {
                    setSidebarItemsState(reconcileSidebarItems(parsed.sidebarItems));
                }
            }
        } catch { /* ignore */ }
        setMounted(true);
    }, []);

    // Apply/remove .dark class on <html>
    useEffect(() => {
        if (!mounted) return;
        document.documentElement.classList.toggle("dark", darkMode);
    }, [darkMode, mounted]);

    const persist = (updates: object) => {
        try {
            const current = JSON.parse(localStorage.getItem("app-settings") || "{}");
            localStorage.setItem("app-settings", JSON.stringify({ ...current, ...updates }));
        } catch { /* ignore */ }
    };

    const setDarkMode = (v: boolean) => { setDarkModeState(v); persist({ darkMode: v }); };

    const setShowPriceBoardPopup = (v: boolean) => { 
        setShowPriceBoardPopupState(v); 
        persist({ showPriceBoardPopup: v }); 
        if (v) {
            try {
                // Khi bật lại bảng điện, reset các cờ cấu hình tắt của iframe
                localStorage.removeItem("stockpro:price-board-popup:never-show");
                localStorage.removeItem("stockpro:price-board-popup:hide-today");
                sessionStorage.removeItem("stockpro:price-board-popup:session-closed");
            } catch { /* ignore */ }
        }
    };

    const setSidebarItems = (items: SidebarNavItem[]) => {
        setSidebarItemsState(items);
        persist({ sidebarItems: items });
    };

    const moveSidebarItem = (fromIndex: number, toIndex: number) => {
        if (toIndex < 0 || toIndex >= sidebarItems.length) return;
        const arr = [...sidebarItems];
        const [item] = arr.splice(fromIndex, 1);
        arr.splice(toIndex, 0, item);
        setSidebarItems(arr);
    };

    const toggleSidebarItem = (id: string) => {
        // "settings" item is always pinned — cannot be disabled
        if (id === "settings") return;
        setSidebarItems(sidebarItems.map((item) =>
            item.id === id ? { ...item, enabled: !item.enabled } : item
        ));
    };

    const resetSidebarItems = () => setSidebarItems([...DEFAULT_SIDEBAR_ITEMS]);

    return (
        <SettingsContext.Provider
            value={{
                darkMode,
                setDarkMode,
                showPriceBoardPopup,
                setShowPriceBoardPopup,
                sidebarItems,
                setSidebarItems,
                moveSidebarItem,
                toggleSidebarItem,
                resetSidebarItems,
            }}
        >
            {children}
        </SettingsContext.Provider>
    );
}

export function useSettings() {
    const ctx = useContext(SettingsContext);
    if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
    return ctx;
}
