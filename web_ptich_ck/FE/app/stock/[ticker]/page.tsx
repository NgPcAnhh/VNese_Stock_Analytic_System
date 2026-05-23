"use client";

import React, { useState, use, useMemo, useEffect } from "react";
import StockDetailHeader from "@/components/stock/StockDetailHeader";
import NavigationTabs from "@/components/stock/NavigationTabs";
import PriceHistoryChart from "@/components/stock/PriceHistoryChart";
import OrderBook from "@/components/stock/OrderBook";
import HistoricalDataTable from "@/components/stock/HistoricalDataTable";
import TechnicalGaugeCard from "@/components/stock/TechnicalGaugeCard";
import ShareholderList from "@/components/stock/ShareholderList";
import ShareholderDonutChart from "@/components/stock/ShareholderDonutChart";
import CorporateNews from "@/components/stock/CorporateNews";
import RecommendationsSection from "@/components/stock/RecommendationsSection";
import CompanyProfileTab from "@/components/stock/CompanyProfileTab";
import StockComparisonTab from "@/components/stock/StockComparisonTab";
import QuantAnalysisTab from "@/components/stock/QuantAnalysisTab";
import BalanceSheetTab from "@/components/stock/BalanceSheetTab";
import FinancialReportsTab from "@/components/stock/FinancialReportsTab";
import FinancialOverviewCharts from "@/components/stock/FinancialOverviewCharts";
import { Card, CardContent } from "@/components/ui/card";
import { Footer } from "@/components/layout/Footer";
import { useStockOverview, useFinancialReports, useFinancialRatios } from "@/hooks/useStockData";
import { StockDetailProvider, type StockDetailData } from "@/lib/StockDetailContext";
import { useTracking } from "@/hooks/useTracking";
import { useAuth } from "@/lib/AuthContext";

interface StockDetailPageProps {
    params: Promise<{ ticker: string }>;
}

/* ── Skeleton placeholder while overview loads ── */
function OverviewSkeleton() {
    return (
        <div className="animate-pulse space-y-4">
            <div className="h-28 bg-muted rounded-xl" />
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
                <div className="lg:col-span-8 h-72 bg-muted rounded-xl" />
                <div className="lg:col-span-4 h-72 bg-muted rounded-xl" />
            </div>
        </div>
    );
}

const EMPTY_OVERVIEW: StockDetailData = {
    stockInfo: { ticker: "", exchange: "", companyName: "", companyNameFull: "", overview: "", logoUrl: "", tags: [], website: "", currentPrice: 0, priceChange: 0, priceChangePercent: 0, dayLow: 0, dayHigh: 0, referencePrice: 0, ceilingPrice: 0, floorPrice: 0, metrics: { marketCap: "0", marketCapRank: 0, volume: "0", pe: "0", peRank: 0, eps: "0", pb: "0", evEbitda: "0", outstandingShares: "0", roe: "0", bvps: "0" }, evaluation: { risk: "", valuation: "", fundamentalAnalysis: "", technicalAnalysis: "" } },
    priceHistory: [], orderBook: [], historicalData: [], shareholders: [],
    shareholderStructure: [],
    peerStocks: [], corporateNews: [], recommendations: [],
    ticker: "", loading: true, error: null,
};

export default function StockDetailPage({ params }: StockDetailPageProps) {
    const { ticker } = use(params);
    const upperTicker = ticker.toUpperCase();
    const { data: apiData, loading, error } = useStockOverview(upperTicker);
    const { data: financialReportData } = useFinancialReports(upperTicker, 20);
    const { data: financialRatiosData } = useFinancialRatios(upperTicker, 20);
    const [activeTab, setActiveTab] = useState("overview");
    const { user } = useAuth();
    const { trackAnalysisView } = useTracking(user?.id);

    // Track lượt xem mã CK khi page mount
    useEffect(() => {
        if (upperTicker) trackAnalysisView(upperTicker);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [upperTicker]);

    const contextValue: StockDetailData = useMemo(() => {
        if (!apiData) return { ...EMPTY_OVERVIEW, ticker: upperTicker, loading, error, onTabChange: setActiveTab };
        return { ...apiData, ticker: upperTicker, loading, error, onTabChange: setActiveTab };
    }, [apiData, upperTicker, loading, error]);

    return (
        <StockDetailProvider data={contextValue}>
            <div className="min-h-screen bg-background">
                <div className="max-w-[1440px] mx-auto px-4 py-4 space-y-6">

                {/* Section 1: Header & Overview */}
                <StockDetailHeader />

                {/* Navigation Tabs */}
                <NavigationTabs activeTab={activeTab} onTabChange={setActiveTab} ticker={upperTicker} />

                {/* Loading / Error states */}
                {loading && !apiData && <OverviewSkeleton />}
                {error && !apiData && (
                    <div className="text-center py-12 text-red-500">
                        Không thể tải dữ liệu: {error}
                    </div>
                )}

                {activeTab === "overview" && (
                    <div className="space-y-8">
                        {/* ── KPI báo cáo tài chính ── */}
                        {financialReportData?.incomeStatement?.length ? (
                            <section className="space-y-4">
                                <h2 className="text-base font-semibold text-muted-foreground flex items-center gap-2">
                                    <span className="w-1 h-5 bg-gradient-to-b from-orange-400 to-orange-600 rounded-full shadow-[0_0_8px_rgba(249,115,22,0.4)]" />
                                    KPI báo cáo tài chính
                                </h2>
                                <FinancialOverviewCharts
                                    incomeStatement={financialReportData.incomeStatement}
                                    balanceSheet={financialReportData.balanceSheet}
                                    cashFlow={financialReportData.cashFlow}
                                    financialRatios={financialRatiosData ?? undefined}
                                    isBank={financialReportData.isBank}
                                    mode="kpi-only"
                                />
                            </section>
                        ) : null}

                        {/* ── Biểu đồ & Khớp lệnh ── */}
                        <section className="space-y-4">
                            <h2 className="text-base font-semibold text-muted-foreground flex items-center gap-2">
                                <span className="w-1 h-5 bg-gradient-to-b from-orange-400 to-orange-600 rounded-full shadow-[0_0_8px_rgba(249,115,22,0.4)]" />
                                Biểu đồ & Khớp lệnh
                            </h2>
                            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,72%)_minmax(0,28%)] gap-4">
                                <div>
                                    <PriceHistoryChart />
                                </div>
                                <div>
                                    <OrderBook />
                                </div>
                            </div>
                        </section>

                        {/* ── Dữ liệu giao dịch ── */}
                        <section className="space-y-4">
                            <h2 className="text-base font-semibold text-muted-foreground flex items-center gap-2">
                                <span className="w-1 h-5 bg-gradient-to-b from-orange-400 to-orange-600 rounded-full shadow-[0_0_8px_rgba(249,115,22,0.4)]" />
                                Dữ liệu giao dịch lịch sử
                            </h2>
                            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,72%)_minmax(0,28%)] gap-4">
                                <div className="min-w-0">
                                    <HistoricalDataTable />
                                </div>
                                <div className="min-w-0">
                                    <TechnicalGaugeCard ticker={upperTicker} />
                                </div>
                            </div>
                        </section>

                        {/* ── Dashboard số liệu tài chính ── */}
                        {financialReportData?.incomeStatement?.length ? (
                            <section className="space-y-4">
                                <h2 className="text-base font-semibold text-muted-foreground flex items-center gap-2">
                                    <span className="w-1 h-5 bg-gradient-to-b from-orange-400 to-orange-600 rounded-full shadow-[0_0_8px_rgba(249,115,22,0.4)]" />
                                    Dashboard số liệu tài chính
                                </h2>
                                <FinancialOverviewCharts
                                    incomeStatement={financialReportData.incomeStatement}
                                    balanceSheet={financialReportData.balanceSheet}
                                    cashFlow={financialReportData.cashFlow}
                                    financialRatios={financialRatiosData ?? undefined}
                                    isBank={financialReportData.isBank}
                                    mode="dashboard-only"
                                />
                            </section>
                        ) : null}

                        {/* ── Cơ cấu cổ đông ── */}
                        <section className="space-y-4">
                            <h2 className="text-base font-semibold text-muted-foreground flex items-center gap-2">
                                <span className="w-1 h-5 bg-gradient-to-b from-orange-400 to-orange-600 rounded-full shadow-[0_0_8px_rgba(249,115,22,0.4)]" />
                                Cơ cấu cổ đông
                            </h2>
                            <Card className="shadow-sm border-border">
                                <CardContent className="p-4">
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                                        <div className="flex items-center justify-center">
                                            <ShareholderDonutChart />
                                        </div>
                                        <div>
                                            <ShareholderList />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </section>

                        {/* ── Tin tức doanh nghiệp ── */}
                        <section className="space-y-4">
                            <h2 className="text-base font-semibold text-muted-foreground flex items-center gap-2">
                                <span className="w-1 h-5 bg-gradient-to-b from-orange-400 to-orange-600 rounded-full shadow-[0_0_8px_rgba(249,115,22,0.4)]" />
                                Tin tức doanh nghiệp
                            </h2>
                            <CorporateNews mode="overview" />
                        </section>

                        {/* ── Khuyến nghị ── */}
                        <section className="space-y-4">
                            <h2 className="text-base font-semibold text-muted-foreground flex items-center gap-2">
                                <span className="w-1 h-5 bg-gradient-to-b from-orange-400 to-orange-600 rounded-full shadow-[0_0_8px_rgba(249,115,22,0.4)]" />
                                Có thể bạn sẽ quan tâm
                            </h2>
                            <RecommendationsSection />
                        </section>
                    </div>
                )}

                {activeTab === "news" && (
                    <div className="py-4 space-y-3">
                        <h2 className="text-base font-semibold text-muted-foreground flex items-center gap-2">
                            <span className="w-1 h-5 bg-gradient-to-b from-orange-400 to-orange-600 rounded-full shadow-[0_0_8px_rgba(249,115,22,0.4)]" />
                            Tin tức doanh nghiệp
                        </h2>
                        <CorporateNews mode="full" />
                    </div>
                )}

                {activeTab === "profile" && (
                    <div className="py-4">
                        <CompanyProfileTab />
                    </div>
                )}

                {activeTab === "compare" && (
                    <div className="py-4">
                        <StockComparisonTab />
                    </div>
                )}

                {activeTab === "quant" && (
                    <div className="py-4">
                        <QuantAnalysisTab />
                    </div>
                )}

                {activeTab === "dashboard" && (
                    <div className="py-4">
                        <BalanceSheetTab />
                    </div>
                )}

                {activeTab === "financials" && (
                    <div className="py-4">
                        <FinancialReportsTab />
                    </div>
                )}



            </div>

            {/* Spacing before footer */}
            <div className="h-12" />

            {/* Footer */}
            <Footer />
        </div>
        </StockDetailProvider>
    );
}
