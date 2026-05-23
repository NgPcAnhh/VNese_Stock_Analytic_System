// ==================== TYPES ====================

export interface CompanyOverview {
    ticker: string;
    companyName: string;
    companyNameEn: string;
    taxCode: string;
    industry: string;
    subIndustry: string;
    foundedDate: string;
    listingDate: string;
    exchange: string;
    charterCapital: string;       // Vốn điều lệ
    outstandingShares: string;     // CP lưu hành
    listedShares: string;          // CP niêm yết
    treasuryShares: string;        // CP quỹ
    parValue: number;              // Mệnh giá (VND)
    foreignOwnershipLimit: number; // Room ngoại (%)
    foreignOwnership: number;      // Sở hữu nước ngoài hiện tại (%)
    description: string;
    website: string;
    phone: string;
    fax: string;
    email: string;
    headOffice: string;
    auditor: string;               // Công ty kiểm toán
    employees: number;
    branches: number;
}

export interface BoardMember {
    name: string;
    position: string;
    positionEn: string;
    gender: "Nam" | "Nữ";
    yearOfBirth: number;
    education: string;
    startDate: string;
    sharesOwned: string;
    sharesPercent: number;
    type: "board" | "executive" | "supervisor"; // HĐQT, Ban điều hành, Ban kiểm soát
}

export interface Subsidiary {
    name: string;
    taxCode: string;
    charterCapital: string;
    ownershipPercent: number;
    industry: string;
    type: "con" | "liên kết"; // Công ty con vs Liên kết
}

export interface Milestone {
    year: number;
    quarter?: string;
    event: string;
    category: "foundation" | "listing" | "expansion" | "dividend" | "award" | "restructuring";
}

export interface DividendHistory {
    year: number;
    type: string;          // "Tiền mặt" | "Cổ phiếu" | "Cả hai"
    cashPerShare: number;  // VND/CP
    stockRatio: string;    // e.g. "10:1" hoặc "-"
    exDate: string;
    paymentDate: string;
}

export interface CompanyProfileBundle {
    overview: CompanyOverview;
    boardMembers: BoardMember[];
    subsidiaries: Subsidiary[];
    milestones: Milestone[];
    dividendHistory: DividendHistory[];
}

// ==================== VIC DATA ====================

const VIC_OVERVIEW: CompanyOverview = {
    ticker: "VIC",
    companyName: "Tập đoàn Vingroup - Công ty Cổ phần",
    companyNameEn: "Vingroup Joint Stock Company",
    taxCode: "0101245486",
    industry: "Bất động sản",
    subIndustry: "Quản lý và phát triển bất động sản",
    foundedDate: "08/08/1993",
    listingDate: "19/09/2007",
    exchange: "HOSE",
    charterCapital: "34,523 tỷ VND",
    outstandingShares: "3,452,328,107",
    listedShares: "3,452,328,107",
    treasuryShares: "0",
    parValue: 10000,
    foreignOwnershipLimit: 49,
    foreignOwnership: 22.5,
    description:
        "Vingroup là tập đoàn kinh tế tư nhân đa ngành lớn nhất Việt Nam, hoạt động trong các lĩnh vực: Công nghệ & Công nghiệp (VinFast, VinAI, VinBigData, VinBrain), Thương mại Dịch vụ (Vincom Retail, VinWonder, Vinpearl), Thiện nguyện Xã hội (VinUni, VinMec, VinSchool) và Bất động sản (Vinhomes). Được thành lập năm 1993 tại Ukraine, Vingroup đã phát triển trở thành một trong những doanh nghiệp có giá trị vốn hóa lớn nhất trên thị trường chứng khoán Việt Nam.",
    website: "https://www.vingroup.net",
    phone: "(028) 3622 8888",
    fax: "(028) 3827 2188",
    email: "info@vingroup.net",
    headOffice:
        "Tầng 7, Tòa nhà Landmark 81, Vinhomes Central Park, 720A Điện Biên Phủ, Phường 22, Quận Bình Thạnh, TP. Hồ Chí Minh",
    auditor: "Ernst & Young Việt Nam",
    employees: 52000,
    branches: 68,
};

const VIC_BOARD: BoardMember[] = [
    {
        name: "Phạm Nhật Vượng",
        position: "Chủ tịch HĐQT",
        positionEn: "Chairman of the Board",
        gender: "Nam",
        yearOfBirth: 1968,
        education: "Thạc sĩ Kinh tế - ĐH Mỏ Moscow",
        startDate: "08/2002",
        sharesOwned: "905,125,207",
        sharesPercent: 26.21,
        type: "board",
    },
    {
        name: "Phạm Thu Hương",
        position: "Phó Chủ tịch HĐQT",
        positionEn: "Vice Chairwoman",
        gender: "Nữ",
        yearOfBirth: 1969,
        education: "Cử nhân Kinh tế",
        startDate: "06/2015",
        sharesOwned: "310,235,000",
        sharesPercent: 8.98,
        type: "board",
    },
    {
        name: "Nguyễn Việt Quang",
        position: "Thành viên HĐQT kiêm TGĐ",
        positionEn: "Board Member & CEO",
        gender: "Nam",
        yearOfBirth: 1975,
        education: "Thạc sĩ Quản trị Kinh doanh - ĐH Harvard",
        startDate: "04/2018",
        sharesOwned: "15,000,000",
        sharesPercent: 0.43,
        type: "board",
    },
    {
        name: "Lê Khắc Hiệp",
        position: "Phó Chủ tịch HĐQT",
        positionEn: "Vice Chairman",
        gender: "Nam",
        yearOfBirth: 1958,
        education: "Phó Giáo sư, Tiến sĩ",
        startDate: "06/2012",
        sharesOwned: "5,200,000",
        sharesPercent: 0.15,
        type: "board",
    },
    {
        name: "Nguyễn Diệu Linh",
        position: "Thành viên HĐQT",
        positionEn: "Board Member",
        gender: "Nữ",
        yearOfBirth: 1980,
        education: "Tiến sĩ Tài chính - ĐH Melbourne",
        startDate: "05/2020",
        sharesOwned: "2,500,000",
        sharesPercent: 0.07,
        type: "board",
    },
    {
        name: "Trần Đức Minh",
        position: "Phó TGĐ Tài chính (CFO)",
        positionEn: "Deputy CEO & CFO",
        gender: "Nam",
        yearOfBirth: 1978,
        education: "Thạc sĩ Tài chính - ĐH London",
        startDate: "01/2016",
        sharesOwned: "3,100,000",
        sharesPercent: 0.09,
        type: "executive",
    },
    {
        name: "Nguyễn Hồng Sơn",
        position: "Phó TGĐ Đầu tư",
        positionEn: "Deputy CEO - Investment",
        gender: "Nam",
        yearOfBirth: 1980,
        education: "Thạc sĩ Kinh tế - ĐH Ngoại thương",
        startDate: "03/2019",
        sharesOwned: "1,800,000",
        sharesPercent: 0.05,
        type: "executive",
    },
    {
        name: "Phạm Thị Thanh Hoa",
        position: "Phó TGĐ Pháp chế",
        positionEn: "Deputy CEO - Legal",
        gender: "Nữ",
        yearOfBirth: 1982,
        education: "Thạc sĩ Luật - ĐH Luật Hà Nội",
        startDate: "06/2020",
        sharesOwned: "950,000",
        sharesPercent: 0.03,
        type: "executive",
    },
    {
        name: "Hoàng Văn Đức",
        position: "Trưởng Ban Kiểm soát",
        positionEn: "Head of Supervisory Board",
        gender: "Nam",
        yearOfBirth: 1972,
        education: "Tiến sĩ Kế toán - Học viện Tài chính",
        startDate: "04/2017",
        sharesOwned: "500,000",
        sharesPercent: 0.01,
        type: "supervisor",
    },
    {
        name: "Lê Thị Minh Ngọc",
        position: "Thành viên Ban Kiểm soát",
        positionEn: "Member of Supervisory Board",
        gender: "Nữ",
        yearOfBirth: 1985,
        education: "Cử nhân Kế toán - Kiểm toán",
        startDate: "04/2021",
        sharesOwned: "200,000",
        sharesPercent: 0.006,
        type: "supervisor",
    },
];

const VIC_SUBSIDIARIES: Subsidiary[] = [
    { name: "CTCP Vinhomes", taxCode: "0107743825", charterCapital: "43,544 tỷ", ownershipPercent: 69.7, industry: "Bất động sản nhà ở", type: "con" },
    { name: "CTCP Vincom Retail", taxCode: "0107744583", charterCapital: "19,345 tỷ", ownershipPercent: 60.2, industry: "BĐS thương mại", type: "con" },
    { name: "CTCP VinFast", taxCode: "0108926276", charterCapital: "55,200 tỷ", ownershipPercent: 51.0, industry: "Sản xuất ô tô", type: "con" },
    { name: "CTCP Vinpearl", taxCode: "4200431798", charterCapital: "12,800 tỷ", ownershipPercent: 100.0, industry: "Du lịch, khách sạn", type: "con" },
    { name: "CTCP VinAI", taxCode: "0109123456", charterCapital: "2,500 tỷ", ownershipPercent: 100.0, industry: "Trí tuệ nhân tạo", type: "con" },
    { name: "CTCP VinBus", taxCode: "0109234567", charterCapital: "1,800 tỷ", ownershipPercent: 100.0, industry: "Vận tải hành khách", type: "con" },
    { name: "Công ty TNHH VinSchool", taxCode: "0108765432", charterCapital: "3,200 tỷ", ownershipPercent: 100.0, industry: "Giáo dục", type: "con" },
    { name: "CTCP Bệnh viện VinMec", taxCode: "0108642135", charterCapital: "5,100 tỷ", ownershipPercent: 100.0, industry: "Y tế", type: "con" },
    { name: "CTCP VinBigData", taxCode: "0109345678", charterCapital: "800 tỷ", ownershipPercent: 85.0, industry: "Dữ liệu lớn", type: "con" },
    { name: "Techcombank", taxCode: "0100611948", charterCapital: "35,172 tỷ", ownershipPercent: 5.3, industry: "Ngân hàng", type: "liên kết" },
    { name: "CTCP Đầu tư và Xây dựng Vina", taxCode: "0107890123", charterCapital: "1,500 tỷ", ownershipPercent: 35.0, industry: "Xây dựng", type: "liên kết" },
];

const VIC_MILESTONES: Milestone[] = [
    { year: 1993, event: "Thành lập Công ty TNHH Technocom tại Kharkov, Ukraine, chuyên sản xuất mì ăn liền", category: "foundation" },
    { year: 2000, event: "Trở về Việt Nam, thành lập Vinpearl - mở đầu hoạt động du lịch nghỉ dưỡng tại Nha Trang", category: "expansion" },
    { year: 2002, event: "Thành lập Vincom - tiền thân của Tập đoàn Vingroup hiện tại", category: "foundation" },
    { year: 2007, event: "Niêm yết cổ phiếu VIC trên sàn HOSE với giá tham chiếu 40,000 VND/CP", category: "listing" },
    { year: 2012, event: "Sáp nhập Vincom và Vinpearl thành Tập đoàn Vingroup", category: "restructuring" },
    { year: 2014, event: "Khánh thành Vincom Mega Mall Royal City - TTTM ngầm lớn nhất Đông Nam Á", category: "expansion" },
    { year: 2016, event: "Ra mắt thương hiệu Vinhomes - phát triển đô thị quy mô lớn", category: "expansion" },
    { year: 2017, event: "Thành lập VinFast - nhà sản xuất ô tô đầu tiên của Việt Nam", category: "expansion" },
    { year: 2018, event: "IPO Vinhomes trên HOSE, huy động 1.35 tỷ USD - thương vụ IPO lớn nhất lịch sử Việt Nam", category: "listing" },
    { year: 2019, event: "VinFast bàn giao lô xe ô tô đầu tiên Fadil, Lux A2.0, Lux SA2.0", category: "expansion" },
    { year: 2020, event: "Ra mắt VinBrain, VinBigData - tập trung chiến lược Công nghệ & Công nghiệp", category: "expansion" },
    { year: 2021, event: "VinFast công bố kế hoạch niêm yết trên sàn Nasdaq (Mỹ)", category: "listing" },
    { year: 2022, event: "Khánh thành nhà máy VinFast tại Hải Phòng - công suất 250,000 xe/năm", category: "expansion" },
    { year: 2023, quarter: "Q3", event: "VinFast chính thức niêm yết trên Nasdaq với mã VFS", category: "listing" },
    { year: 2024, event: "Khởi công xây dựng Vinhomes Global Gate - dự án đô thị phức hợp lớn nhất miền Bắc", category: "expansion" },
    { year: 2025, event: "Chia cổ tức bằng tiền mặt 1,500 VND/CP và cổ phiếu tỷ lệ 100:5", category: "dividend" },
];

const VIC_DIVIDENDS: DividendHistory[] = [
    { year: 2025, type: "Tiền mặt + Cổ phiếu", cashPerShare: 1500, stockRatio: "100:5", exDate: "15/06/2025", paymentDate: "30/06/2025" },
    { year: 2024, type: "Tiền mặt", cashPerShare: 1200, stockRatio: "-", exDate: "20/05/2024", paymentDate: "10/06/2024" },
    { year: 2023, type: "Tiền mặt", cashPerShare: 1000, stockRatio: "-", exDate: "18/06/2023", paymentDate: "05/07/2023" },
    { year: 2022, type: "Cổ phiếu", cashPerShare: 0, stockRatio: "100:3", exDate: "22/07/2022", paymentDate: "15/08/2022" },
    { year: 2021, type: "Tiền mặt", cashPerShare: 800, stockRatio: "-", exDate: "10/06/2021", paymentDate: "25/06/2021" },
    { year: 2020, type: "Không chia", cashPerShare: 0, stockRatio: "-", exDate: "-", paymentDate: "-" },
];

// ==================== DATA GENERATOR ====================

function generateCompanyProfile(ticker: string): CompanyProfileBundle {
    // Dynamic generation for tickers other than VIC
    const SECTOR_DESCRIPTIONS: Record<string, string> = {
        "Ngân hàng": "hoạt động trong lĩnh vực ngân hàng, cung cấp đa dạng các dịch vụ tài chính bao gồm huy động vốn, tín dụng, thanh toán quốc tế, đầu tư và bảo hiểm cho khách hàng cá nhân và doanh nghiệp.",
        "Bất động sản": "phát triển và kinh doanh bất động sản, bao gồm nhà ở, khu đô thị, trung tâm thương mại và bất động sản công nghiệp.",
        "Công nghệ": "cung cấp các giải pháp công nghệ thông tin, phát triển phần mềm, dịch vụ chuyển đổi số và outsourcing cho thị trường trong nước và quốc tế.",
        "Thép": "sản xuất và kinh doanh thép xây dựng, thép công nghiệp và các sản phẩm thép cán nóng, cán nguội phục vụ thị trường nội địa và xuất khẩu.",
        "Chứng khoán": "cung cấp dịch vụ môi giới, tư vấn đầu tư, quản lý tài sản và bảo lãnh phát hành chứng khoán.",
        "Dầu khí": "khai thác, chế biến và phân phối các sản phẩm dầu khí, khí đốt thiên nhiên phục vụ nhu cầu năng lượng trong nước.",
        "Thực phẩm & Đồ uống": "sản xuất và kinh doanh thực phẩm, đồ uống, sản phẩm dinh dưỡng phục vụ tiêu dùng nội địa và xuất khẩu.",
        "Bán lẻ": "kinh doanh bán lẻ đa ngành, phân phối hàng hóa tiêu dùng thông qua hệ thống cửa hàng trên toàn quốc và kênh trực tuyến.",
        "Điện & Năng lượng": "sản xuất, phân phối điện năng và các giải pháp năng lượng tái tạo, năng lượng sạch.",
        "Hóa chất": "sản xuất và kinh doanh hóa chất công nghiệp, phân bón và các sản phẩm hóa chất phục vụ nông nghiệp và công nghiệp.",
        "Logistics": "cung cấp dịch vụ logistics, vận tải quốc tế, khai thác cảng biển và giải pháp chuỗi cung ứng.",
    };

    // Import mock data for company info
    const { STOCK_LIST_DATA } = require("./stockListMockData");
    const listItem = STOCK_LIST_DATA.find((s: { ticker: string }) => s.ticker === ticker);

    const sector = listItem?.sector || "Chưa phân loại";
    const companyName = listItem?.companyName || `Công ty Cổ phần ${ticker}`;
    const baseDesc = SECTOR_DESCRIPTIONS[sector] || "hoạt động trong nhiều lĩnh vực kinh tế đa dạng tại Việt Nam.";

    const overview: CompanyOverview = {
        ticker,
        companyName,
        companyNameEn: `${ticker} Joint Stock Company`,
        taxCode: `010${Math.floor(1000000 + Math.random() * 9000000)}`,
        industry: sector,
        subIndustry: sector,
        foundedDate: `${String(Math.floor(Math.random() * 28) + 1).padStart(2, "0")}/${String(Math.floor(Math.random() * 12) + 1).padStart(2, "0")}/${Math.floor(Math.random() * 15) + 1990}`,
        listingDate: `${String(Math.floor(Math.random() * 28) + 1).padStart(2, "0")}/${String(Math.floor(Math.random() * 12) + 1).padStart(2, "0")}/${Math.floor(Math.random() * 10) + 2005}`,
        exchange: listItem?.exchange || "HOSE",
        charterCapital: `${(Math.floor(Math.random() * 50000) + 2000).toLocaleString("vi-VN")} tỷ VND`,
        outstandingShares: listItem ? `${Math.round(listItem.marketCap * 1e9 / listItem.currentPrice).toLocaleString("vi-VN")}` : "500,000,000",
        listedShares: listItem ? `${Math.round(listItem.marketCap * 1e9 / listItem.currentPrice).toLocaleString("vi-VN")}` : "500,000,000",
        treasuryShares: `${Math.floor(Math.random() * 5000000).toLocaleString("vi-VN")}`,
        parValue: 10000,
        foreignOwnershipLimit: [30, 49, 100][Math.floor(Math.random() * 3)],
        foreignOwnership: parseFloat((Math.random() * 30 + 5).toFixed(1)),
        description: `${companyName} (${ticker}) ${baseDesc} Được thành lập và phát triển qua nhiều năm, ${ticker} đã trở thành một trong những doanh nghiệp hàng đầu trong ngành ${sector} tại Việt Nam với quy mô hoạt động trên toàn quốc.`,
        website: `https://www.${ticker.toLowerCase()}.com.vn`,
        phone: `(028) ${Math.floor(3000 + Math.random() * 7000)} ${Math.floor(1000 + Math.random() * 9000)}`,
        fax: `(028) ${Math.floor(3000 + Math.random() * 7000)} ${Math.floor(1000 + Math.random() * 9000)}`,
        email: `info@${ticker.toLowerCase()}.com.vn`,
        headOffice: `Tầng ${Math.floor(Math.random() * 30) + 5}, Tòa nhà ${ticker} Tower, Quận 1, TP. Hồ Chí Minh`,
        auditor: ["PwC Việt Nam", "Deloitte Việt Nam", "KPMG Việt Nam", "Ernst & Young Việt Nam"][Math.floor(Math.random() * 4)],
        employees: Math.floor(Math.random() * 30000) + 1000,
        branches: Math.floor(Math.random() * 50) + 5,
    };

    const titles = ["Chủ tịch HĐQT", "Phó Chủ tịch HĐQT", "Thành viên HĐQT kiêm TGĐ", "Thành viên HĐQT", "Phó TGĐ Tài chính", "Phó TGĐ", "Trưởng BKS"];
    const titlesEn = ["Chairman", "Vice Chairman", "Board Member & CEO", "Board Member", "Deputy CEO & CFO", "Deputy CEO", "Head of SB"];
    const types: ("board" | "executive" | "supervisor")[] = ["board", "board", "board", "board", "executive", "executive", "supervisor"];
    const lastNames = ["Nguyễn", "Trần", "Lê", "Phạm", "Hoàng", "Huỳnh", "Vũ"];
    const middleNames = ["Văn", "Thị", "Đức", "Minh", "Hồng", "Quốc", "Thanh"];
    const firstNames = ["An", "Bình", "Cường", "Dũng", "Hà", "Hùng", "Linh", "Mai", "Nam", "Phúc"];

    const boardMembers: BoardMember[] = titles.map((pos, i) => ({
        name: `${lastNames[i % lastNames.length]} ${middleNames[i % middleNames.length]} ${firstNames[i % firstNames.length]}`,
        position: pos,
        positionEn: titlesEn[i],
        gender: i === 1 || i === 4 ? "Nữ" : "Nam",
        yearOfBirth: 1960 + Math.floor(Math.random() * 25),
        education: ["Thạc sĩ Kinh tế", "Tiến sĩ Tài chính", "Cử nhân Quản trị KD", "Thạc sĩ MBA", "Tiến sĩ Kế toán", "Cử nhân Luật", "Thạc sĩ Tài chính"][i],
        startDate: `${String(Math.floor(Math.random() * 12) + 1).padStart(2, "0")}/${Math.floor(Math.random() * 10) + 2014}`,
        sharesOwned: `${(Math.floor(Math.random() * 50000) + 100).toLocaleString("vi-VN")},000`,
        sharesPercent: parseFloat((Math.random() * 5).toFixed(2)),
        type: types[i],
    }));

    const subsidiaries: Subsidiary[] = [
        { name: `Công ty TNHH ${ticker} Capital`, taxCode: `010${Math.floor(1e7 + Math.random() * 9e7)}`, charterCapital: `${Math.floor(Math.random() * 5000 + 500)} tỷ`, ownershipPercent: 100, industry: sector, type: "con" },
        { name: `CTCP ${ticker} Services`, taxCode: `010${Math.floor(1e7 + Math.random() * 9e7)}`, charterCapital: `${Math.floor(Math.random() * 3000 + 200)} tỷ`, ownershipPercent: 80 + Math.floor(Math.random() * 20), industry: "Dịch vụ", type: "con" },
        { name: `CTCP Đầu tư ${ticker}`, taxCode: `010${Math.floor(1e7 + Math.random() * 9e7)}`, charterCapital: `${Math.floor(Math.random() * 2000 + 100)} tỷ`, ownershipPercent: 51 + Math.floor(Math.random() * 30), industry: "Đầu tư", type: "con" },
        { name: `CTCP Phát triển ${ticker} Land`, taxCode: `010${Math.floor(1e7 + Math.random() * 9e7)}`, charterCapital: `${Math.floor(Math.random() * 1500 + 100)} tỷ`, ownershipPercent: 30 + Math.floor(Math.random() * 20), industry: sector, type: "liên kết" },
    ];

    const startYear = parseInt(overview.foundedDate.split("/")[2]);
    const milestones: Milestone[] = [
        { year: startYear, event: `Thành lập ${companyName}`, category: "foundation" },
        { year: startYear + 5, event: `Mở rộng quy mô hoạt động trong ngành ${sector}`, category: "expansion" },
        { year: parseInt(overview.listingDate.split("/")[2]), event: `Niêm yết cổ phiếu ${ticker} trên sàn ${overview.exchange}`, category: "listing" },
        { year: 2020, event: `${ticker} gia tăng đầu tư chuyển đổi số và công nghệ`, category: "expansion" },
        { year: 2023, event: `Chia cổ tức bằng tiền mặt 1,000 VND/CP`, category: "dividend" },
        { year: 2024, event: `Mở rộng thêm ${Math.floor(Math.random() * 10 + 3)} chi nhánh mới`, category: "expansion" },
        { year: 2025, event: `Đạt doanh thu kỷ lục trong quý 3, tăng trưởng ${Math.floor(Math.random() * 20 + 10)}% YoY`, category: "award" },
    ];

    const dividendHistory: DividendHistory[] = [
        { year: 2025, type: "Tiền mặt", cashPerShare: Math.floor(Math.random() * 2000 + 500), stockRatio: "-", exDate: "15/06/2025", paymentDate: "30/06/2025" },
        { year: 2024, type: "Tiền mặt", cashPerShare: Math.floor(Math.random() * 1500 + 500), stockRatio: "-", exDate: "20/05/2024", paymentDate: "10/06/2024" },
        { year: 2023, type: "Cổ phiếu", cashPerShare: 0, stockRatio: "100:3", exDate: "18/06/2023", paymentDate: "05/07/2023" },
        { year: 2022, type: "Tiền mặt", cashPerShare: Math.floor(Math.random() * 1000 + 300), stockRatio: "-", exDate: "22/07/2022", paymentDate: "15/08/2022" },
        { year: 2021, type: "Không chia", cashPerShare: 0, stockRatio: "-", exDate: "-", paymentDate: "-" },
    ];

    return { overview, boardMembers, subsidiaries, milestones, dividendHistory };
}

// ==================== EXPORT ====================

export function getCompanyProfileData(ticker: string): CompanyProfileBundle {
    if (ticker === "VIC") {
        return {
            overview: VIC_OVERVIEW,
            boardMembers: VIC_BOARD,
            subsidiaries: VIC_SUBSIDIARIES,
            milestones: VIC_MILESTONES,
            dividendHistory: VIC_DIVIDENDS,
        };
    }
    return generateCompanyProfile(ticker);
}
