// Stock Detail Page Mock Data - Updated to match detailed specifications
// Based on VIC (Vingroup) reference screenshots

// ==================== TYPES ====================

export interface StockInfo {
    ticker: string;
    exchange: string;
    companyName: string;
    companyNameFull: string;
    logoUrl: string;
    tags: string[];
    website: string;
    currentPrice: number;
    priceChange: number;
    priceChangePercent: number;
    dayLow: number;
    dayHigh: number;
    referencePrice: number;
    ceilingPrice: number;
    floorPrice: number;
    metrics: {
        marketCap: string;
        marketCapRank: number;
        volume: string;
        pe: string;
        peRank: number;
        eps: string;
        pb: string;
        evEbitda: string;
        outstandingShares: string;
        roe: string;
    };
    evaluation: {
        risk: 'Cao' | 'Trung bình' | 'Thấp';
        valuation: 'Hấp dẫn' | 'Không hấp dẫn' | 'Trung bình';
        fundamentalAnalysis: string;
        technicalAnalysis: string;
    };
}

export interface PriceHistoryItem {
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

export interface OrderBookItem {
    time: string;
    volume: number;
    price: number;
    side: 'Mua' | 'Bán';
    change: number;
}

export interface HistoricalDataItem {
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    change: number;
    changePercent: number;
    volume: number;
}

export interface Shareholder {
    name: string;
    role: string;
    shares: string;
    percentage: number;
}

export interface PeerStock {
    ticker: string;
    price: number;
    priceChange: number;
    priceChangePercent: number;
    volume: number;
    sparklineData: number[];
}

export interface NewsArticle {
    id: string;
    title: string;
    time: string;
    ticker: string;
}

export interface RecommendedStock {
    ticker: string;
    exchange: string;
    companyName: string;
    logoUrl: string;
    price: number;
    priceChange: number;
    priceChangePercent: number;
    marketCap: string;
    volume: string;
    pe: string;
    chartData: number[];
    isFavorite?: boolean;
}

// ==================== STOCK INFO ====================

export const STOCK_INFO: StockInfo = {
    ticker: 'VIC',
    exchange: 'HOSE',
    companyName: 'Tập đoàn Vingroup - Công ty Cổ phần',
    companyNameFull: 'Tập đoàn Vingroup - Công ty Cổ phần (VIC) có tiền thân là Công ty Cổ phần Thương mại Tổng hợp Việt Nam được thành lập vào năm 2002. Tập đoàn hoạt động trong lĩnh vực bất động sản, du lịch nghỉ dưỡng - vui chơi giải trí, bán lẻ, công nghiệp và hạ tầng xã hội.',
    logoUrl: '/vic-logo.png',
    tags: ['Bất động sản', 'Quản lý và phát triển bất động sản'],
    website: 'https://www.vingroup.net',
    currentPrice: 165400,
    priceChange: 4300,
    priceChangePercent: 2.67,
    dayLow: 162500,
    dayHigh: 167700,
    referencePrice: 161100,
    ceilingPrice: 172300,
    floorPrice: 149900,
    metrics: {
        marketCap: '1,274,577T',
        marketCapRank: 3,
        volume: '3,317,300',
        pe: '143.69',
        peRank: 79,
        eps: '2,302',
        pb: '8.75',
        evEbitda: '19.47',
        outstandingShares: '7,706,031,000',
        roe: '37.817',
    },
    evaluation: {
        risk: 'Cao',
        valuation: 'Không hấp dẫn',
        fundamentalAnalysis: 'Không ổn định',
        technicalAnalysis: 'Không hấp dẫn',
    },
};

// ==================== PRICE HISTORY (30 days) ====================

const generatePriceHistory = (): PriceHistoryItem[] => {
    const data: PriceHistoryItem[] = [];
    const baseDate = new Date('2026-01-23');
    let lastClose = 45000;

    // Generate data showing uptrend from 45,000 to 165,400
    for (let i = 0; i < 240; i++) {
        const date = new Date(baseDate);
        date.setDate(baseDate.getDate() - (239 - i));

        // Simulate different phases: flat, volatile, then strong uptrend
        let change = 0;
        if (i < 60) {
            // Flat around 45,000-50,000
            change = (Math.random() - 0.5) * 2000;
        } else if (i < 150) {
            // Volatile around 80,000-120,000
            change = (Math.random() - 0.3) * 5000;
        } else {
            // Strong uptrend to 165,400
            change = (Math.random() - 0.2) * 4000;
        }

        const open = lastClose;
        const close = Math.max(40000, Math.round(open + change));
        const high = Math.round(Math.max(open, close) + Math.random() * 2000);
        const low = Math.round(Math.min(open, close) - Math.random() * 2000);
        const volume = Math.round(2000000 + Math.random() * 5000000);

        data.push({
            date: date.toISOString().split('T')[0],
            open,
            high,
            low,
            close,
            volume,
        });

        lastClose = close;
    }

    // Ensure last entry matches current price
    data[data.length - 1].close = 165400;
    data[data.length - 1].high = 167700;
    data[data.length - 1].low = 162500;

    return data;
};

export const PRICE_HISTORY: PriceHistoryItem[] = generatePriceHistory();

// ==================== ORDER BOOK (50 trades) ====================

const generateOrderBook = (): OrderBookItem[] => {
    const data: OrderBookItem[] = [];
    const baseTime = new Date('2026-01-23T14:47:19');

    // Based on screenshot exact data
    const exactData = [
        { time: '14:47:19', volume: 200, price: 165400, side: 'Mua' as const, change: 2.67 },
        { time: '14:46:48', volume: 198900, price: 165400, side: 'Mua' as const, change: 2.67 },
        { time: '14:29:59', volume: 300, price: 165200, side: 'Mua' as const, change: 2.55 },
        { time: '14:29:51', volume: 200, price: 165100, side: 'Bán' as const, change: 2.48 },
        { time: '14:29:46', volume: 11000, price: 165200, side: 'Mua' as const, change: 2.55 },
        { time: '14:29:43', volume: 1000, price: 165200, side: 'Mua' as const, change: 2.55 },
        { time: '14:29:42', volume: 500, price: 165200, side: 'Mua' as const, change: 2.55 },
        { time: '14:29:40', volume: 0, price: 165100, side: 'Mua' as const, change: 2.48 },
        { time: '14:29:36', volume: 0, price: 165100, side: 'Mua' as const, change: 2.48 },
        { time: '14:29:33', volume: 600, price: 165100, side: 'Mua' as const, change: 2.55 },
        { time: '14:29:29', volume: 600, price: 165200, side: 'Mua' as const, change: 2.55 },
        { time: '14:29:26', volume: 400, price: 165100, side: 'Mua' as const, change: 2.48 },
        { time: '14:29:18', volume: 500, price: 165100, side: 'Mua' as const, change: 2.48 },
        { time: '14:29:16', volume: 100, price: 165100, side: 'Bán' as const, change: 2.48 },
        { time: '14:29:14', volume: 1700, price: 165000, side: 'Bán' as const, change: 2.42 },
        { time: '14:29:10', volume: 100, price: 165100, side: 'Mua' as const, change: 2.48 },
    ];

    // Add more trades to fill 50
    for (let i = 0; i < 50; i++) {
        if (i < exactData.length) {
            data.push(exactData[i]);
        } else {
            const time = new Date(baseTime);
            time.setSeconds(baseTime.getSeconds() - i * 3);
            const side: 'Mua' | 'Bán' = Math.random() > 0.3 ? 'Mua' : 'Bán';
            const price = 165000 + Math.floor(Math.random() * 500);
            const volume = Math.floor(100 + Math.random() * 5000);
            const change = side === 'Mua' ? 2.48 + Math.random() * 0.2 : 2.42 + Math.random() * 0.1;

            data.push({
                time: time.toTimeString().slice(0, 8),
                volume,
                price: Math.round(price / 100) * 100,
                side,
                change: parseFloat(change.toFixed(2)),
            });
        }
    }

    return data;
};

export const ORDER_BOOK: OrderBookItem[] = generateOrderBook();

// ==================== HISTORICAL DATA (10 days) ====================

export const HISTORICAL_DATA: HistoricalDataItem[] = [
    { date: '23/01/2026', open: 163800, high: 167700, low: 162500, close: 165400, change: 4300, changePercent: 2.67, volume: 3317300 },
    { date: '22/01/2026', open: 157000, high: 161400, low: 157000, close: 161100, change: 600, changePercent: 0.37, volume: 3404000 },
    { date: '21/01/2026', open: 159000, high: 164200, low: 158900, close: 160500, change: -500, changePercent: -0.31, volume: 3238000 },
    { date: '20/01/2026', open: 162000, high: 162000, low: 154600, close: 161000, change: -1000, changePercent: -0.62, volume: 5147800 },
    { date: '19/01/2026', open: 164900, high: 164900, low: 159000, close: 162000, change: 2100, changePercent: 1.31, volume: 2282900 },
    { date: '16/01/2026', open: 153000, high: 163000, low: 153000, close: 159900, change: 6800, changePercent: 4.51, volume: 3824600 },
    { date: '15/01/2026', open: 160100, high: 160200, low: 150900, close: 153000, change: -7200, changePercent: -4.49, volume: 8278800 },
    { date: '14/01/2026', open: 171200, high: 171200, low: 159000, close: 160200, change: -7700, changePercent: -4.59, volume: 4416000 },
    { date: '13/01/2026', open: 159000, high: 173300, low: 158000, close: 167900, change: 4200, changePercent: 2.57, volume: 5382600 },
];

// ==================== SHAREHOLDERS ====================

export const SHAREHOLDERS: Shareholder[] = [
    { name: 'Phạm Nhật Vượng', role: 'Chủ tịch Hội đồng quản trị', shares: '0.09101', percentage: 0.09101 },
    { name: 'Phạm Thu Hương', role: 'Phó Chủ tịch Hội đồng quản trị', shares: '0.04427974', percentage: 0.04427974 },
    { name: 'Phạm Thúy Hằng', role: 'Phó Chủ tịch Hội đồng quản trị', shares: '0.00029994', percentage: 0.00029994 },
    { name: 'Phạm Văn Thương', role: 'Phó Tổng Giám đốc', shares: '0.0', percentage: 0 },
    { name: 'Nguyễn Diệu Linh', role: 'Phụ trách Công bố thông tin/Phó Chủ tịch Hội đồng Quả...', shares: '0.00024297', percentage: 0.00024297 },
    { name: 'Dương Thị Hoan', role: 'Phó Tổng Giám đốc', shares: '0.00017449', percentage: 0.00017449 },
    { name: 'Nguyễn Việt Quang', role: 'Tổng Giám đốc/Phó Chủ tịch Hội đồng quản trị', shares: '0.00017446', percentage: 0.00017446 },
    { name: 'Nguyễn Thế Anh', role: 'Trưởng Ban kiểm soát', shares: '0.00006253', percentage: 0.00006253 },
    { name: 'Nguyễn Thị Thu Hiền', role: 'Kế toán trưởng', shares: '0.00003898', percentage: 0.00003898 },
    { name: 'Mai Hương Nội', role: 'Phó Tổng Giám đốc Thường trực', shares: '0.00003893', percentage: 0.00003893 },
    { name: 'Nguyễn Hồng Mai', role: 'Thành viên Ban kiểm soát', shares: '0.0', percentage: 0 },
    { name: 'Đỗ Thị Hồng Vân', role: 'Thành viên Ban kiểm soát', shares: '0.0', percentage: 0 },
    { name: 'Bùi Thị Nguyệt', role: 'Người phụ trách quản trị công ty/Thành viên Ban Kiểm...', shares: '0.0', percentage: 0 },
    { name: 'Trần Thanh Mai', role: 'Trưởng Ban kiểm toán nội bộ', shares: '0.0', percentage: 0 },
    { name: 'Ahmed Adil', role: 'Thành viên Hội đồng quản trị độc lập', shares: '0.0', percentage: 0 },
    { name: 'Nguyễn Thị Lan Phương', role: 'Thành viên Ban kiểm toán nội bộ', shares: '0.0', percentage: 0 },
    { name: 'Ronaldo De-Liacco Ibasco', role: 'Thành viên Hội đồng quản trị độc lập', shares: '0.0', percentage: 0 },
    { name: 'Chin Michael Jaseuk', role: 'Thành viên Hội đồng quản trị độc lập', shares: '0.0', percentage: 0 },
    { name: 'Park Beom-sul', role: 'Thành viên...', shares: '0.0', percentage: 0 },
];

// Updated to 4 segments as per screenshot
export const SHAREHOLDER_STRUCTURE = {
    domestic: 97.67,
    foreign: 0.91,
    strategic: 2.31,
    individual: 2.33,
};

// ==================== PEER COMPARISON ====================

export const PEER_STOCKS: PeerStock[] = [
    { ticker: 'BAB', price: 13200, priceChange: -10, priceChangePercent: -0.01, volume: 100, sparklineData: [13.5, 13.4, 13.3, 13.2, 13.1, 13.2, 13.2] },
    { ticker: 'NVB', price: 13000, priceChange: -20, priceChangePercent: -0.02, volume: 1500, sparklineData: [13.2, 13.1, 13.0, 13.0, 13.1, 13.0, 13.0] },
    { ticker: 'BID', price: 50800, priceChange: -1200, priceChangePercent: -0.02, volume: 7000, sparklineData: [52, 51.5, 51, 50.5, 51, 50.8, 50.8] },
    { ticker: 'CTG', price: 39000, priceChange: -900, priceChangePercent: -0.02, volume: 7000, sparklineData: [40, 39.5, 39.2, 39, 39.1, 39, 39] },
    { ticker: 'EIB', price: 22550, priceChange: 150, priceChangePercent: 0.01, volume: 1000, sparklineData: [22, 22.2, 22.3, 22.4, 22.5, 22.55, 22.55] },
    { ticker: 'HDB', price: 29600, priceChange: 400, priceChangePercent: 0.01, volume: 8700, sparklineData: [29, 29.2, 29.3, 29.4, 29.5, 29.6, 29.6] },
];

// ==================== CORPORATE NEWS ====================

export const CORPORATE_NEWS: NewsArticle[] = [
    { id: '1', title: 'VIC: Nghị quyết HĐQT về việc giải thể công ty con - Công ty CP Đầu tư Y học công nghệ cao VinMedtech', time: '29 ngày trước', ticker: 'VIC' },
    { id: '2', title: 'VIC: Thông báo về việc giao dịch chứng khoán thay đổi đăng ký niêm yết', time: '1 tháng trước', ticker: 'VIC' },
    { id: '3', title: 'VIC: Báo cáo kết quả đợt phát hành cổ phiếu để tăng vốn cổ phần từ nguồn vốn chủ sở hữu và Thông báo thay đổi số lượng cổ phiếu có quyền biểu quyết đang lưu hành', time: '1 tháng trước', ticker: 'VIC' },
    { id: '4', title: 'VIC: Nghị quyết HĐQT số 47/2025 ngày 25/12/2025', time: '29 ngày trước', ticker: 'VIC' },
    { id: '5', title: 'VIC: Quyết định về việc thay đổi đăng ký niêm yết', time: '1 tháng trước', ticker: 'VIC' },
    { id: '6', title: 'VIC: Thông báo giao dịch cổ phiếu của Người nội bộ Phạm Nhật Vượng (điều chỉnh)', time: '1 tháng trước', ticker: 'VIC' },
    { id: '7', title: 'VIC: Giấy chứng nhận đăng ký doanh nghiệp thay đổi lần thứ 76', time: '1 tháng trước', ticker: 'VIC' },
    { id: '8', title: 'VIC: CBTT tăng vốn điều lệ sau khi kết thúc đợt phát hành cổ phiếu', time: '1 tháng trước', ticker: 'VIC' },
    { id: '9', title: 'VIC: Thông báo giao dịch cổ phiếu của tổ chức có liên quan của Người nội bộ CTCP Đầu tư và Phát triển Đường sắt Cao tốc Vinspeed (điều chỉnh)', time: '1 tháng trước', ticker: 'VIC' },
];

// ==================== RECOMMENDATIONS ====================

export const RECOMMENDATIONS: RecommendedStock[] = [
    {
        ticker: 'KDH',
        exchange: 'HOSE',
        companyName: 'Công ty Cổ phần Đầu tư và Kinh doanh Nhà Khang Điền',
        logoUrl: '/kdh-logo.png',
        price: 28900,
        priceChange: -400,
        priceChangePercent: -1.40,
        marketCap: '32,432T',
        volume: '2,905,800',
        pe: '33.96',
        chartData: [30, 29.8, 29.5, 29.2, 29, 28.9, 28.9],
    },
    {
        ticker: 'NVL',
        exchange: 'HOSE',
        companyName: 'Công ty Cổ phần Tập đoàn Đầu tư Địa ốc No Va',
        logoUrl: '/nvl-logo.png',
        price: 12500,
        priceChange: -300,
        priceChangePercent: -2.30,
        marketCap: '27,900T',
        volume: '7,998,800',
        pe: '-7.28',
        chartData: [13.5, 13.2, 12.9, 12.7, 12.5, 12.5, 12.5],
    },
    {
        ticker: 'PDR',
        exchange: 'HOSE',
        companyName: 'Công ty Cổ phần Phát triển Bất động sản Phát Đạt',
        logoUrl: '/pdr-logo.png',
        price: 17800,
        priceChange: -400,
        priceChangePercent: -2.20,
        marketCap: '17,761T',
        volume: '7,230,500',
        pe: '87.56',
        chartData: [19, 18.6, 18.2, 17.9, 17.8, 17.8, 17.8],
    },
    {
        ticker: 'VHM',
        exchange: 'HOSE',
        companyName: 'Công ty Cổ phần Vinhomes',
        logoUrl: '/vhm-logo.png',
        price: 122500,
        priceChange: 2000,
        priceChangePercent: 1.70,
        marketCap: '503,157T',
        volume: '7,272,000',
        pe: '18.96',
        chartData: [119, 120, 121, 121.5, 122, 122.5, 122.5],
        isFavorite: true,
    },
];

// ==================== NAVIGATION TABS ====================

export const NAVIGATION_TABS = [
    { id: 'overview', label: 'Tổng quan', active: true },
    { id: 'news', label: 'Tin tức & Sự kiện', active: false },
    { id: 'financials', label: 'Số liệu tài chính', active: false },
    { id: 'analysis', label: 'Dashboard TCDN', active: false },
    { id: 'compare', label: 'So sánh cổ phiếu', active: false },
    { id: 'profile', label: 'Hồ sơ doanh nghiệp', active: false },
];

// ==================== MULTI-TICKER DATA GENERATOR ====================

import { STOCK_LIST_DATA } from './stockListMockData';

export interface StockDetailBundle {
    stockInfo: StockInfo;
    priceHistory: PriceHistoryItem[];
    orderBook: OrderBookItem[];
    historicalData: HistoricalDataItem[];
    shareholders: Shareholder[];
    shareholderStructure: { domestic: number; foreign: number; strategic: number; individual: number };
    peerStocks: PeerStock[];
    corporateNews: NewsArticle[];
    recommendations: RecommendedStock[];
}

function generatePriceHistoryForTicker(ticker: string, currentPrice: number, change: number): PriceHistoryItem[] {
    const data: PriceHistoryItem[] = [];
    const baseDate = new Date('2026-01-23');
    const startPrice = currentPrice * 0.7;
    let lastClose = startPrice;

    for (let i = 0; i < 240; i++) {
        const date = new Date(baseDate);
        date.setDate(baseDate.getDate() - (239 - i));

        const progress = i / 239;
        const targetPrice = startPrice + (currentPrice - startPrice) * progress;
        const noise = (Math.random() - 0.5) * currentPrice * 0.03;
        const open = lastClose;
        const close = Math.max(startPrice * 0.8, Math.round(targetPrice + noise));
        const high = Math.round(Math.max(open, close) + Math.random() * currentPrice * 0.015);
        const low = Math.round(Math.min(open, close) - Math.random() * currentPrice * 0.015);
        const volume = Math.round(1000000 + Math.random() * 8000000);

        data.push({ date: date.toISOString().split('T')[0], open, high, low, close, volume });
        lastClose = close;
    }
    data[data.length - 1].close = currentPrice;
    return data;
}

function generateOrderBookForTicker(ticker: string, price: number): OrderBookItem[] {
    const data: OrderBookItem[] = [];
    const baseTime = new Date('2026-01-23T14:47:19');
    for (let i = 0; i < 50; i++) {
        const time = new Date(baseTime);
        time.setSeconds(baseTime.getSeconds() - i * 3);
        const side: 'Mua' | 'Bán' = Math.random() > 0.35 ? 'Mua' : 'Bán';
        const p = price + Math.round((Math.random() - 0.5) * price * 0.01 / 100) * 100;
        const vol = Math.floor(100 + Math.random() * 10000);
        const ch = parseFloat(((p - price * 0.97) / (price * 0.97) * 100).toFixed(2));
        data.push({ time: time.toTimeString().slice(0, 8), volume: vol, price: Math.round(p / 100) * 100, side, change: ch });
    }
    return data;
}

function generateHistoricalForTicker(ticker: string, price: number): HistoricalDataItem[] {
    const data: HistoricalDataItem[] = [];
    let p = price;
    for (let i = 0; i < 9; i++) {
        const d = new Date('2026-01-23');
        d.setDate(d.getDate() - i);
        const dayOfWeek = d.getDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) { d.setDate(d.getDate() - (dayOfWeek === 0 ? 2 : 1)); }
        const change = Math.round((Math.random() - 0.45) * price * 0.04);
        const open = p - change;
        const close = p;
        const high = Math.round(Math.max(open, close) + Math.random() * price * 0.01);
        const low = Math.round(Math.min(open, close) - Math.random() * price * 0.01);
        const vol = Math.round(1500000 + Math.random() * 6000000);
        const pct = parseFloat(((change / (p - change)) * 100).toFixed(2));
        data.push({ date: `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`, open: Math.round(open), high, low, close: Math.round(close), change, changePercent: pct, volume: vol });
        p = open;
    }
    return data;
}

const SECTOR_MAP: Record<string, string[]> = {
    'Ngân hàng': ['VCB', 'BID', 'CTG', 'TCB', 'MBB', 'ACB'],
    'Bất động sản': ['VIC', 'VHM', 'NVL', 'KDH'],
    'Công nghệ': ['FPT', 'CMG'],
    'Thép': ['HPG', 'HSG'],
    'Chứng khoán': ['SSI', 'VND'],
    'Dầu khí': ['GAS', 'PLX'],
    'Thực phẩm & Đồ uống': ['VNM', 'MSN', 'SAB'],
    'Bán lẻ': ['MWG', 'PNJ'],
    'Điện & Năng lượng': ['POW', 'REE'],
    'Hóa chất': ['DGC', 'DPM'],
    'Logistics': ['GMD'],
};

function getPeersForTicker(ticker: string): PeerStock[] {
    const listItem = STOCK_LIST_DATA.find(s => s.ticker === ticker);
    const sector = listItem?.sector || 'Ngân hàng';
    const sectorTickers = SECTOR_MAP[sector] || [];
    return sectorTickers
        .filter(t => t !== ticker)
        .slice(0, 6)
        .map(t => {
            const s = STOCK_LIST_DATA.find(x => x.ticker === t);
            if (!s) return { ticker: t, price: 50000, priceChange: 0, priceChangePercent: 0, volume: 1000000, sparklineData: [50, 50, 50, 50, 50, 50, 50] };
            return { ticker: t, price: s.currentPrice, priceChange: s.priceChange, priceChangePercent: s.priceChangePercent, volume: s.volume, sparklineData: s.sparkline.map(v => v / 1000) };
        });
}

export function getStockDetailData(ticker: string): StockDetailBundle {
    // For VIC, return the existing detailed data
    if (ticker === 'VIC') {
        return {
            stockInfo: STOCK_INFO,
            priceHistory: PRICE_HISTORY,
            orderBook: ORDER_BOOK,
            historicalData: HISTORICAL_DATA,
            shareholders: SHAREHOLDERS,
            shareholderStructure: SHAREHOLDER_STRUCTURE,
            peerStocks: PEER_STOCKS,
            corporateNews: CORPORATE_NEWS,
            recommendations: RECOMMENDATIONS,
        };
    }

    // For other tickers, generate from STOCK_LIST_DATA
    const listItem = STOCK_LIST_DATA.find(s => s.ticker === ticker);

    const stockInfo: StockInfo = {
        ticker: listItem?.ticker || ticker,
        exchange: listItem?.exchange || 'HOSE',
        companyName: listItem?.companyName || `Công ty ${ticker}`,
        companyNameFull: listItem?.companyName ? `${listItem.companyName} (${ticker}) là doanh nghiệp hàng đầu trong lĩnh vực ${listItem.sector} tại Việt Nam.` : `Công ty ${ticker}`,
        logoUrl: `/${ticker.toLowerCase()}-logo.png`,
        tags: [listItem?.sector || 'Chưa phân loại'],
        website: `https://www.${ticker.toLowerCase()}.com.vn`,
        currentPrice: listItem?.currentPrice || 50000,
        priceChange: listItem?.priceChange || 0,
        priceChangePercent: listItem?.priceChangePercent || 0,
        dayLow: Math.round((listItem?.currentPrice || 50000) * 0.98),
        dayHigh: Math.round((listItem?.currentPrice || 50000) * 1.02),
        referencePrice: Math.round((listItem?.currentPrice || 50000) - (listItem?.priceChange || 0)),
        ceilingPrice: Math.round(((listItem?.currentPrice || 50000) - (listItem?.priceChange || 0)) * 1.07),
        floorPrice: Math.round(((listItem?.currentPrice || 50000) - (listItem?.priceChange || 0)) * 0.93),
        metrics: {
            marketCap: listItem ? `${(listItem.marketCap).toLocaleString('vi-VN')}T` : '50,000T',
            marketCapRank: Math.floor(Math.random() * 50) + 1,
            volume: listItem ? listItem.volume.toLocaleString('vi-VN') : '1,000,000',
            pe: listItem?.pe ? listItem.pe.toFixed(2) : 'N/A',
            peRank: Math.floor(Math.random() * 100),
            eps: listItem?.eps.toLocaleString('vi-VN') || '0',
            pb: listItem ? listItem.pb.toFixed(2) : '1.00',
            evEbitda: (Math.random() * 20 + 5).toFixed(2),
            outstandingShares: listItem ? `${Math.round(listItem.marketCap * 1000000000 / listItem.currentPrice).toLocaleString('vi-VN')}` : '100,000,000',
            roe: listItem ? listItem.roe.toFixed(3) : '10.000',
        },
        evaluation: {
            risk: listItem && listItem.roe > 20 ? 'Thấp' : listItem && listItem.roe > 10 ? 'Trung bình' : 'Cao',
            valuation: listItem && listItem.pe && listItem.pe < 15 ? 'Hấp dẫn' : listItem && listItem.pe && listItem.pe < 25 ? 'Trung bình' : 'Không hấp dẫn',
            fundamentalAnalysis: listItem && listItem.roe > 15 ? 'Ổn định' : 'Không ổn định',
            technicalAnalysis: listItem?.signal === 'Mua' ? 'Hấp dẫn' : listItem?.signal === 'Bán' ? 'Không hấp dẫn' : 'Trung bình',
        },
    };

    const price = listItem?.currentPrice || 50000;

    return {
        stockInfo,
        priceHistory: generatePriceHistoryForTicker(ticker, price, listItem?.priceChange || 0),
        orderBook: generateOrderBookForTicker(ticker, price),
        historicalData: generateHistoricalForTicker(ticker, price),
        shareholders: [
            { name: 'Cổ đông lớn 1', role: 'Chủ tịch HĐQT', shares: '0.15', percentage: 15 },
            { name: 'Cổ đông lớn 2', role: 'Thành viên HĐQT', shares: '0.08', percentage: 8 },
            { name: 'Cổ đông lớn 3', role: 'Phó TGĐ', shares: '0.05', percentage: 5 },
            { name: 'Tổ chức nước ngoài', role: 'Cổ đông tổ chức', shares: '0.12', percentage: 12 },
            { name: 'Cổ đông nhỏ lẻ', role: 'Cá nhân', shares: '0.60', percentage: 60 },
        ],
        shareholderStructure: { domestic: 85, foreign: 8, strategic: 5, individual: 2 },
        peerStocks: getPeersForTicker(ticker),
        corporateNews: Array.from({ length: 6 }, (_, i) => ({
            id: String(i + 1),
            title: `${ticker}: Thông báo quan trọng số ${i + 1} của doanh nghiệp`,
            time: `${i + 1} tuần trước`,
            ticker,
        })),
        recommendations: RECOMMENDATIONS.filter(r => r.ticker !== ticker).slice(0, 4),
    };
}
