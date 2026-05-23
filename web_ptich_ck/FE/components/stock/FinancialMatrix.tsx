"use client";

import React from "react";
import { useStockDetail } from "@/lib/StockDetailContext";
import { Info, ChevronRight } from "lucide-react";

const FinancialMatrix = () => {
    const { stockInfo } = useStockDetail();
    const { metrics, evaluation } = stockInfo;

    return (
        <div className="flex gap-6">
            {/* ── Left: 3-Column Metrics Grid ── */}
            <div className="flex-1 grid grid-cols-3 gap-x-6 gap-y-4">
                {/* Row 1 */}
                <MetricItem label="Vốn hóa" value={metrics.marketCap} hasInfo />
                <MetricItem label="P/E" value={metrics.pe} hasInfo />
                <MetricItem label="EPS" value={metrics.eps} hasInfo />

                {/* Row 2 */}
                <MetricItem label="Khối lượng giao dịch" value={metrics.volume} hasInfo />
                <MetricItem label="P/B" value={metrics.pb} hasInfo />
                <MetricItem label="Giá trị sổ sách" value={metrics.bvps} hasInfo />

                {/* Row 3 */}
                <MetricItem label="Số lượng cổ phiếu lưu hành" value={metrics.outstandingShares} hasInfo />
                <MetricItem label="EV/EBITDA" value={metrics.evEbitda} hasInfo />
                <div /> {/* empty cell */}
            </div>

            {/* ── Vertical divider ── */}
            <div className="hidden lg:block border-l border-border/50" />

            {/* ── Right: Evaluation Section ── */}
            <div className="w-56 flex-shrink-0 flex flex-col gap-3">
                <div className="grid grid-cols-2 gap-4">
                    {/* Fundamental Analysis */}
                    <div>
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground uppercase mb-1.5">
                            Phân tích cơ bản
                            <Info className="w-3 h-3 text-muted-foreground" />
                        </div>
                        <span className="text-xs font-medium text-foreground">{evaluation.fundamentalAnalysis || "N/A"}</span>
                    </div>

                    {/* Valuation */}
                    <div>
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground uppercase mb-1.5">
                            Định giá
                            <Info className="w-3 h-3 text-muted-foreground" />
                        </div>
                        <span className="text-xs font-medium text-foreground">{evaluation.valuation || "N/A"}</span>
                    </div>
                </div>

                {/* Risk */}
                <div>
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground uppercase mb-1.5">
                        Rủi ro
                        <Info className="w-3 h-3 text-muted-foreground" />
                    </div>
                    <EvaluationBadge
                        label=""
                        value={evaluation.risk || "N/A"}
                        variant={evaluation.risk === "Cao" ? "danger" : evaluation.risk === "Thấp" ? "success" : "warning"}
                    />
                </div>

                {/* Details Link */}
                <button className="flex items-center gap-0.5 text-xs text-orange-600 hover:text-orange-700 hover:underline self-end mt-auto transition-colors">
                    Chi tiết
                    <ChevronRight className="w-3 h-3" />
                </button>
            </div>
        </div>
    );
};

const MetricItem = ({
    label,
    value,
    subtext,
    hasInfo
}: {
    label: string;
    value: string;
    subtext?: string;
    hasInfo?: boolean;
}) => (
    <div>
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground uppercase">
            {label}
            {hasInfo && <Info className="w-3 h-3 text-muted-foreground" />}
        </div>
        <div className="text-sm font-bold text-foreground font-[var(--font-roboto-mono)]">
            {value}
        </div>
        {subtext && (
            <div className="text-[10px] text-muted-foreground">{subtext}</div>
        )}
    </div>
);

const EvaluationBadge = ({
    label,
    value,
    variant
}: {
    label: string;
    value: string;
    variant: 'success' | 'danger' | 'warning'
}) => {
    const variantStyles = {
        success: 'bg-green-50 text-green-700 border-green-200',
        danger: 'bg-red-50 text-red-700 border-red-200',
        warning: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    };

    return (
        <span className={`px-2 py-0.5 text-xs font-medium rounded border ${variantStyles[variant]}`}>
            {label && `${label}: `}{value}
        </span>
    );
};

export default FinancialMatrix;
