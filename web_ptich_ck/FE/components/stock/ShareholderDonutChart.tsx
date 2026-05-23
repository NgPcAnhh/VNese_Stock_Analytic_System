"use client";

import React, { useMemo } from "react";
import ReactECharts from "echarts-for-react";
import { useStockDetail } from "@/lib/StockDetailContext";

const COLORS = ["#f97316", "#fb923c", "#f59e0b", "#fbbf24", "#fcd34d", "#ea580c", "#fdba74", "#9a3412"];

type ShareholderMember = { name: string; percent: number };

type DonutTooltipData = {
    name: string;
    value: number;
    members?: ShareholderMember[];
};

const ShareholderDonutChart = () => {
    const { shareholderStructure } = useStockDetail();

    const chartData = useMemo(() => {
        return shareholderStructure.map((g, i) => ({
            value: g.percent,
            name: g.position,
            members: g.members,
            itemStyle: { color: COLORS[i % COLORS.length] },
        }));
    }, [shareholderStructure]);

    const totalPercent = useMemo(
        () => chartData.reduce((s, d) => s + d.value, 0),
        [chartData],
    );

    const option = {
        tooltip: {
            trigger: "item",
            position: function (point: number[]) {
                // Hiển thị tooltip ở dưới bên phải con trỏ chuột
                return [point[0] + 10, point[1] + 10];
            },
            backgroundColor: "rgba(255, 251, 245, 0.98)",
            borderColor: "#fdba74",
            borderWidth: 1,
            textStyle: { color: "#374151", fontSize: 11 },
            formatter: (params: unknown) => {
                const data = (params as { data: DonutTooltipData }).data;
                const members = data.members || [];
                let html = `<div style="font-weight:700;margin-bottom:4px;color:#c2410c">${data.name}: ${data.value}%</div>`;
                if (members.length > 0) {
                    html += '<div style="font-size:11px;color:#9a3412">';
                    members.forEach((m) => {
                        html += `<div style="display:flex;justify-content:space-between;gap:12px"><span>${m.name}</span><span style="font-weight:500">${m.percent}%</span></div>`;
                    });
                    html += "</div>";
                }
                return html;
            },
        },
        legend: { show: false },
        series: [
            {
                name: "Cơ cấu cổ đông",
                type: "pie",
                radius: ["45%", "78%"],
                center: ["50%", "50%"],
                avoidLabelOverlap: false,
                itemStyle: {
                    borderColor: "#fff7ed",
                    borderWidth: 2,
                },
                label: {
                    show: true,
                    position: "center",
                    formatter: () => `{a|${totalPercent.toFixed(1)}%}`,
                    rich: {
                        a: {
                            fontSize: 20,
                            fontWeight: "bold",
                            color: "#c2410c",
                            fontFamily: "Roboto Mono, monospace",
                        },
                    },
                },
                emphasis: {
                    label: { show: true, fontSize: 16, fontWeight: "bold" },
                },
                labelLine: { show: false },
                data: chartData,
            },
        ],
    };

    if (chartData.length === 0) {
        return (
            <div className="flex items-center justify-center h-[320px] text-sm text-muted-foreground">
                Chưa có dữ liệu cơ cấu cổ đông
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center w-full">
            <h3 className="text-sm font-semibold text-foreground mb-1">Cơ cấu cổ đông theo chức vụ</h3>
            <ReactECharts
                option={option}
                style={{ height: "320px", width: "100%" }}
                opts={{ renderer: "svg" }}
            />

            {/* Legend */}
            <div className="flex flex-col gap-2 mt-3 text-sm w-full max-w-xs">
                {chartData.map((d, i) => (
                    <div key={i} className="flex items-center gap-2">
                        <span
                            className="w-3.5 h-3.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: d.itemStyle.color }}
                        />
                        <span className="text-muted-foreground flex-1 truncate">{d.name}</span>
                        <span className="font-semibold text-foreground font-[var(--font-roboto-mono)]">
                            {d.value}%
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ShareholderDonutChart;