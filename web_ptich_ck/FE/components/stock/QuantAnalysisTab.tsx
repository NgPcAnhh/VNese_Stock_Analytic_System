"use client";

import React, { useMemo } from "react";
import ReactECharts from "echarts-for-react";
import { useStockDetail } from "@/lib/StockDetailContext";
import { usePriceHistory, useQuantAnalysis, type QuantAnalysisData } from "@/hooks/useStockData";

type SeriesPoint = { date: string; value: number };
type ReturnPoint = { date: string; ret: number; close: number; volume: number };

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const THEME = {
    primary: "#f97316",
    accent: "#1d4ed8",
    info: "#0ea5e9",
    positive: "#16a34a",
    negative: "#dc2626",
    violet: "#7c3aed",
};

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
    return (
        <div className="rounded-xl border border-border/50 bg-card shadow-sm">
            <div className="px-4 pt-4 pb-2">
                <h3 className="text-sm font-semibold text-foreground">{title}</h3>
                {subtitle ? <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p> : null}
            </div>
            <div className="px-4 pb-4">{children}</div>
        </div>
    );
}

function Section({ index, title, subtitle, children }: { index: string; title: string; subtitle: string; children: React.ReactNode }) {
    return (
        <section className="space-y-3">
            <div className="border-b border-border/60 pb-2 flex items-center gap-2">
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded bg-primary/10 px-1.5 text-[10px] font-bold text-primary">
                    {index}
                </span>
                <div>
                    <h2 className="text-sm font-bold uppercase tracking-wide text-foreground">{title}</h2>
                    <p className="text-xs text-muted-foreground">{subtitle}</p>
                </div>
            </div>
            {children}
        </section>
    );
}

function downsample<T>(arr: T[], maxPoints = 260): T[] {
    if (arr.length <= maxPoints) return arr;
    const step = Math.ceil(arr.length / maxPoints);
    const sampled: T[] = [];
    for (let i = 0; i < arr.length; i += step) sampled.push(arr[i]);
    if (sampled[sampled.length - 1] !== arr[arr.length - 1]) sampled.push(arr[arr.length - 1]);
    return sampled;
}

function mean(arr: number[]): number {
    if (!arr.length) return 0;
    return arr.reduce((s, v) => s + v, 0) / arr.length;
}

function stdev(arr: number[]): number {
    if (arr.length < 2) return 0;
    const m = mean(arr);
    const variance = arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length;
    return Math.sqrt(variance);
}

function toISODate(raw: string): string {
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return raw;
    return d.toISOString().slice(0, 10);
}

function rollingVol(returns: ReturnPoint[], window: number): SeriesPoint[] {
    if (returns.length <= window) return [];
    const out: SeriesPoint[] = [];
    for (let i = window; i < returns.length; i++) {
        const segment = returns.slice(i - window, i).map((r) => r.ret);
        out.push({
            date: returns[i].date,
            value: stdev(segment) * Math.sqrt(252) * 100,
        });
    }
    return downsample(out);
}

function rollingSharpe(returns: ReturnPoint[], window: number, rf = 0.045): SeriesPoint[] {
    if (returns.length <= window) return [];
    const dailyRf = rf / 252;
    const out: SeriesPoint[] = [];
    for (let i = window; i < returns.length; i++) {
        const segment = returns.slice(i - window, i).map((r) => r.ret);
        const m = mean(segment);
        const s = stdev(segment);
        const value = s > 0 ? ((m - dailyRf) / s) * Math.sqrt(252) : 0;
        out.push({ date: returns[i].date, value });
    }
    return downsample(out);
}

function rollingBeta(returns: ReturnPoint[], window: number): SeriesPoint[] {
    if (returns.length <= window + 10) return [];

    // Proxy benchmark from long moving average return; avoids extra network requests for index series.
    const benchmark = returns.map((_, i) => {
        const start = Math.max(0, i - 60);
        const segment = returns.slice(start, i + 1).map((r) => r.ret);
        return mean(segment);
    });

    const out: SeriesPoint[] = [];
    for (let i = window; i < returns.length; i++) {
        const xs = returns.slice(i - window, i).map((r) => r.ret);
        const ys = benchmark.slice(i - window, i);
        const mx = mean(xs);
        const my = mean(ys);
        let cov = 0;
        let vy = 0;
        for (let j = 0; j < xs.length; j++) {
            cov += (xs[j] - mx) * (ys[j] - my);
            vy += (ys[j] - my) ** 2;
        }
        const beta = vy > 0 ? cov / vy : 1;
        out.push({ date: returns[i].date, value: beta });
    }
    return downsample(out);
}

function computeRSI(closes: number[], period = 14): (number | null)[] {
    if (closes.length < period + 1) return closes.map(() => null);
    const rsi: (number | null)[] = Array(closes.length).fill(null);

    let gains = 0;
    let losses = 0;
    for (let i = 1; i <= period; i++) {
        const diff = closes[i] - closes[i - 1];
        if (diff >= 0) gains += diff;
        else losses += Math.abs(diff);
    }

    let avgGain = gains / period;
    let avgLoss = losses / period;
    rsi[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);

    for (let i = period + 1; i < closes.length; i++) {
        const diff = closes[i] - closes[i - 1];
        const gain = diff > 0 ? diff : 0;
        const loss = diff < 0 ? Math.abs(diff) : 0;
        avgGain = (avgGain * (period - 1) + gain) / period;
        avgLoss = (avgLoss * (period - 1) + loss) / period;
        rsi[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
    }

    return rsi;
}

function movingAverage(values: number[], period: number): (number | null)[] {
    return values.map((_, i) => {
        if (i + 1 < period) return null;
        const seg = values.slice(i + 1 - period, i + 1);
        return mean(seg);
    });
}

function autocorrelation(returns: number[], maxLag = 20): { lag: number; value: number }[] {
    if (returns.length < maxLag + 5) return [];
    const m = mean(returns);
    const denom = returns.reduce((s, v) => s + (v - m) ** 2, 0);
    if (denom === 0) return [];

    const out: { lag: number; value: number }[] = [];
    for (let lag = 1; lag <= maxLag; lag++) {
        let num = 0;
        for (let i = lag; i < returns.length; i++) {
            num += (returns[i] - m) * (returns[i - lag] - m);
        }
        out.push({ lag, value: num / denom });
    }
    return out;
}

function seriesFromQuant(wealth: QuantAnalysisData["wealthIndex"]): SeriesPoint[] {
    return wealth.map((x) => ({ date: toISODate(x.date), value: x.value * 100 }));
}

function useQuantDerivedData(priceHistory: Array<{ date: string; close: number; volume: number }>) {
    return useMemo(() => {
        const sorted = [...priceHistory]
            .filter((p) => Number.isFinite(p.close) && p.close > 0)
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        const sampled = downsample(sorted, 700);
        const returns: ReturnPoint[] = [];
        for (let i = 1; i < sampled.length; i++) {
            const prev = sampled[i - 1].close;
            const cur = sampled[i].close;
            if (!prev || !Number.isFinite(prev) || !Number.isFinite(cur)) continue;
            returns.push({
                date: toISODate(sampled[i].date),
                ret: cur / prev - 1,
                close: cur,
                volume: sampled[i].volume || 0,
            });
        }

        const closes = sampled.map((x) => x.close);
        const dates = sampled.map((x) => toISODate(x.date));
        const sma50 = movingAverage(closes, 50);
        const sma200 = movingAverage(closes, 200);
        const rsi14 = computeRSI(closes, 14);

        const retValues = returns.map((r) => r.ret);
        const mu = mean(retValues);
        const sigma = stdev(retValues);

        const weekdayMap = new Map<string, number[]>();
        DAY_NAMES.forEach((d) => weekdayMap.set(d, []));
        returns.forEach((r) => {
            const day = new Date(r.date).getDay();
            const idx = day >= 1 && day <= 5 ? day - 1 : -1;
            if (idx >= 0) weekdayMap.get(DAY_NAMES[idx])?.push(r.ret * 100);
        });

        const dayOfWeek = DAY_NAMES.map((name) => ({ day: name, value: mean(weekdayMap.get(name) || []) }));

        const priceMin = Math.min(...closes);
        const priceMax = Math.max(...closes);
        const bins = 20;
        const width = (priceMax - priceMin) / bins || 1;
        const vp = Array.from({ length: bins }, (_, i) => ({
            price: priceMin + width * (i + 0.5),
            volume: 0,
        }));

        returns.forEach((r) => {
            const idx = Math.min(bins - 1, Math.max(0, Math.floor((r.close - priceMin) / width)));
            vp[idx].volume += r.volume;
        });

        const sortedReturns = [...retValues].sort((a, b) => a - b);
        const tailThresholds = [-0.02, -0.03, -0.04, -0.05];
        const tailCounts = tailThresholds.map((t) => ({
            label: `< ${(t * 100).toFixed(0)}%`,
            count: sortedReturns.filter((r) => r <= t).length,
        }));

        return {
            sampled,
            dates,
            closes,
            returns,
            retValues,
            sma50,
            sma200,
            rsi14,
            mu,
            sigma,
            dayOfWeek,
            volumeProfile: vp,
            acf: autocorrelation(retValues, 20),
            tailCounts,
        };
    }, [priceHistory]);
}

export default function QuantAnalysisTab() {
    const { ticker, priceHistory } = useStockDetail();
    const { data, loading, error } = useQuantAnalysis(ticker);
    const { data: fullPriceHistory } = usePriceHistory(ticker, "ALL");
    const workingPriceHistory = (fullPriceHistory && fullPriceHistory.length > 0 ? fullPriceHistory : (priceHistory || []));
    const derived = useQuantDerivedData(workingPriceHistory);

    if (loading && !data) return <div className="py-12 text-center text-sm text-muted-foreground animate-pulse">Đang tải dashboard định lượng...</div>;
    if (error && !data) return <div className="py-12 text-center text-sm text-red-500">Lỗi tải dữ liệu định lượng: {error}</div>;
    if (!data) return <div className="py-12 text-center text-sm text-muted-foreground">Không có dữ liệu định lượng</div>;

    const normalized = seriesFromQuant(data.wealthIndex);
    const proxyBenchmark = normalized.map((v, i, arr) => {
        if (i === 0) return 100;
        const start = Math.max(0, i - 20);
        return mean(arr.slice(start, i + 1).map((x) => x.value));
    });

    const returnsLen = derived.returns.length;
    const volWindowShort = Math.min(30, Math.max(10, Math.floor(returnsLen * 0.12)));
    const volWindowLong = Math.min(90, Math.max(volWindowShort + 5, Math.floor(returnsLen * 0.35)));
    const sharpeWindow = Math.min(252, Math.max(60, Math.floor(returnsLen * 0.7)));
    const betaWindow = Math.min(252, Math.max(60, Math.floor(returnsLen * 0.65)));

    // Risk charts prefer full history via /price-history?period=ALL.
    const vol30 = rollingVol(derived.returns, volWindowShort);
    const vol90 = rollingVol(derived.returns, volWindowLong);
    const sharpe252 = rollingSharpe(derived.returns, sharpeWindow);
    const beta252 = rollingBeta(derived.returns, betaWindow);

    const monthlySeasonality = Array.from({ length: 12 }, (_, i) => {
        const m = i + 1;
        const vals = data.monthlyReturns.filter((x) => x.month === m).map((x) => x.return);
        return { month: `T${m}`, value: mean(vals) };
    });

    const allMonthYears = [...new Set(data.monthlyReturns.map((x) => x.year))].sort((a, b) => a - b);
    const monthYears = allMonthYears.slice(-10);
    const heatMapData: [number, number, number][] = [];
    monthYears.forEach((y, yi) => {
        for (let m = 1; m <= 12; m++) {
            const found = data.monthlyReturns.find((x) => x.year === y && x.month === m);
            heatMapData.push([m - 1, yi, found?.return ?? 0]);
        }
    });

    const histogramBins = data.histogram.map((h) => h.bin);
    const histogramCounts = data.histogram.map((h) => h.count);
    const maxCount = Math.max(...histogramCounts, 1);
    const normalCurve = histogramBins.map((x) => {
        const p = (1 / (derived.sigma * Math.sqrt(2 * Math.PI))) * Math.exp(-((x / 100 - derived.mu) ** 2) / (2 * derived.sigma ** 2));
        return (p / Math.max(1e-9, 1 / (derived.sigma * Math.sqrt(2 * Math.PI)))) * maxCount;
    });

    return (
        <div className="space-y-6 pb-8">
            <div className="border-b border-border/60 pb-3">
                <h1 className="text-base font-bold text-foreground">Dashboard Định lượng - {ticker}</h1>
                <p className="text-xs text-muted-foreground mt-1">
                    Bản dựng theo đặc tả 5 phân hệ/13 biểu đồ. Dữ liệu rủi ro dùng history-price toàn kỳ để đảm bảo đủ chuỗi tính rolling.
                </p>
            </div>

            <Section index="I" title="Overview & Trend" subtitle="Hiệu suất tích lũy, drawdown và kỹ thuật tổng hợp">
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
                    <div className="xl:col-span-8">
                        <Card title="1) Lợi nhuận tích lũy (Normalized)" subtitle="Base 100: Asset vs benchmark proxy">
                            <ReactECharts
                                style={{ height: 330 }}
                                option={{
                                    tooltip: { trigger: "axis" },
                                    legend: { top: 0 },
                                    grid: { top: 30, left: 48, right: 16, bottom: 28 },
                                    xAxis: { type: "category", data: normalized.map((x) => x.date), boundaryGap: false },
                                    yAxis: { type: "value" },
                                    series: [
                                        { name: ticker, type: "line", data: normalized.map((x) => x.value), smooth: true, symbol: "none", lineStyle: { width: 2, color: THEME.accent } },
                                        { name: "Benchmark Proxy", type: "line", data: proxyBenchmark, smooth: true, symbol: "none", lineStyle: { width: 2, color: THEME.primary, type: "dashed" } },
                                    ],
                                }}
                            />
                        </Card>
                    </div>
                    <div className="xl:col-span-4">
                        <Card title="2) Hồ sơ sụt giảm (Underwater)">
                            <ReactECharts
                                style={{ height: 330 }}
                                option={{
                                    tooltip: { trigger: "axis" },
                                    grid: { top: 16, left: 44, right: 10, bottom: 26 },
                                    xAxis: { type: "category", data: data.drawdownData.map((x) => toISODate(x.date)), boundaryGap: false },
                                    yAxis: { type: "value", max: 0, axisLabel: { formatter: "{value}%" } },
                                    series: [{ type: "line", data: data.drawdownData.map((x) => x.value), symbol: "none", lineStyle: { color: THEME.negative, width: 1.6 }, areaStyle: { color: "rgba(220,38,38,0.15)" } }],
                                }}
                            />
                        </Card>
                    </div>
                </div>

                <Card title="3) Phân tích kỹ thuật tổng hợp" subtitle="Giá, SMA50, SMA200 và RSI14">
                    <ReactECharts
                        style={{ height: 360 }}
                        option={{
                            tooltip: { trigger: "axis" },
                            legend: { top: 0 },
                            grid: { top: 30, left: 52, right: 52, bottom: 30 },
                            xAxis: { type: "category", data: derived.dates, boundaryGap: false },
                            yAxis: [
                                { type: "value", name: "Price" },
                                { type: "value", name: "RSI", min: 0, max: 100, splitLine: { show: false } },
                            ],
                            series: [
                                { name: "Close", type: "line", data: derived.closes, symbol: "none", lineStyle: { color: THEME.accent, width: 1.8 } },
                                { name: "SMA50", type: "line", data: derived.sma50, symbol: "none", lineStyle: { color: THEME.primary, width: 1.5 } },
                                { name: "SMA200", type: "line", data: derived.sma200, symbol: "none", lineStyle: { color: THEME.violet, width: 1.5 } },
                                { name: "RSI14", type: "line", yAxisIndex: 1, data: derived.rsi14, symbol: "none", lineStyle: { color: THEME.negative, width: 1.3, type: "dashed" } },
                            ],
                            markLine: {
                                symbol: "none",
                                silent: true,
                                data: [
                                    { yAxis: 70, yAxisIndex: 1, lineStyle: { color: THEME.primary, type: "dotted" } },
                                    { yAxis: 30, yAxisIndex: 1, lineStyle: { color: THEME.positive, type: "dotted" } },
                                ],
                            },
                        }}
                    />
                </Card>
            </Section>

            <Section index="II" title="Risk & Volatility" subtitle="Biến động trượt, Sharpe trượt và độ nhạy beta">
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
                    <div className="xl:col-span-6">
                        <Card title="4) Rolling Volatility" subtitle="So sánh 30d và 90d (annualized)">
                            {vol30.length > 3 && vol90.length > 3 ? (
                                <ReactECharts
                                    style={{ height: 300 }}
                                    option={{
                                        tooltip: { trigger: "axis" },
                                        legend: { top: 0 },
                                        grid: { top: 28, left: 48, right: 14, bottom: 24 },
                                        xAxis: { type: "category", data: vol30.map((x) => x.date), boundaryGap: false },
                                        yAxis: { type: "value", axisLabel: { formatter: "{value}%" } },
                                        series: [
                                            { name: `${volWindowShort}d`, type: "line", data: vol30.map((x) => Number(x.value.toFixed(2))), symbol: "none", lineStyle: { color: THEME.info, width: 1.8 } },
                                            { name: `${volWindowLong}d`, type: "line", data: vol90.map((x) => Number(x.value.toFixed(2))), symbol: "none", lineStyle: { color: THEME.primary, width: 1.8 } },
                                        ],
                                    }}
                                />
                            ) : (
                                <div className="h-[300px] flex items-center justify-center text-sm text-muted-foreground">Không đủ dữ liệu để tính rolling volatility.</div>
                            )}
                        </Card>
                    </div>
                    <div className="xl:col-span-6">
                        <Card title="5) Rolling Sharpe" subtitle="Cửa sổ 252 phiên">
                            {sharpe252.length > 3 ? (
                                <ReactECharts
                                    style={{ height: 300 }}
                                    option={{
                                        tooltip: { trigger: "axis" },
                                        grid: { top: 18, left: 48, right: 14, bottom: 24 },
                                        xAxis: { type: "category", data: sharpe252.map((x) => x.date), boundaryGap: false },
                                        yAxis: { type: "value" },
                                        series: [{ type: "line", data: sharpe252.map((x) => Number(x.value.toFixed(2))), symbol: "none", lineStyle: { color: THEME.positive, width: 1.8 } }],
                                        markLine: { symbol: "none", silent: true, data: [{ yAxis: 1 }, { yAxis: 0 }] },
                                    }}
                                />
                            ) : (
                                <div className="h-[300px] flex items-center justify-center text-sm text-muted-foreground">Không đủ dữ liệu để tính rolling Sharpe.</div>
                            )}
                        </Card>
                    </div>
                </div>

                <Card title="6) Rolling Beta" subtitle="Beta trượt 252 phiên so với benchmark proxy">
                    {beta252.length > 3 ? (
                        <ReactECharts
                            style={{ height: 280 }}
                            option={{
                                tooltip: { trigger: "axis" },
                                grid: { top: 18, left: 48, right: 14, bottom: 24 },
                                xAxis: { type: "category", data: beta252.map((x) => x.date), boundaryGap: false },
                                yAxis: { type: "value" },
                                series: [{ type: "line", data: beta252.map((x) => Number(x.value.toFixed(3))), symbol: "none", lineStyle: { color: THEME.violet, width: 1.8 } }],
                                markLine: { symbol: "none", silent: true, data: [{ yAxis: 1 }] },
                            }}
                        />
                    ) : (
                        <div className="h-[280px] flex items-center justify-center text-sm text-muted-foreground">Không đủ dữ liệu để tính rolling Beta.</div>
                    )}
                </Card>
            </Section>

            <Section index="III" title="Stats & Tail Risk" subtitle="Phân phối lợi nhuận và nhận diện rủi ro đuôi">
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
                    <div className="xl:col-span-8">
                        <Card title="7) Histogram + Normal Curve" subtitle="So sánh phân phối thực tế với chuẩn lý thuyết">
                            <ReactECharts
                                style={{ height: 320 }}
                                option={{
                                    tooltip: { trigger: "axis" },
                                    legend: { top: 0 },
                                    grid: { top: 28, left: 50, right: 14, bottom: 30 },
                                    xAxis: { type: "category", data: histogramBins.map((x) => x.toFixed(2)), axisLabel: { interval: Math.max(1, Math.floor(histogramBins.length / 12)) } },
                                    yAxis: { type: "value" },
                                    series: [
                                        { name: "Histogram", type: "bar", data: histogramCounts, itemStyle: { color: "#60a5fa" }, barMaxWidth: 14 },
                                        { name: "Normal", type: "line", data: normalCurve.map((x) => Number(x.toFixed(2))), symbol: "none", lineStyle: { color: THEME.primary, width: 2 } },
                                    ],
                                }}
                            />
                        </Card>
                    </div>
                    <div className="xl:col-span-4">
                        <Card title="8) Fat-tail VaR" subtitle="Đếm số phiên rơi mạnh ở đuôi trái">
                            <ReactECharts
                                style={{ height: 320 }}
                                option={{
                                    tooltip: { trigger: "axis" },
                                    grid: { top: 16, left: 40, right: 12, bottom: 24 },
                                    xAxis: { type: "category", data: derived.tailCounts.map((x) => x.label) },
                                    yAxis: { type: "value" },
                                    series: [{ type: "bar", data: derived.tailCounts.map((x) => x.count), itemStyle: { color: THEME.negative }, barMaxWidth: 28 }],
                                }}
                            />
                            <div className="mt-2 text-xs text-muted-foreground">
                                VaR95: <span className="font-semibold text-foreground">{data.varData?.var95 ?? "N/A"}%</span> | VaR99: <span className="font-semibold text-foreground">{data.varData?.var99 ?? "N/A"}%</span>
                            </div>
                        </Card>
                    </div>
                </div>
            </Section>

            <Section index="IV" title="Micro-Structure" subtitle="Hành vi dòng tiền và quán tính chuỗi lợi nhuận">
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
                    <div className="xl:col-span-6">
                        <Card title="9) Volume Profile" subtitle="Khối lượng tích lũy theo vùng giá">
                            <ReactECharts
                                style={{ height: 300 }}
                                option={{
                                    tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
                                    grid: { top: 16, left: 62, right: 14, bottom: 24 },
                                    xAxis: { type: "value" },
                                    yAxis: { type: "category", data: derived.volumeProfile.map((x) => x.price.toFixed(1)) },
                                    series: [{ type: "bar", data: derived.volumeProfile.map((x) => Math.round(x.volume)), itemStyle: { color: THEME.accent }, barMaxWidth: 12 }],
                                }}
                            />
                        </Card>
                    </div>
                    <div className="xl:col-span-6">
                        <Card title="10) Autocorrelation (ACF)" subtitle="Lag 1-20 của chuỗi lợi nhuận ngày">
                            <ReactECharts
                                style={{ height: 300 }}
                                option={{
                                    tooltip: { trigger: "axis" },
                                    grid: { top: 16, left: 44, right: 14, bottom: 24 },
                                    xAxis: { type: "category", data: derived.acf.map((x) => `Lag ${x.lag}`) },
                                    yAxis: { type: "value", min: -1, max: 1 },
                                    series: [{ type: "bar", data: derived.acf.map((x) => Number(x.value.toFixed(4))), itemStyle: { color: THEME.positive }, barMaxWidth: 16 }],
                                }}
                            />
                        </Card>
                    </div>
                </div>
            </Section>

            <Section index="V" title="Seasonality" subtitle="Mùa vụ theo tháng và hiệu ứng theo thứ">
                <Card title="11) Heatmap hiệu suất theo tháng/năm" subtitle="Xanh: dương, Đỏ: âm">
                    <ReactECharts
                        style={{ height: Math.max(280, monthYears.length * 42 + 90) }}
                        option={{
                            tooltip: { position: "top" },
                            grid: { top: 12, left: 54, right: 20, bottom: 42 },
                            xAxis: { type: "category", data: ["T1", "T2", "T3", "T4", "T5", "T6", "T7", "T8", "T9", "T10", "T11", "T12"], splitArea: { show: true } },
                            yAxis: { type: "category", data: monthYears.map(String), splitArea: { show: true } },
                            visualMap: {
                                min: -20,
                                max: 20,
                                calculable: false,
                                orient: "horizontal",
                                left: "center",
                                bottom: 0,
                                inRange: { color: ["#fecaca", "#fef2f2", "#ecfeff", "#bbf7d0", "#16a34a"] },
                            },
                            series: [{ type: "heatmap", data: heatMapData, label: { show: true, formatter: (p: { data: [number, number, number] }) => `${p.data[2].toFixed(1)}%`, fontSize: 10 } }],
                        }}
                    />
                </Card>

                <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
                    <div className="xl:col-span-6">
                        <Card title="12) Seasonality theo tháng" subtitle="Lợi nhuận trung bình của từng tháng">
                            <ReactECharts
                                style={{ height: 280 }}
                                option={{
                                    tooltip: { trigger: "axis" },
                                    grid: { top: 16, left: 46, right: 14, bottom: 24 },
                                    xAxis: { type: "category", data: monthlySeasonality.map((x) => x.month) },
                                    yAxis: { type: "value", axisLabel: { formatter: "{value}%" } },
                                    series: [{ type: "bar", data: monthlySeasonality.map((x) => Number(x.value.toFixed(2))), itemStyle: { color: THEME.info }, barMaxWidth: 18 }],
                                }}
                            />
                        </Card>
                    </div>
                    <div className="xl:col-span-6">
                        <Card title="13) Hiệu ứng ngày trong tuần" subtitle="Lợi nhuận trung bình từ Thứ 2 đến Thứ 6">
                            <ReactECharts
                                style={{ height: 280 }}
                                option={{
                                    tooltip: { trigger: "axis" },
                                    grid: { top: 16, left: 46, right: 14, bottom: 24 },
                                    xAxis: { type: "category", data: derived.dayOfWeek.map((x) => x.day) },
                                    yAxis: { type: "value", axisLabel: { formatter: "{value}%" } },
                                    series: [{ type: "bar", data: derived.dayOfWeek.map((x) => Number(x.value.toFixed(3))), itemStyle: { color: THEME.violet }, barMaxWidth: 24 }],
                                }}
                            />
                        </Card>
                    </div>
                </div>
            </Section>
        </div>
    );
}
