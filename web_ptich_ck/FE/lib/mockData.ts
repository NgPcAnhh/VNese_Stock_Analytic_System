// Mock Data for Market & News pages
// This file contains mock data for existing components that import from @/lib/mockData

// ==================== NEWS DATA ====================

export const NEWS_HERO_DATA = {
    main: {
        id: "1",
        title: "VN-Index vượt mốc 1,300 điểm sau phiên giao dịch sôi động",
        summary: "Thị trường chứng khoán Việt Nam ghi nhận phiên tăng điểm mạnh với thanh khoản cao kỷ lục.",
        image: "https://via.placeholder.com/800x400",
        category: "Thị trường",
        time: "2 giờ trước",
    },
    secondary: [
        { id: "2", title: "Doanh nghiệp BĐS báo lãi quý 4 tăng mạnh", category: "Doanh nghiệp", time: "3 giờ trước" },
        { id: "3", title: "Fed giữ nguyên lãi suất trong cuộc họp tháng 1", category: "Quốc tế", time: "4 giờ trước" },
        { id: "4", title: "Cổ phiếu ngân hàng dẫn dắt thị trường", category: "Phân tích", time: "5 giờ trước" },
    ],
};

export const NEWS_FEED_DATA = [
    { id: "1", title: "VIC công bố kết quả kinh doanh quý 4/2025 vượt kỳ vọng", category: "Doanh nghiệp", time: "30 phút trước", source: "VnEconomy" },
    { id: "2", title: "Thị trường chứng khoán châu Á tăng điểm đồng loạt", category: "Quốc tế", time: "1 giờ trước", source: "Bloomberg" },
    { id: "3", title: "Cổ phiếu công nghệ hút dòng tiền lớn", category: "Phân tích", time: "2 giờ trước", source: "CafeF" },
    { id: "4", title: "Ngân hàng Nhà nước điều chỉnh tỷ giá tham chiếu", category: "Vĩ mô", time: "3 giờ trước", source: "VnExpress" },
    { id: "5", title: "Doanh nghiệp thép báo lỗ quý 4 do giá nguyên liệu tăng", category: "Doanh nghiệp", time: "4 giờ trước", source: "NDH" },
];

export const NEWS_TAGS = [
    { id: "all", label: "Tất cả" },
    { id: "market", label: "Thị trường" },
    { id: "company", label: "Doanh nghiệp" },
    { id: "analysis", label: "Phân tích" },
    { id: "macro", label: "Vĩ mô" },
    { id: "international", label: "Quốc tế" },
];

export const MOST_READ_NEWS = [
    { id: "1", title: "Top 10 cổ phiếu được khối ngoại mua ròng nhiều nhất tuần", views: 15420 },
    { id: "2", title: "VN-Index sẽ đi về đâu trong tháng 2?", views: 12350 },
    { id: "3", title: "Cổ phiếu nào sẽ hưởng lợi từ gói kích thích kinh tế mới?", views: 9870 },
    { id: "4", title: "Phân tích kỹ thuật VIC: Tín hiệu tích cực", views: 8540 },
    { id: "5", title: "Báo cáo ngành BĐS quý 1/2026", views: 7230 },
];

// ==================== MARKET DATA ====================

export const SECTOR_OVERVIEW_DATA = [
    { name: "Ngân hàng", change: 1.25, volume: 125000000, value: 2500, cashFlow: 2500 },
    { name: "Bất động sản", change: -0.85, volume: 98000000, value: 1800, cashFlow: 1800 },
    { name: "Thép", change: 2.15, volume: 45000000, value: 850, cashFlow: 850 },
    { name: "Chứng khoán", change: 0.65, volume: 67000000, value: 1200, cashFlow: 1200 },
    { name: "Dầu khí", change: -1.35, volume: 34000000, value: 620, cashFlow: 620 },
    { name: "Công nghệ", change: 3.25, volume: 28000000, value: 540, cashFlow: 540 },
    { name: "Bán lẻ", change: 0.45, volume: 42000000, value: 780, cashFlow: 780 },
    { name: "Điện", change: -0.25, volume: 19000000, value: 350, cashFlow: 350 },
];

export interface SectorTableRow {
    name: string;
    stockCount: number;
    marketCap: string;
    pe: number;
    pb: number;
    priceChange1D: number;
    priceChange7D: number;
    priceChangeYTD: number;
    priceChange1Y: number;
    priceChange3Y: number;
}

export const SECTOR_TABLE_DATA: SectorTableRow[] = [
    { name: "Tài chính", stockCount: 83, marketCap: "3,550,712T", pe: 12.21, pb: 1.85, priceChange1D: -0.72, priceChange7D: 1.60, priceChangeYTD: 6.93, priceChange1Y: 32.56, priceChange3Y: 109.17 },
    { name: "Bất động sản", stockCount: 129, marketCap: "2,277,416T", pe: 13.95, pb: 2.02, priceChange1D: -0.13, priceChange7D: 6.34, priceChangeYTD: -5.22, priceChange1Y: 101.18, priceChange3Y: 92.53 },
    { name: "Công nghiệp", stockCount: 458, marketCap: "997,449T", pe: 14.92, pb: 4.23, priceChange1D: -1.04, priceChange7D: 3.16, priceChangeYTD: 3.51, priceChange1Y: 34.86, priceChange3Y: 135.24 },
    { name: "Hàng hóa thiết yếu", stockCount: 184, marketCap: "796,585T", pe: 20.46, pb: 5.12, priceChange1D: -0.02, priceChange7D: -0.37, priceChangeYTD: -0.93, priceChange1Y: 19.73, priceChange3Y: 111.91 },
    { name: "Hàng hóa không thiết yếu", stockCount: 194, marketCap: "706,944T", pe: 19.60, pb: 3.11, priceChange1D: -1.22, priceChange7D: 0.92, priceChangeYTD: 17.23, priceChange1Y: 36.44, priceChange3Y: 127.02 },
    { name: "Công nghệ", stockCount: 36, marketCap: "574,218T", pe: 17.50, pb: 4.57, priceChange1D: -1.08, priceChange7D: -2.35, priceChangeYTD: 7.12, priceChange1Y: -4.59, priceChange3Y: 135.36 },
    { name: "Năng lượng", stockCount: 80, marketCap: "540,415T", pe: 20.40, pb: 2.83, priceChange1D: -0.52, priceChange7D: -6.19, priceChangeYTD: 38.99, priceChange1Y: 65.92, priceChange3Y: 99.47 },
    { name: "Nguyên vật liệu", stockCount: 259, marketCap: "509,213T", pe: 13.31, pb: 1.98, priceChange1D: -1.31, priceChange7D: 0.71, priceChangeYTD: 8.76, priceChange1Y: 12.32, priceChange3Y: 106.97 },
    { name: "Tiện ích", stockCount: 107, marketCap: "278,694T", pe: 10.44, pb: 1.72, priceChange1D: 0.16, priceChange7D: 0.51, priceChangeYTD: 4.49, priceChange1Y: 4.05, priceChange3Y: 42.11 },
    { name: "Y tế", stockCount: 62, marketCap: "156,320T", pe: 18.75, pb: 3.45, priceChange1D: 0.45, priceChange7D: 1.23, priceChangeYTD: 5.67, priceChange1Y: 15.89, priceChange3Y: 78.45 },
];

export const MARKET_HEATMAP_DATA = [
    {
        name: "Ngân hàng",
        children: [
            { name: "VCB", value: 450, pChange: 1.5, volume: 5000000 },
            { name: "BID", value: 380, pChange: -0.8, volume: 4200000 },
            { name: "CTG", value: 320, pChange: 2.1, volume: 3800000 },
            { name: "TCB", value: 280, pChange: 0.5, volume: 3200000 },
            { name: "MBB", value: 250, pChange: -1.2, volume: 2900000 },
            { name: "VPB", value: 220, pChange: 1.8, volume: 2500000 },
            { name: "STB", value: 170, pChange: 0.3, volume: 2100000 },
            { name: "ACB", value: 200, pChange: -0.4, volume: 1800000 },
        ],
    },
    {
        name: "Bất động sản",
        children: [
            { name: "VIC", value: 350, pChange: 2.67, volume: 3317300 },
            { name: "VHM", value: 300, pChange: 1.7, volume: 7272000 },
            { name: "NVL", value: 180, pChange: -2.3, volume: 7998800 },
            { name: "KDH", value: 150, pChange: -1.4, volume: 2905800 },
            { name: "PDR", value: 120, pChange: -2.2, volume: 7230500 },
            { name: "DXG", value: 110, pChange: 3.1, volume: 4500000 },
            { name: "NLG", value: 90, pChange: 0.6, volume: 1800000 },
        ],
    },
    {
        name: "Chứng khoán",
        children: [
            { name: "SSI", value: 200, pChange: 1.2, volume: 8500000 },
            { name: "VND", value: 180, pChange: -0.5, volume: 6200000 },
            { name: "HCM", value: 150, pChange: 0.8, volume: 4100000 },
            { name: "VCI", value: 120, pChange: 2.5, volume: 3200000 },
            { name: "FTS", value: 80, pChange: -1.1, volume: 2500000 },
        ],
    },
    {
        name: "Thép",
        children: [
            { name: "HPG", value: 280, pChange: 2.8, volume: 12000000 },
            { name: "HSG", value: 120, pChange: 1.5, volume: 5500000 },
            { name: "NKG", value: 80, pChange: -0.3, volume: 2800000 },
            { name: "TLH", value: 50, pChange: -1.8, volume: 1200000 },
        ],
    },
    {
        name: "Công nghệ",
        children: [
            { name: "FPT", value: 380, pChange: 2.5, volume: 4500000 },
            { name: "CMG", value: 90, pChange: 1.8, volume: 1200000 },
            { name: "ELC", value: 60, pChange: 0.5, volume: 800000 },
        ],
    },
    {
        name: "Dầu khí",
        children: [
            { name: "GAS", value: 220, pChange: -1.3, volume: 2800000 },
            { name: "PLX", value: 160, pChange: -0.7, volume: 2200000 },
            { name: "PVD", value: 100, pChange: 1.9, volume: 3700000 },
            { name: "PVS", value: 90, pChange: 0.4, volume: 3100000 },
            { name: "BSR", value: 70, pChange: -2.1, volume: 1500000 },
        ],
    },
    {
        name: "Bán lẻ",
        children: [
            { name: "MWG", value: 200, pChange: 1.1, volume: 3300000 },
            { name: "FRT", value: 80, pChange: 3.4, volume: 900000 },
            { name: "DGW", value: 70, pChange: -0.9, volume: 1100000 },
            { name: "PNJ", value: 120, pChange: 0.7, volume: 1600000 },
        ],
    },
    {
        name: "Thực phẩm & Đồ uống",
        children: [
            { name: "VNM", value: 250, pChange: -0.4, volume: 2700000 },
            { name: "MSN", value: 200, pChange: 1.6, volume: 3100000 },
            { name: "SAB", value: 150, pChange: -0.2, volume: 400000 },
            { name: "KDC", value: 70, pChange: 0.9, volume: 900000 },
        ],
    },
    {
        name: "Điện & Năng lượng",
        children: [
            { name: "POW", value: 100, pChange: -0.6, volume: 4200000 },
            { name: "GEG", value: 50, pChange: 2.2, volume: 1500000 },
            { name: "REE", value: 120, pChange: 0.3, volume: 1800000 },
            { name: "NT2", value: 60, pChange: -1.5, volume: 800000 },
        ],
    },
    {
        name: "Hóa chất & Phân bón",
        children: [
            { name: "DPM", value: 90, pChange: 1.4, volume: 2200000 },
            { name: "DCM", value: 80, pChange: 0.8, volume: 1900000 },
            { name: "DGC", value: 110, pChange: -1.0, volume: 1400000 },
            { name: "CSV", value: 40, pChange: 2.0, volume: 600000 },
        ],
    },
    {
        name: "Logistics & Vận tải",
        children: [
            { name: "GMD", value: 100, pChange: 1.3, volume: 1500000 },
            { name: "HAH", value: 60, pChange: -0.8, volume: 900000 },
            { name: "VTP", value: 50, pChange: 0.6, volume: 700000 },
        ],
    },
];

export const INDEX_IMPACT_DATA = [
    { ticker: "VCB", impact: 1.25 },
    { ticker: "VIC", impact: 0.85 },
    { ticker: "VHM", impact: 0.65 },
    { ticker: "HPG", impact: -0.45 },
    { ticker: "TCB", impact: 0.35 },
    { ticker: "BID", impact: -0.55 },
    { ticker: "MSN", impact: 0.25 },
    { ticker: "VNM", impact: -0.15 },
];

export const LIQUIDITY_DISTRIBUTION_DATA = [
    { type: "Ngân hàng", value: 2500, color: "#3b82f6" },
    { type: "BĐS", value: 1800, color: "#22c55e" },
    { type: "Chứng khoán", value: 1200, color: "#f59e0b" },
    { type: "Thép", value: 850, color: "#ef4444" },
    { type: "Khác", value: 1650, color: "#8b5cf6" },
];

export const FOREIGN_FLOW_DATA = [
    { date: "16/01", netVal: 125 },
    { date: "17/01", netVal: -85 },
    { date: "18/01", netVal: 210 },
    { date: "19/01", netVal: -45 },
    { date: "20/01", netVal: 180 },
    { date: "21/01", netVal: -120 },
    { date: "22/01", netVal: 95 },
    { date: "23/01", netVal: 150 },
];

export const DETAILED_SECTOR_DATA = [
    {
        sector: "Ngân hàng",
        stocks: [
            { ticker: "VCB", price: 89500, change: 1.5, volume: 5000000, marketCap: "425,000T" },
            { ticker: "BID", price: 50800, change: -0.8, volume: 4200000, marketCap: "250,000T" },
            { ticker: "CTG", price: 39000, change: 2.1, volume: 3800000, marketCap: "180,000T" },
            { ticker: "TCB", price: 25500, change: 0.5, volume: 3200000, marketCap: "90,000T" },
        ],
    },
    {
        sector: "Bất động sản",
        stocks: [
            { ticker: "VIC", price: 165400, change: 2.67, volume: 3317300, marketCap: "1,274,577T" },
            { ticker: "VHM", price: 122500, change: 1.7, volume: 7272000, marketCap: "503,157T" },
            { ticker: "NVL", price: 12500, change: -2.3, volume: 7998800, marketCap: "27,900T" },
            { ticker: "KDH", price: 28900, change: -1.4, volume: 2905800, marketCap: "32,432T" },
        ],
    },
    {
        sector: "Chứng khoán",
        stocks: [
            { ticker: "SSI", price: 35500, change: 1.2, volume: 8500000, marketCap: "52,000T" },
            { ticker: "VND", price: 18500, change: -0.5, volume: 6200000, marketCap: "22,000T" },
            { ticker: "HCM", price: 28000, change: 0.8, volume: 4100000, marketCap: "18,000T" },
        ],
    },
    {
        sector: "Thép",
        stocks: [
            { ticker: "HPG", price: 28500, change: 2.8, volume: 12000000, marketCap: "125,000T" },
            { ticker: "HSG", price: 18500, change: 1.5, volume: 5500000, marketCap: "12,000T" },
            { ticker: "NKG", price: 25000, change: -0.3, volume: 2800000, marketCap: "8,000T" },
        ],
    },
];
