// ==================== MARKET CHART OHLCV DATA ====================
// Dữ liệu OHLCV cho 4 chỉ số thị trường, 1 năm (khoảng 250 phiên giao dịch)

export interface OHLCVData {
    date: string;       // "YYYY-MM-DD"
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

// Hàm tạo dữ liệu OHLCV giả lập chân thực
function generateOHLCV(
    startPrice: number,
    startDate: Date,
    days: number,
    volatility: number,
    volumeBase: number,
    trend: number // trend bias: 0.001 = nhẹ tăng, -0.001 = nhẹ giảm
): OHLCVData[] {
    const data: OHLCVData[] = [];
    let price = startPrice;

    for (let i = 0; i < days; i++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        // Bỏ qua thứ 7 và chủ nhật
        const dow = date.getDay();
        if (dow === 0 || dow === 6) continue;

        const dailyReturn = (Math.random() - 0.48 + trend) * volatility;
        const open = price;
        const close = +(price * (1 + dailyReturn)).toFixed(2);
        const intraHigh = Math.max(open, close) * (1 + Math.random() * volatility * 0.5);
        const intraLow = Math.min(open, close) * (1 - Math.random() * volatility * 0.3);
        const high = +intraHigh.toFixed(2);
        const low = +intraLow.toFixed(2);

        // Volume biến động ngẫu nhiên, có xu hướng tăng khi giá giảm mạnh
        const volMultiplier = Math.abs(dailyReturn) > 0.015 ? 1.5 + Math.random() : 0.7 + Math.random() * 0.8;
        const volume = Math.floor(volumeBase * volMultiplier);

        data.push({
            date: date.toISOString().slice(0, 10),
            open,
            high,
            low,
            close,
            volume,
        });

        price = close;
    }
    return data;
}

// Tạo data cho từng chỉ số (365 ngày, ~250 phiên)
const START_DATE = new Date("2025-02-01");

export const VNINDEX_DATA = generateOHLCV(1200, START_DATE, 365, 0.012, 650000000, 0.0008);
export const VN30_DATA = generateOHLCV(1240, START_DATE, 365, 0.014, 320000000, 0.0006);
export const HNX_DATA = generateOHLCV(228, START_DATE, 365, 0.016, 85000000, -0.0003);
export const UPCOM_DATA = generateOHLCV(88, START_DATE, 365, 0.008, 25000000, 0.0001);

// Map để tra cứu theo ticker
export const MARKET_CHART_DATA: Record<string, OHLCVData[]> = {
    VNINDEX: VNINDEX_DATA,
    VN30: VN30_DATA,
    HNX: HNX_DATA,
    UPCOM: UPCOM_DATA,
};

// Thông tin meta cho từng chỉ số
export const INDEX_META: Record<string, { name: string; color: string; areaColor: [string, string] }> = {
    VNINDEX: { name: "VN-INDEX", color: "#22c55e", areaColor: ["rgba(34,197,94,0.35)", "rgba(34,197,94,0.02)"] },
    VN30: { name: "VN30", color: "#3b82f6", areaColor: ["rgba(59,130,246,0.35)", "rgba(59,130,246,0.02)"] },
    HNX: { name: "HNX-INDEX", color: "#f59e0b", areaColor: ["rgba(245,158,11,0.35)", "rgba(245,158,11,0.02)"] },
    UPCOM: { name: "UPCOM", color: "#8b5cf6", areaColor: ["rgba(139,92,246,0.35)", "rgba(139,92,246,0.02)"] },
};
