"use client";

import React from "react";

const NAVIGATION_TABS = [
    { id: "overview",   label: "Tổng quan" },
    { id: "news",       label: "Tin tức" },
    { id: "financials", label: "Số liệu tài chính" },
    { id: "dashboard",   label: "Dashboard - TCDN" },
    { id: "quant",      label: "Dashboard - Định lượng" },
    { id: "compare",    label: "So sánh" },
    { id: "profile",    label: "Hồ sơ doanh nghiệp" },
];

interface NavigationTabsProps {
    activeTab: string;
    onTabChange: (id: string) => void;
    ticker?: string;
}

const NavigationTabs = ({ activeTab, onTabChange, ticker }: NavigationTabsProps) => {
    return (
        <div className="sticky top-0 z-10 bg-card border border-border rounded-lg shadow-sm py-2 px-4">
            <nav className="flex items-center justify-center gap-1 overflow-x-auto">
                {NAVIGATION_TABS.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => onTabChange(tab.id)}
                        className={`
                            px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors
                            ${activeTab === tab.id
                                ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-md shadow-orange-500/20"
                                : "text-muted-foreground hover:text-orange-600 hover:bg-orange-50"
                            }
                        `}
                    >
                        {tab.label}
                    </button>
                ))}
            </nav>
        </div>
    );
};

export default NavigationTabs;