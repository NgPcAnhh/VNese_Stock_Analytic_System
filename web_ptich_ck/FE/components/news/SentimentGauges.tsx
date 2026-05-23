'use client';

import React, { useEffect, useState } from 'react';
import ReactECharts from 'echarts-for-react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1';

interface SentimentData {
    daily: number;
    monthly: number;
}

const SentimentGauges = () => {
    const [data, setData] = useState<SentimentData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fetch(`${API}/news/sentiment-summary`);
                if (response.ok) {
                    const result = await response.json();
                    setData(result);
                }
            } catch (error) {
                console.error('Error fetching sentiment summary:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const getOption = (value: number, title: string) => {
        // Sentiment range from -100 to 100
        const displayValue = Math.max(-100, Math.min(100, value));

        return {
            series: [
                {
                    type: 'gauge',
                    startAngle: 200,
                    endAngle: -20,
                    min: -100,
                    max: 100,
                    splitNumber: 4,
                    radius: '88%',
                    center: ['50%', '60%'],
                    axisLine: {
                        lineStyle: {
                            width: 12,
                            color: [
                                [0.25, '#ef4444'], // Rất tiêu cực (-100 to -50)
                                [0.5, '#f97316'],  // Tiêu cực (-50 to 0)
                                [0.55, '#94a3b8'], // Trung tính (band quanh 0)
                                [0.75, '#3b82f6'], // Tích cực (0 to 50)
                                [1, '#22c55e']     // Rất tích cực (50 to 100)
                            ]
                        }
                    },
                    pointer: {
                        length: '55%',
                        width: 3,
                        itemStyle: {
                            color: 'auto'
                        }
                    },
                    axisTick: { show: false },
                    splitLine: {
                        show: true,
                        length: 12,
                        lineStyle: { color: '#cbd5f5', width: 1 }
                    },
                    axisLabel: {
                        show: false,
                    },
                    title: {
                        offsetCenter: [0, '80%'],
                        fontSize: 12,
                        fontWeight: 'bold',
                        color: '#64748b'
                    },
                    detail: {
                        fontSize: 14,
                        fontWeight: 'bold',
                        offsetCenter: [0, '25%'],
                        valueAnimation: false,
                        formatter: function (value: number) {
                            if (value <= -50) return 'Rất tiêu cực';
                            if (value < 0) return 'Tiêu cực';
                            if (value === 0) return 'Trung tính';
                            if (value < 50) return 'Tích cực';
                            return 'Rất tích cực';
                        },
                        color: 'auto'
                    },

                    data: [
                        {
                            value: displayValue,
                            name: title
                        }
                    ]
                }
            ]
        };
    };

    if (loading) return <div className="p-4 border rounded-xl bg-card h-40 flex items-center justify-center">Đang tải tâm lý...</div>;
    if (!data) return null;

    return (
        <div className="p-4 border rounded-xl bg-card shadow-sm space-y-2">
            <h3 className="text-sm font-bold text-foreground mb-2 border-b pb-2">
                Chỉ số tâm lý thị trường
            </h3>
            <div className="grid grid-cols-2 gap-2">
                <div className="h-32">
                    <ReactECharts option={getOption(data.daily, 'Ngày')} style={{ height: '100%', width: '100%' }} />
                </div>
                <div className="h-32">
                    <ReactECharts option={getOption(data.monthly, 'Tháng')} style={{ height: '100%', width: '100%' }} />
                </div>
            </div>
        </div>
    );
};

export default SentimentGauges;
