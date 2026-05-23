// ==================== FINANCIAL REPORT MOCK DATA ====================
// Dữ liệu báo cáo tài chính giả lập cho 6 kỳ (5 kỳ trước + hiện tại)
// Các con số tính bằng tỷ VND

export interface FinancialPeriod {
    period: string;     // e.g. "Q4/2025", "Q3/2025"
    year: number;
    quarter: number;
}

// ========== KẾT QUẢ KINH DOANH (Income Statement) ==========
export interface IncomeStatementItem {
    period: FinancialPeriod;
    revenue: number;                    // Doanh thu thuần
    costOfGoodsSold: number;           // Giá vốn hàng bán
    grossProfit: number;               // Lợi nhuận gộp
    sellingExpenses: number;           // Chi phí bán hàng
    adminExpenses: number;             // Chi phí quản lý doanh nghiệp
    operatingProfit: number;           // Lợi nhuận từ HĐKD
    financialIncome: number;           // Doanh thu tài chính
    financialExpenses: number;         // Chi phí tài chính
    interestExpenses: number;          // Chi phí lãi vay
    profitBeforeTax: number;           // Lợi nhuận trước thuế
    incomeTax: number;                 // Chi phí thuế TNDN
    netProfit: number;                 // Lợi nhuận sau thuế
    netProfitParent: number;           // LNST của cổ đông công ty mẹ
    eps: number;                       // EPS (VND)
}

// ========== CÂN ĐỐI KẾ TOÁN (Balance Sheet) ==========
export interface BalanceSheetItem {
    period: FinancialPeriod;
    // Tài sản
    totalAssets: number;               // Tổng tài sản
    currentAssets: number;             // Tài sản ngắn hạn
    cash: number;                      // Tiền & tương đương tiền
    shortTermInvestments: number;      // Đầu tư tài chính ngắn hạn
    shortTermReceivables: number;      // Phải thu ngắn hạn
    inventory: number;                 // Hàng tồn kho
    nonCurrentAssets: number;          // Tài sản dài hạn
    fixedAssets: number;               // Tài sản cố định
    longTermInvestments: number;       // Đầu tư tài chính dài hạn
    // Nguồn vốn
    totalLiabilities: number;          // Tổng nợ phải trả
    currentLiabilities: number;        // Nợ ngắn hạn
    longTermLiabilities: number;       // Nợ dài hạn
    totalEquity: number;               // Vốn chủ sở hữu
    charterCapital: number;            // Vốn điều lệ
    retainedEarnings: number;          // Lợi nhuận chưa phân phối
    totalLiabilitiesAndEquity: number; // Tổng nguồn vốn
}

// ========== LƯU CHUYỂN TIỀN TỆ (Cash Flow Statement) ==========
export interface CashFlowItem {
    period: FinancialPeriod;
    // Lưu chuyển tiền từ HĐKD
    operatingCashFlow: number;                 // Lưu chuyển tiền thuần từ HĐKD
    profitBeforeTax: number;                   // Lợi nhuận trước thuế
    depreciationAmortization: number;          // Khấu hao tài sản cố định
    provisionsAndReserves: number;             // Dự phòng
    workingCapitalChanges: number;             // Thay đổi vốn lưu động
    interestPaid: number;                      // Tiền lãi đã trả
    incomeTaxPaid: number;                     // Thuế TNDN đã nộp
    // Lưu chuyển tiền từ HĐĐT
    investingCashFlow: number;                 // Lưu chuyển tiền thuần từ HĐĐT
    purchaseOfFixedAssets: number;             // Mua sắm tài sản cố định
    proceedsFromDisposal: number;             // Thu thanh lý tài sản
    investmentInSubsidiaries: number;          // Đầu tư vào công ty con
    // Lưu chuyển tiền từ HĐTC
    financingCashFlow: number;                 // Lưu chuyển tiền thuần từ HĐTC
    proceedsFromBorrowing: number;             // Tiền thu từ đi vay
    repaymentOfBorrowing: number;              // Tiền trả nợ vay
    dividendsPaid: number;                     // Cổ tức đã trả
    proceedsFromEquity: number;                // Tiền thu phát hành cổ phiếu
    // Tổng hợp
    netCashChange: number;                     // Tăng/giảm tiền thuần
    beginningCash: number;                     // Tiền đầu kỳ
    endingCash: number;                        // Tiền cuối kỳ
}

export interface FinancialReportBundle {
    incomeStatements: IncomeStatementItem[];
    balanceSheets: BalanceSheetItem[];
    cashFlows: CashFlowItem[];
}

// ==================== VIC DATA - 6 QUARTERS ====================

const PERIODS: FinancialPeriod[] = [
    { period: 'Q4/2025', year: 2025, quarter: 4 },
    { period: 'Q3/2025', year: 2025, quarter: 3 },
    { period: 'Q2/2025', year: 2025, quarter: 2 },
    { period: 'Q1/2025', year: 2025, quarter: 1 },
    { period: 'Q4/2024', year: 2024, quarter: 4 },
    { period: 'Q3/2024', year: 2024, quarter: 3 },
];

// Kết quả kinh doanh VIC
const VIC_INCOME_STATEMENTS: IncomeStatementItem[] = [
    {
        period: PERIODS[0],
        revenue: 42850, costOfGoodsSold: 31200, grossProfit: 11650,
        sellingExpenses: 2380, adminExpenses: 1890, operatingProfit: 7380,
        financialIncome: 1250, financialExpenses: 3420, interestExpenses: 2980,
        profitBeforeTax: 5210, incomeTax: 1042, netProfit: 4168,
        netProfitParent: 3850, eps: 500,
    },
    {
        period: PERIODS[1],
        revenue: 38720, costOfGoodsSold: 28430, grossProfit: 10290,
        sellingExpenses: 2150, adminExpenses: 1750, operatingProfit: 6390,
        financialIncome: 980, financialExpenses: 3180, interestExpenses: 2780,
        profitBeforeTax: 4190, incomeTax: 838, netProfit: 3352,
        netProfitParent: 3100, eps: 402,
    },
    {
        period: PERIODS[2],
        revenue: 35600, costOfGoodsSold: 26100, grossProfit: 9500,
        sellingExpenses: 1980, adminExpenses: 1620, operatingProfit: 5900,
        financialIncome: 1100, financialExpenses: 2950, interestExpenses: 2580,
        profitBeforeTax: 4050, incomeTax: 810, netProfit: 3240,
        netProfitParent: 2950, eps: 383,
    },
    {
        period: PERIODS[3],
        revenue: 28900, costOfGoodsSold: 21800, grossProfit: 7100,
        sellingExpenses: 1650, adminExpenses: 1420, operatingProfit: 4030,
        financialIncome: 870, financialExpenses: 2800, interestExpenses: 2450,
        profitBeforeTax: 2100, incomeTax: 420, netProfit: 1680,
        netProfitParent: 1520, eps: 197,
    },
    {
        period: PERIODS[4],
        revenue: 40200, costOfGoodsSold: 29500, grossProfit: 10700,
        sellingExpenses: 2280, adminExpenses: 1820, operatingProfit: 6600,
        financialIncome: 1150, financialExpenses: 3350, interestExpenses: 2900,
        profitBeforeTax: 4400, incomeTax: 880, netProfit: 3520,
        netProfitParent: 3250, eps: 422,
    },
    {
        period: PERIODS[5],
        revenue: 36100, costOfGoodsSold: 26800, grossProfit: 9300,
        sellingExpenses: 2050, adminExpenses: 1680, operatingProfit: 5570,
        financialIncome: 920, financialExpenses: 3050, interestExpenses: 2650,
        profitBeforeTax: 3440, incomeTax: 688, netProfit: 2752,
        netProfitParent: 2530, eps: 328,
    },
];

// Cân đối kế toán VIC
const VIC_BALANCE_SHEETS: BalanceSheetItem[] = [
    {
        period: PERIODS[0],
        totalAssets: 485200, currentAssets: 142800, cash: 28500, shortTermInvestments: 15200,
        shortTermReceivables: 48600, inventory: 42300, nonCurrentAssets: 342400,
        fixedAssets: 125800, longTermInvestments: 98500,
        totalLiabilities: 338600, currentLiabilities: 128500, longTermLiabilities: 210100,
        totalEquity: 146600, charterCapital: 77060, retainedEarnings: 32500,
        totalLiabilitiesAndEquity: 485200,
    },
    {
        period: PERIODS[1],
        totalAssets: 472500, currentAssets: 138200, cash: 25800, shortTermInvestments: 14500,
        shortTermReceivables: 46200, inventory: 43800, nonCurrentAssets: 334300,
        fixedAssets: 123500, longTermInvestments: 96200,
        totalLiabilities: 332800, currentLiabilities: 125300, longTermLiabilities: 207500,
        totalEquity: 139700, charterCapital: 77060, retainedEarnings: 28600,
        totalLiabilitiesAndEquity: 472500,
    },
    {
        period: PERIODS[2],
        totalAssets: 458900, currentAssets: 135600, cash: 22300, shortTermInvestments: 13800,
        shortTermReceivables: 45800, inventory: 45200, nonCurrentAssets: 323300,
        fixedAssets: 120200, longTermInvestments: 93500,
        totalLiabilities: 326500, currentLiabilities: 122800, longTermLiabilities: 203700,
        totalEquity: 132400, charterCapital: 70060, retainedEarnings: 25300,
        totalLiabilitiesAndEquity: 458900,
    },
    {
        period: PERIODS[3],
        totalAssets: 445200, currentAssets: 128900, cash: 19800, shortTermInvestments: 12500,
        shortTermReceivables: 44200, inventory: 44500, nonCurrentAssets: 316300,
        fixedAssets: 118500, longTermInvestments: 91800,
        totalLiabilities: 320100, currentLiabilities: 120500, longTermLiabilities: 199600,
        totalEquity: 125100, charterCapital: 70060, retainedEarnings: 21200,
        totalLiabilitiesAndEquity: 445200,
    },
    {
        period: PERIODS[4],
        totalAssets: 462800, currentAssets: 140200, cash: 26200, shortTermInvestments: 14800,
        shortTermReceivables: 47500, inventory: 43200, nonCurrentAssets: 322600,
        fixedAssets: 121800, longTermInvestments: 94500,
        totalLiabilities: 328500, currentLiabilities: 124200, longTermLiabilities: 204300,
        totalEquity: 134300, charterCapital: 70060, retainedEarnings: 27500,
        totalLiabilitiesAndEquity: 462800,
    },
    {
        period: PERIODS[5],
        totalAssets: 448500, currentAssets: 132800, cash: 21500, shortTermInvestments: 13200,
        shortTermReceivables: 44800, inventory: 45300, nonCurrentAssets: 315700,
        fixedAssets: 119200, longTermInvestments: 92300,
        totalLiabilities: 322800, currentLiabilities: 121500, longTermLiabilities: 201300,
        totalEquity: 125700, charterCapital: 70060, retainedEarnings: 22800,
        totalLiabilitiesAndEquity: 448500,
    },
];

// Lưu chuyển tiền tệ VIC
const VIC_CASH_FLOWS: CashFlowItem[] = [
    {
        period: PERIODS[0],
        operatingCashFlow: 8520, profitBeforeTax: 5210, depreciationAmortization: 4850,
        provisionsAndReserves: 680, workingCapitalChanges: -1250, interestPaid: -2980, incomeTaxPaid: -990,
        investingCashFlow: -6850, purchaseOfFixedAssets: -4200, proceedsFromDisposal: 350,
        investmentInSubsidiaries: -3000,
        financingCashFlow: 1030, proceedsFromBorrowing: 18500, repaymentOfBorrowing: -15200,
        dividendsPaid: -2270, proceedsFromEquity: 0,
        netCashChange: 2700, beginningCash: 25800, endingCash: 28500,
    },
    {
        period: PERIODS[1],
        operatingCashFlow: 7280, profitBeforeTax: 4190, depreciationAmortization: 4620,
        provisionsAndReserves: 520, workingCapitalChanges: -980, interestPaid: -2780, incomeTaxPaid: -790,
        investingCashFlow: -5800, purchaseOfFixedAssets: -3800, proceedsFromDisposal: 280,
        investmentInSubsidiaries: -2280,
        financingCashFlow: 2020, proceedsFromBorrowing: 16800, repaymentOfBorrowing: -13500,
        dividendsPaid: -1280, proceedsFromEquity: 0,
        netCashChange: 3500, beginningCash: 22300, endingCash: 25800,
    },
    {
        period: PERIODS[2],
        operatingCashFlow: 6450, profitBeforeTax: 4050, depreciationAmortization: 4380,
        provisionsAndReserves: 450, workingCapitalChanges: -1520, interestPaid: -2580, incomeTaxPaid: -730,
        investingCashFlow: -5200, purchaseOfFixedAssets: -3500, proceedsFromDisposal: 220,
        investmentInSubsidiaries: -1920,
        financingCashFlow: 1250, proceedsFromBorrowing: 15200, repaymentOfBorrowing: -12800,
        dividendsPaid: -1150, proceedsFromEquity: 0,
        netCashChange: 2500, beginningCash: 19800, endingCash: 22300,
    },
    {
        period: PERIODS[3],
        operatingCashFlow: 4200, profitBeforeTax: 2100, depreciationAmortization: 4150,
        provisionsAndReserves: 380, workingCapitalChanges: -1580, interestPaid: -2450, incomeTaxPaid: -400,
        investingCashFlow: -4800, purchaseOfFixedAssets: -3200, proceedsFromDisposal: 180,
        investmentInSubsidiaries: -1780,
        financingCashFlow: -1000, proceedsFromBorrowing: 12500, repaymentOfBorrowing: -12200,
        dividendsPaid: -1300, proceedsFromEquity: 0,
        netCashChange: -1600, beginningCash: 21400, endingCash: 19800,
    },
    {
        period: PERIODS[4],
        operatingCashFlow: 8150, profitBeforeTax: 4400, depreciationAmortization: 4780,
        provisionsAndReserves: 620, workingCapitalChanges: -850, interestPaid: -2900, incomeTaxPaid: -900,
        investingCashFlow: -6200, purchaseOfFixedAssets: -4000, proceedsFromDisposal: 320,
        investmentInSubsidiaries: -2520,
        financingCashFlow: 2750, proceedsFromBorrowing: 17800, repaymentOfBorrowing: -13200,
        dividendsPaid: -1850, proceedsFromEquity: 0,
        netCashChange: 4700, beginningCash: 21500, endingCash: 26200,
    },
    {
        period: PERIODS[5],
        operatingCashFlow: 5980, profitBeforeTax: 3440, depreciationAmortization: 4280,
        provisionsAndReserves: 480, workingCapitalChanges: -1320, interestPaid: -2650, incomeTaxPaid: -650,
        investingCashFlow: -5500, purchaseOfFixedAssets: -3600, proceedsFromDisposal: 250,
        investmentInSubsidiaries: -2150,
        financingCashFlow: 920, proceedsFromBorrowing: 14500, repaymentOfBorrowing: -12300,
        dividendsPaid: -1280, proceedsFromEquity: 0,
        netCashChange: 1400, beginningCash: 20100, endingCash: 21500,
    },
];

// ==================== DATA GENERATOR FOR OTHER TICKERS ====================

function generatePeriodsForTicker(): FinancialPeriod[] {
    return [...PERIODS];
}

function generateIncomeStatements(ticker: string, baseRevenue: number): IncomeStatementItem[] {
    const periods = generatePeriodsForTicker();
    const items: IncomeStatementItem[] = [];

    for (let i = 0; i < periods.length; i++) {
        const seasonalFactor = periods[i].quarter === 4 ? 1.15 : periods[i].quarter === 1 ? 0.85 : 1.0;
        const growthFactor = 1 - i * 0.04; // Older quarters have less revenue
        const revenue = Math.round(baseRevenue * seasonalFactor * growthFactor * (0.95 + Math.random() * 0.1));
        const cogs = Math.round(revenue * (0.68 + Math.random() * 0.08));
        const grossProfit = revenue - cogs;
        const selling = Math.round(revenue * (0.04 + Math.random() * 0.02));
        const admin = Math.round(revenue * (0.03 + Math.random() * 0.02));
        const operating = grossProfit - selling - admin;
        const finIncome = Math.round(revenue * (0.02 + Math.random() * 0.01));
        const finExpense = Math.round(revenue * (0.05 + Math.random() * 0.03));
        const interest = Math.round(finExpense * 0.85);
        const pbt = operating + finIncome - finExpense;
        const tax = Math.round(pbt * 0.2);
        const netP = pbt - tax;
        const netPParent = Math.round(netP * 0.92);

        items.push({
            period: periods[i], revenue, costOfGoodsSold: cogs, grossProfit,
            sellingExpenses: selling, adminExpenses: admin, operatingProfit: operating,
            financialIncome: finIncome, financialExpenses: finExpense, interestExpenses: interest,
            profitBeforeTax: pbt, incomeTax: tax, netProfit: netP,
            netProfitParent: netPParent, eps: Math.round(netPParent / 10),
        });
    }
    return items;
}

function generateBalanceSheets(ticker: string, baseAssets: number): BalanceSheetItem[] {
    const periods = generatePeriodsForTicker();
    const items: BalanceSheetItem[] = [];

    for (let i = 0; i < periods.length; i++) {
        const growthFactor = 1 - i * 0.03;
        const totalAssets = Math.round(baseAssets * growthFactor * (0.97 + Math.random() * 0.06));
        const currentAssets = Math.round(totalAssets * (0.28 + Math.random() * 0.08));
        const cash = Math.round(currentAssets * (0.15 + Math.random() * 0.1));
        const shortInv = Math.round(currentAssets * (0.08 + Math.random() * 0.05));
        const receivables = Math.round(currentAssets * (0.3 + Math.random() * 0.1));
        const inventory = Math.round(currentAssets * (0.25 + Math.random() * 0.1));
        const nonCurrent = totalAssets - currentAssets;
        const fixed = Math.round(nonCurrent * (0.35 + Math.random() * 0.1));
        const longInv = Math.round(nonCurrent * (0.25 + Math.random() * 0.1));
        const totalLiab = Math.round(totalAssets * (0.6 + Math.random() * 0.1));
        const currentLiab = Math.round(totalLiab * (0.35 + Math.random() * 0.1));
        const longLiab = totalLiab - currentLiab;
        const equity = totalAssets - totalLiab;
        const charter = Math.round(equity * 0.55);
        const retained = Math.round(equity * (0.15 + Math.random() * 0.1));

        items.push({
            period: periods[i], totalAssets, currentAssets, cash, shortTermInvestments: shortInv,
            shortTermReceivables: receivables, inventory, nonCurrentAssets: nonCurrent,
            fixedAssets: fixed, longTermInvestments: longInv,
            totalLiabilities: totalLiab, currentLiabilities: currentLiab, longTermLiabilities: longLiab,
            totalEquity: equity, charterCapital: charter, retainedEarnings: retained,
            totalLiabilitiesAndEquity: totalAssets,
        });
    }
    return items;
}

function generateCashFlows(ticker: string, incomeStatements: IncomeStatementItem[], balanceSheets: BalanceSheetItem[]): CashFlowItem[] {
    const periods = generatePeriodsForTicker();
    const items: CashFlowItem[] = [];

    for (let i = 0; i < periods.length; i++) {
        const pbt = incomeStatements[i].profitBeforeTax;
        const depr = Math.round(pbt * (0.6 + Math.random() * 0.4));
        const provisions = Math.round(pbt * (0.08 + Math.random() * 0.06));
        const wcChanges = -Math.round(pbt * (0.15 + Math.random() * 0.15));
        const intPaid = -incomeStatements[i].interestExpenses;
        const taxPaid = -Math.round(incomeStatements[i].incomeTax * 0.95);
        const operatingCF = pbt + depr + provisions + wcChanges + intPaid - taxPaid;

        const purchaseFA = -Math.round(Math.abs(pbt) * (0.5 + Math.random() * 0.3));
        const proceeds = Math.round(Math.abs(purchaseFA) * (0.05 + Math.random() * 0.05));
        const invSub = -Math.round(Math.abs(pbt) * (0.3 + Math.random() * 0.2));
        const investingCF = purchaseFA + proceeds + invSub;

        const borrow = Math.round(Math.abs(pbt) * (2.5 + Math.random() * 1.5));
        const repay = -Math.round(borrow * (0.75 + Math.random() * 0.15));
        const div = -Math.round(Math.abs(incomeStatements[i].netProfit) * (0.25 + Math.random() * 0.15));
        const equityProceeds = 0;
        const financingCF = borrow + repay + div + equityProceeds;

        const netChange = operatingCF + investingCF + financingCF;
        const endCash = balanceSheets[i].cash;
        const beginCash = endCash - netChange;

        items.push({
            period: periods[i],
            operatingCashFlow: operatingCF, profitBeforeTax: pbt, depreciationAmortization: depr,
            provisionsAndReserves: provisions, workingCapitalChanges: wcChanges,
            interestPaid: intPaid, incomeTaxPaid: taxPaid,
            investingCashFlow: investingCF, purchaseOfFixedAssets: purchaseFA,
            proceedsFromDisposal: proceeds, investmentInSubsidiaries: invSub,
            financingCashFlow: financingCF, proceedsFromBorrowing: borrow,
            repaymentOfBorrowing: repay, dividendsPaid: div, proceedsFromEquity: equityProceeds,
            netCashChange: netChange, beginningCash: beginCash, endingCash: endCash,
        });
    }
    return items;
}

// ==================== MAIN EXPORT ====================

export function getFinancialReportData(ticker: string): FinancialReportBundle {
    if (ticker === 'VIC') {
        return {
            incomeStatements: VIC_INCOME_STATEMENTS,
            balanceSheets: VIC_BALANCE_SHEETS,
            cashFlows: VIC_CASH_FLOWS,
        };
    }

    // Generate deterministic-ish data for other tickers
    const seed = ticker.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    const baseRevenue = 5000 + (seed % 40) * 1000;  // 5,000 - 45,000 tỷ
    const baseAssets = baseRevenue * (3 + (seed % 5));  // 3x-8x revenue

    const incomeStatements = generateIncomeStatements(ticker, baseRevenue);
    const balanceSheets = generateBalanceSheets(ticker, baseAssets);
    const cashFlows = generateCashFlows(ticker, incomeStatements, balanceSheets);

    return { incomeStatements, balanceSheets, cashFlows };
}
