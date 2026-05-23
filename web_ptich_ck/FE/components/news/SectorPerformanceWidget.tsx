'use client';

import React, { useEffect, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1';

interface SectorSentiment {
    sector: string;
    sentiment: number;
    article_count: number;
}

const SectorPerformanceWidget = () => {
    const [sectors, setSectors] = useState<SectorSentiment[]>([]);
    const [loading, setLoading] = useState(true);
    const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month'>('month');

    useEffect(() => {
        const fetchSectors = async () => {
            setLoading(true);
            try {
                const response = await fetch(`${API}/news/sector-sentiment?time_range=${encodeURIComponent(timeRange)}`);
                if (response.ok) {
                    const data = await response.json();
                    setSectors(data);
                }
            } catch (error) {
                console.error('Error fetching sector sentiment:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchSectors();
    }, [timeRange]);

    const getSentimentColor = (val: number) => {
        if (val <= -50) return 'text-red-500 bg-red-500/10';
        if (val < 0) return 'text-orange-500 bg-orange-500/10';
        if (val === 0) return 'text-slate-500 bg-slate-500/10';
        if (val < 50) return 'text-blue-500 bg-blue-500/10';
        return 'text-green-500 bg-green-500/10';
    };

    const getSentimentLabel = (val: number) => {
        if (val <= -50) return 'Rất tiêu cực';
        if (val < 0) return 'Tiêu cực';
        if (val === 0) return 'Trung tính';
        if (val < 50) return 'Tích cực';
        return 'Rất tích cực';
    };

    return (
        <div className="p-4 border rounded-xl bg-card shadow-sm">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-base flex-1">Tâm lý theo Ngành</h3>
                <select 
                    value={timeRange}
                    onChange={(e) => setTimeRange(e.target.value as any)}
                    className="text-xs p-1 border rounded bg-background outline-none cursor-pointer"
                >
                    <option value="day">Hôm nay</option>
                    <option value="week">Tuần này</option>
                    <option value="month">Tháng này</option>
                </select>
            </div>
            
            {loading ? (
                <div className="animate-pulse space-y-3">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="h-8 bg-slate-200 rounded w-full dark:bg-slate-700"></div>
                    ))}
                </div>
            ) : sectors.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">Chưa có dữ liệu</p>
            ) : (
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                    {sectors.map((s, idx) => (
                        <div key={idx} className="flex items-center justify-between group">
                            <div className="flex-1 truncate pr-2">
                                <span className="text-sm font-medium block truncate" title={s.sector}>
                                    {s.sector}
                                </span>
                                <span className="text-[10px] text-gray-500">
                                    {s.article_count} bài viết
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className={`px-2 py-1 rounded text-xs font-semibold whitespace-nowrap ${getSentimentColor(s.sentiment)}`}>
                                    {s.sentiment > 0 ? '+' : ''}{s.sentiment.toFixed(1)}
                                </div>
                                <div className={`px-2 py-1 rounded text-xs font-semibold whitespace-nowrap ${getSentimentColor(s.sentiment)}`}>
                                    {getSentimentLabel(s.sentiment)}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default SectorPerformanceWidget;
