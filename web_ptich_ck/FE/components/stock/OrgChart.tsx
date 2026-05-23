"use client";

import React, { useMemo, useState } from "react";
import type { Shareholder } from "@/hooks/useStockData";
import { ChevronDown, ChevronRight, User, Users, Shield, Briefcase, Eye, Building2, Scale } from "lucide-react";

/* ───────────────────────────────────────────────────────
   Utility: classify a person's role string into a
   structural group + hierarchy level automatically.
   Works with any Vietnamese corporate org chart.
   ─────────────────────────────────────────────────────── */

type OrgGroup =
    | "chairman"       // Chủ tịch HĐQT
    | "vice_chairman"  // Phó Chủ tịch HĐQT
    | "board"          // Thành viên HĐQT (independent or not)
    | "ceo"            // Tổng Giám đốc / Giám đốc điều hành
    | "deputy_ceo"     // Phó TGĐ
    | "cfo"            // Kế toán trưởng / Giám đốc tài chính
    | "supervisor"     // Ban kiểm soát
    | "audit"          // Ban kiểm toán nội bộ
    | "secretary"      // Thư ký / Phụ trách quản trị / CBTT
    | "other";

interface ClassifiedPerson {
    name: string;
    role: string;
    percentage: number;
    shares: string;
    group: OrgGroup;
    level: number;        // 0=top, 1=senior, 2=mid, 3=staff
    isIndependent: boolean;
}

const ROLE_RULES: { pattern: RegExp; group: OrgGroup; level: number }[] = [
    // Chairman
    { pattern: /chủ tịch hội đồng quản trị|chủ tịch hđqt/i, group: "chairman", level: 0 },
    { pattern: /chủ tịch/i, group: "chairman", level: 0 },
    // Vice Chairman
    { pattern: /phó chủ tịch hội đồng quản|phó chủ tịch hđqt/i, group: "vice_chairman", level: 1 },
    { pattern: /phó chủ tịch/i, group: "vice_chairman", level: 1 },
    // CEO / General Director
    { pattern: /tổng giám đốc|giám đốc điều hành|ceo/i, group: "ceo", level: 1 },
    // Deputy CEO
    { pattern: /phó tổng giám đốc|phó giám đốc|deputy.*ceo/i, group: "deputy_ceo", level: 2 },
    // CFO / Chief Accountant
    { pattern: /kế toán trưởng|giám đốc tài chính|cfo/i, group: "cfo", level: 2 },
    // Supervisory Board head
    { pattern: /trưởng ban kiểm soát/i, group: "supervisor", level: 2 },
    // Supervisory Board member
    { pattern: /ban kiểm soát|thành viên.*kiểm soát/i, group: "supervisor", level: 3 },
    // Internal Audit head
    { pattern: /trưởng ban kiểm toán/i, group: "audit", level: 2 },
    // Internal Audit member
    { pattern: /ban kiểm toán|kiểm toán nội bộ/i, group: "audit", level: 3 },
    // Board member (independent)
    { pattern: /thành viên.*hội đồng quản trị.*độc lập|thành viên.*hđqt.*độc lập/i, group: "board", level: 2 },
    // Board member
    { pattern: /thành viên.*hội đồng quản trị|thành viên.*hđqt|hội đồng quản trị/i, group: "board", level: 2 },
    // Secretary / Compliance
    { pattern: /thư ký|phụ trách.*quản trị|công bố thông tin|cbtt/i, group: "secretary", level: 3 },
];

function classifyPerson(s: Shareholder): ClassifiedPerson {
    const role = s.role || "";
    const roleLower = role.toLowerCase();
    let group: OrgGroup = "other";
    let level = 3;
    const isIndependent = /độc lập/i.test(role);

    // A person may hold multiple titles (e.g. "Tổng Giám đốc/Phó Chủ tịch HĐQT")
    // Pick the highest-ranked match (lowest level number)
    for (const rule of ROLE_RULES) {
        if (rule.pattern.test(roleLower)) {
            if (rule.level < level || (rule.level === level && group === "other")) {
                group = rule.group;
                level = rule.level;
            }
        }
    }

    return {
        name: s.name,
        role: s.role,
        percentage: s.percentage,
        shares: s.shares,
        group,
        level,
        isIndependent,
    };
}

/* ───────────────────────────────────────────────────────
   Org-tree structure: divide into functional branches
   ─────────────────────────────────────────────────────── */

interface OrgBranch {
    id: string;
    label: string;
    icon: React.ElementType;
    color: string;          // tailwind color prefix
    people: ClassifiedPerson[];
}

function buildOrgTree(shareholders: Shareholder[]): {
    topLeaders: ClassifiedPerson[];       // chairman + CEO at very top
    branches: OrgBranch[];
} {
    const classified = shareholders.map(classifyPerson);

    // Top leaders: chairman(s) and CEO(s) — they sit at the apex
    const topLeaders = classified.filter(
        (p) => p.group === "chairman" || p.group === "ceo",
    );

    // Remove top leaders from subsequent branches
    const topSet = new Set(topLeaders.map((p) => p.name + p.role));
    const rest = classified.filter((p) => !topSet.has(p.name + p.role));

    const branchDefs: { id: string; label: string; icon: React.ElementType; color: string; groups: OrgGroup[] }[] = [
        { id: "board", label: "Hội đồng quản trị", icon: Users, color: "blue", groups: ["vice_chairman", "board"] },
        { id: "executive", label: "Ban điều hành", icon: Briefcase, color: "emerald", groups: ["deputy_ceo", "cfo", "secretary"] },
        { id: "supervisor", label: "Ban kiểm soát", icon: Shield, color: "amber", groups: ["supervisor"] },
        { id: "audit", label: "Ban kiểm toán nội bộ", icon: Eye, color: "purple", groups: ["audit"] },
    ];

    const placed = new Set<string>();
    const branches: OrgBranch[] = [];

    for (const def of branchDefs) {
        const people = rest.filter((p) => def.groups.includes(p.group) && !placed.has(p.name + p.role));
        people.forEach((p) => placed.add(p.name + p.role));
        if (people.length > 0) {
            // Sort: lower level first, then higher %
            people.sort((a, b) => a.level - b.level || b.percentage - a.percentage);
            branches.push({ id: def.id, label: def.label, icon: def.icon, color: def.color, people });
        }
    }

    return { topLeaders, branches };
}

/* ───────────────────────────────────────────────────────
   UI Components
   ─────────────────────────────────────────────────────── */

const COLOR_MAP: Record<string, { bg: string; border: string; text: string; accent: string; light: string }> = {
    blue: { bg: "bg-blue-50", border: "border-blue-300", text: "text-blue-700", accent: "bg-blue-500", light: "bg-blue-100" },
    emerald: { bg: "bg-emerald-50", border: "border-emerald-300", text: "text-emerald-700", accent: "bg-emerald-500", light: "bg-emerald-100" },
    amber: { bg: "bg-amber-50", border: "border-amber-300", text: "text-amber-700", accent: "bg-amber-500", light: "bg-amber-100" },
    purple: { bg: "bg-purple-50", border: "border-purple-300", text: "text-purple-700", accent: "bg-purple-500", light: "bg-purple-100" },
    gray: { bg: "bg-muted/50", border: "border-border", text: "text-foreground", accent: "bg-muted", light: "bg-muted" },
    red: { bg: "bg-red-50", border: "border-red-200", text: "text-red-700", accent: "bg-red-500", light: "bg-red-100" },
};

function PersonCard({ person, compact }: { person: ClassifiedPerson; compact?: boolean }) {
    const initial = person.name.split(" ").pop()?.charAt(0) || "?";
    return (
        <div className={`flex items-center gap-3 ${compact ? "py-2" : "p-3"} rounded-lg hover:bg-muted/50 transition-colors`}>
            <div className={`${compact ? "w-8 h-8 text-xs" : "w-10 h-10 text-sm"} rounded-full bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center text-white font-bold shrink-0`}>
                {initial}
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                    <span className={`${compact ? "text-xs" : "text-sm"} font-bold text-foreground truncate`}>
                        {person.name}
                    </span>
                    {person.isIndependent && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-sky-100 text-sky-700 rounded-full font-semibold shrink-0">
                            Độc lập
                        </span>
                    )}
                </div>
                <p className={`${compact ? "text-[11px]" : "text-xs"} text-muted-foreground truncate mt-0.5`}>{person.role}</p>
            </div>
        </div>
    );
}

function TopLeaderCard({ person }: { person: ClassifiedPerson }) {
    const initial = person.name.split(" ").pop()?.charAt(0) || "?";
    const isChairman = person.group === "chairman";
    return (
        <div className={`flex flex-col items-center p-5 rounded-xl border-2 ${isChairman ? "border-amber-400 bg-gradient-to-b from-amber-50 to-white shadow-md" : "border-emerald-400 bg-gradient-to-b from-emerald-50 to-white shadow-md"} min-w-[190px] max-w-[240px]`}>
            <div className={`w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-xl ${isChairman ? "bg-gradient-to-br from-amber-500 to-amber-700" : "bg-gradient-to-br from-emerald-500 to-emerald-700"}`}>
                {initial}
            </div>
            <span className="mt-2.5 text-base font-bold text-foreground text-center leading-tight">{person.name}</span>
            <span className={`mt-1 text-xs font-semibold text-center ${isChairman ? "text-amber-600" : "text-emerald-600"}`}>
                {person.role}
            </span>
        </div>
    );
}

function BranchCard({ branch }: { branch: OrgBranch }) {
    const [expanded, setExpanded] = useState(true);
    const c = COLOR_MAP[branch.color] || COLOR_MAP.gray;
    const Icon = branch.icon;
    const head = branch.people[0];
    const members = branch.people.slice(1);

    return (
        <div className={`rounded-xl border ${c.border} overflow-hidden`}>
            {/* Branch header */}
            <button
                onClick={() => setExpanded(!expanded)}
                className={`w-full flex items-center gap-2 px-4 py-2.5 ${c.bg} ${c.text} hover:brightness-95 transition-all`}
            >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="font-bold text-sm flex-1 text-left">{branch.label}</span>
                <span className="text-[11px] font-medium opacity-70">{branch.people.length} người</span>
                {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>

            {expanded && (
                <div className="bg-card px-3 py-2 space-y-0.5">
                    {/* Head of branch — slightly larger */}
                    {head && <PersonCard person={head} />}
                    {/* Other members */}
                    {members.length > 0 && (
                        <div className="ml-4 border-l-2 border-border pl-2 space-y-0.5">
                            {members.map((p, i) => (
                                <PersonCard key={i} person={p} compact />
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

/* ───────────────────────────────────────────────────────
   Main Exported Component
   ─────────────────────────────────────────────────────── */

interface OrgChartProps {
    shareholders: Shareholder[];
}

export default function OrgChart({ shareholders }: OrgChartProps) {
    const { topLeaders, branches } = useMemo(() => buildOrgTree(shareholders), [shareholders]);

    if (!shareholders.length) {
        return (
            <div className="text-center py-10 text-xs text-muted-foreground">
                Chưa có dữ liệu bộ máy tổ chức
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* ── Top leaders row ── */}
            {topLeaders.length > 0 && (
                <div className="flex flex-col items-center gap-4">
                    <div className="flex flex-wrap justify-center gap-4">
                        {topLeaders.map((p, i) => (
                            <TopLeaderCard key={i} person={p} />
                        ))}
                    </div>
                    {/* Connector line down */}
                    {branches.length > 0 && (
                        <div className="w-0.5 h-6 bg-border" />
                    )}
                </div>
            )}

            {/* ── Horizontal connector ── */}
            {branches.length > 1 && topLeaders.length > 0 && (
                <div className="flex items-start justify-center">
                    <div className="relative w-full max-w-4xl">
                        {/* Horizontal bar */}
                        <div className="absolute top-0 left-[calc(50%/(var(--cols)))] right-[calc(50%/(var(--cols)))] h-0.5 bg-border"
                            style={{ "--cols": branches.length } as React.CSSProperties}
                        />
                    </div>
                </div>
            )}

            {/* ── Branch cards grid ── */}
            <div className={`grid gap-4 ${branches.length === 1 ? "grid-cols-1 max-w-md mx-auto" :
                    branches.length === 2 ? "grid-cols-1 md:grid-cols-2" :
                        branches.length === 3 ? "grid-cols-1 md:grid-cols-3" :
                            "grid-cols-1 md:grid-cols-2 lg:grid-cols-4"
                }`}>
                {branches.map((branch) => (
                    <BranchCard key={branch.id} branch={branch} />
                ))}
            </div>

            {/* ── Legend ── */}
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 pt-3 border-t border-border/50">
                <span className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">Chú thích:</span>
                <div className="flex items-center gap-1.5">
                    <div className="w-3.5 h-3.5 rounded-full bg-gradient-to-br from-amber-500 to-amber-700" />
                    <span className="text-[11px] text-muted-foreground font-medium">Chủ tịch HĐQT</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-3.5 h-3.5 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700" />
                    <span className="text-[11px] text-muted-foreground font-medium">Tổng Giám đốc</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <span className="text-[10px] px-1.5 py-0.5 bg-sky-100 text-sky-700 rounded-full font-semibold">Độc lập</span>
                    <span className="text-[11px] text-muted-foreground font-medium">Thành viên HĐQT độc lập</span>
                </div>
            </div>
        </div>
    );
}
