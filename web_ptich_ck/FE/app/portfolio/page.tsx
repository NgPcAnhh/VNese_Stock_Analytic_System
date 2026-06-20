"use client";

import { useState, useEffect } from "react";
import { Footer } from "@/components/layout/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sigma, RefreshCw, Plus, Trash2, Goal, Info, PieChartIcon, ClipboardList, X, ChevronRight, ChevronLeft, CheckCircle2, MessageCircle } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";

const API = process.env.NEXT_PUBLIC_API_URL ?? "/api/v1";

type PositionInput = {
    ticker: string;
    qty: number;
    avg_cost: number;
};

type RiskSnapshot = {
    portfolio_id: number;
    date: string;
    nav: number;
    daily_return: number;
    var_95_1d: number;
    cvar_95: number;
    beta: number;
    sharpe: number;
    sortino: number;
    max_drawdown: number;
    current_drawdown: number;
    hhi: number;
    liquidity_days: number;
};

type PortfolioListInfo = {
    id: number;
    name: string;
    risk_profile: string;
    benchmark: string;
    created_at: string;
};

// ============ SURVEY DATA ============
type SurveyQuestion = {
    id: number;
    text: string;
    multiple?: boolean;
    options: { label: string; score: number }[];
};

const SURVEY_QUESTIONS: SurveyQuestion[] = [
    {
        id: 1,
        text: "Hầu hết các khoản đầu tư có thể biến động. Khoản đầu tư của Quý Nhà Đầu Tư giảm giá trị bao nhiêu trong 12 tháng sẽ làm Quý Nhà Đầu Tư bắt đầu cảm thấy lo lắng?",
        options: [
            { label: "Lên đến 5%", score: 1 },
            { label: "Lên đến 10%", score: 2 },
            { label: "Lên đến 15%", score: 3 },
            { label: "Lên đến 25%", score: 4 },
            { label: "Trên 25%", score: 5 },
        ],
    },
    {
        id: 2,
        text: "Mục tiêu tài chính của Quý Nhà Đầu Tư là gì?",
        options: [
            { label: "Bảo toàn vốn và duy trì rủi ro ở mức tối thiểu, không quan tâm quá nhiều tới tỷ suất sinh lời.", score: 1 },
            { label: "Đầu tư tạo ra tỷ suất sinh lời trung bình, cao hơn mức lạm phát hàng năm.", score: 2 },
            { label: "Đầu tư tạo ra tỷ suất sinh lời cao hơn lãi suất tiền gửi ngân hàng.", score: 3 },
            { label: "Tăng trưởng giá trị danh mục một cách cao nhất, chấp nhận rủi ro cao.", score: 4 },
        ],
    },
    {
        id: 3,
        text: "Trong điều kiện thị trường không có nhiều biến động, Quý Nhà Đầu Tư dự tính nắm giữ danh mục trong thời gian bao lâu?",
        options: [
            { label: "Ít hơn 1 năm", score: 1 },
            { label: "Từ 1 năm đến 2 năm", score: 2 },
            { label: "Từ 2 năm đến 3 năm", score: 3 },
            { label: "Từ 3 năm đến 5 năm", score: 4 },
            { label: "5 năm hoặc hơn", score: 5 },
        ],
    },
    {
        id: 4,
        text: "Quý Nhà Đầu Tư đã từng tham gia các sản phẩm đầu tư nào sau đây? (có thể chọn nhiều)",
        multiple: true,
        options: [
            { label: "Tiền gửi tiết kiệm", score: 1 },
            { label: "Ngoại tệ / Vàng", score: 2 },
            { label: "Quỹ trái phiếu / quỹ cân bằng", score: 3 },
            { label: "Quỹ cổ phiếu / Quỹ ETF", score: 4 },
            { label: "Chứng khoán phái sinh / vay margin", score: 5 },
            { label: "Không tham gia vào sản phẩm nào", score: 0 },
        ],
    },
    {
        id: 5,
        text: "Quý Nhà Đầu Tư đã tham gia đầu tư chứng khoán trong thời gian bao lâu?",
        options: [
            { label: "Chưa từng tham gia", score: 1 },
            { label: "Ít hơn 1 năm", score: 2 },
            { label: "Từ 1 năm đến 3 năm", score: 3 },
            { label: "Từ 3 năm đến 5 năm", score: 4 },
            { label: "Trên 5 năm", score: 5 },
        ],
    },
    {
        id: 6,
        text: "Phương án nào dưới đây mô tả chính xác nhất về Quý Nhà Đầu Tư?",
        options: [
            { label: "Dưới 35 tuổi, rất ít nghĩa vụ trả khoản vay và chi tiêu lớn", score: 5 },
            { label: "Dưới 35 tuổi, có nghĩa vụ trả khoản vay và chi tiêu lớn", score: 3 },
            { label: "Từ 35 đến 55 tuổi, rất ít nghĩa vụ trả khoản vay", score: 4 },
            { label: "Từ 35 đến 55 tuổi, có nghĩa vụ trả khoản vay và chi tiêu lớn", score: 2 },
            { label: "Đã nghỉ hưu hoặc sắp nghỉ hưu, rất ít nghĩa vụ trả khoản vay", score: 2 },
            { label: "Đã nghỉ hưu hoặc sắp nghỉ hưu, có nghĩa vụ trả khoản vay", score: 1 },
        ],
    },
];

function scoreToriskProfile(score: number): string {
    if (score <= 12) return "conservative";
    if (score <= 18) return "balanced";
    if (score <= 24) return "growth";
    return "aggressive";
}

const RISK_PROFILE_LABEL: Record<string, string> = {
    conservative: "Bảo thủ",
    balanced: "Cân bằng",
    growth: "Tăng trưởng",
    aggressive: "Tích cực",
};

const RISK_PROFILE_COLOR: Record<string, string> = {
    conservative: "text-blue-500",
    balanced: "text-emerald-500",
    growth: "text-amber-500",
    aggressive: "text-red-500",
};
// ============ END SURVEY DATA ============

const defaultPositions: PositionInput[] = [
    { ticker: "VNM", qty: 1000, avg_cost: 65000 },
    { ticker: "FPT", qty: 2000, avg_cost: 110000 },
];

function formatPercent(v: number): string {
    return `${(v * 100).toFixed(2)}%`;
}

function formatMoney(v: number): string {
    return `${Math.round(v).toLocaleString("vi-VN")} VND`;
}

export default function PortfolioPage() {
    const [name, setName] = useState("Danh mục Tương lai");
    const [riskProfile, setRiskProfile] = useState("balanced");
    const [positions, setPositions] = useState<PositionInput[]>(defaultPositions);
    
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [snapshot, setSnapshot] = useState<RiskSnapshot | null>(null);

    const [portfolios, setPortfolios] = useState<PortfolioListInfo[]>([]);
    const [selectedPortfolioId, setSelectedPortfolioId] = useState<string>("new");
    const [deleting, setDeleting] = useState(false);

    // Survey state
    const [isSurveyOpen, setIsSurveyOpen] = useState(false);
    const [currentQ, setCurrentQ] = useState(0);
    const [surveyAnswers, setSurveyAnswers] = useState<Record<number, number[]>>({});
    const [surveyResult, setSurveyResult] = useState<string | null>(null);

    const fetchPortfolios = () => {
        fetch(`${API}/portfolio`)
            .then(res => res.json())
            .then(data => {
                if(Array.isArray(data)) {
                    setPortfolios(data);
                }
            })
            .catch(err => console.error("Failed to load portfolios:", err));
    };

    useEffect(() => {
        fetchPortfolios();
    }, []);

    const handleSelectPortfolio = async (id: string) => {
        setSelectedPortfolioId(id);
        if (id === "new") {
            setName("Danh mục Tương lai");
            setPositions(defaultPositions);
            setSnapshot(null);
            return;
        }

        const port = portfolios.find(p => p.id.toString() === id);
        if (port) {
            setName(port.name);
            setRiskProfile(port.risk_profile);
        }

        try {
            setLoading(true);
            const posRes = await fetch(`${API}/portfolio/${id}/positions`);
            if (posRes.ok) {
                const posData = await posRes.json();
                if (posData && posData.length > 0) {
                    setPositions(posData);
                } else {
                    setPositions([]);
                }
            }

            const snapRes = await fetch(`${API}/portfolio/${id}/risk/snapshot`);
            if (snapRes.ok) {
                const snapData = await snapRes.json();
                setSnapshot(snapData);
            } else {
                setSnapshot(null);
            }
        } catch (err) {
            console.error("Error loading portfolio:", err);
        } finally {
            setLoading(false);
        }
    };

    const updatePosition = (index: number, patch: Partial<PositionInput>) => {
        setPositions(prev => prev.map((p, i) => i === index ? { ...p, ...patch } : p));
    };

    const addPosition = () => {
        setPositions(prev => [...prev, { ticker: "", qty: 0, avg_cost: 0 }]);
    };

    const removePosition = (index: number) => {
        setPositions(prev => prev.filter((_, i) => i !== index));
    };

    const handleDeletePortfolio = async () => {
        if (selectedPortfolioId === "new") return;
        if (!confirm("Bạn có chắc muốn xóa danh mục này? Dữ liệu sẽ bị xóa vĩnh viễn.")) return;
        setDeleting(true);
        try {
            const res = await fetch(`${API}/portfolio/${selectedPortfolioId}`, { method: "DELETE" });
            if (res.ok || res.status === 204) {
                setSelectedPortfolioId("new");
                setName("Danh mục Tương lai");
                setPositions(defaultPositions);
                setSnapshot(null);
                fetchPortfolios();
            }
        } catch (err) {
            console.error("Error deleting portfolio:", err);
        } finally {
            setDeleting(false);
        }
    };

    const openSurvey = () => {
        setCurrentQ(0);
        setSurveyAnswers({});
        setSurveyResult(null);
        setIsSurveyOpen(true);
    };

    const handleSurveySelect = (qId: number, score: number, multiple: boolean) => {
        setSurveyAnswers(prev => {
            const existing = prev[qId] || [];
            if (multiple) {
                return existing.includes(score)
                    ? { ...prev, [qId]: existing.filter(s => s !== score) }
                    : { ...prev, [qId]: [...existing, score] };
            }
            return { ...prev, [qId]: [score] };
        });
    };

    const handleSurveyComplete = () => {
        let total = 0;
        for (const q of SURVEY_QUESTIONS) {
            const answers = surveyAnswers[q.id] || [];
            if (q.multiple) {
                // max score from selected
                total += answers.length > 0 ? Math.max(...answers) : 0;
            } else {
                total += answers[0] || 0;
            }
        }
        const result = scoreToriskProfile(total);
        setSurveyResult(result);
        setRiskProfile(result);
    };

    const analyze = async () => {
        setLoading(true);
        setError("");
        setSnapshot(null);
        try {
            // 1. Create Portfolio
            const payload = {
                name,
                risk_profile: riskProfile,
                benchmark: "VNINDEX",
                positions: positions.filter(p => p.ticker.trim() !== "" && p.qty > 0)
            };
            const createRes = await fetch(`${API}/portfolio`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            const portData = await createRes.json();
            if (!createRes.ok) throw new Error(portData?.detail || "Không thể khởi tạo danh mục");
            
            const portfolioId = portData.id;

            // 2. Recalc Risk
            const recalcRes = await fetch(`${API}/portfolio/${portfolioId}/risk/recalc`, {
                method: "POST"
            });
            const snapData = await recalcRes.json();
            if (!recalcRes.ok) throw new Error(snapData?.detail || "Không thể tính toán rủi ro");

            setSnapshot(snapData);
            fetchPortfolios();
            setSelectedPortfolioId(portfolioId.toString());
        } catch (err: any) {
            setError(err.message || "Lỗi hệ thống");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background">
            <div className="max-w-[1360px] mx-auto px-4 py-8 space-y-6">
                <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 text-primary px-4 py-1 text-sm font-medium">
                        <Sigma className="h-4 w-4" />
                        Quản trị rủi ro danh mục
                    </div>
                    <h1 className="text-3xl font-bold">Hệ thống Quản trị Danh mục (Stateful)</h1>
                    <p className="text-muted-foreground">
                        Khởi tạo danh mục, thiết lập hạn mức và tính toán chỉ số rủi ro EOD.
                    </p>
                </div>

                <div className="flex flex-col xl:flex-row items-start xl:items-center gap-4 bg-card border rounded-lg px-4 py-3">
                    <div className="flex-1 min-w-0 rounded-3xl border border-primary/20 bg-primary/5 p-4 text-sm text-slate-900">
                        <div className="flex items-start gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white shadow-sm">
                                <MessageCircle className="h-5 w-5" />
                            </div>
                            <div className="min-w-0">
                                <p className="font-semibold">Trợ lý ảo đầu tư</p>
                                <p className="text-sm text-slate-700 leading-relaxed">
                                    Nếu bạn chưa biết rõ khẩu vị đầu tư của mình, hãy thực hiện khảo sát nhanh bên cạnh.
                                </p>
                                <p className="text-xs text-muted-foreground mt-2">
                                    Chỉ cần bấm nút <strong>Khảo sát nhanh</strong> để bắt đầu, tôi sẽ gợi ý khẩu vị phù hợp.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Survey button – left */}
                    <div className="flex-shrink-0">
                        <p className="text-xs text-muted-foreground mb-1">Xác định khẩu vị</p>
                        <Button id="surveyQuickButton" variant="outline" onClick={openSurvey} className="gap-2 whitespace-nowrap">
                            <ClipboardList className="h-4 w-4" />
                            Khảo sát nhanh
                        </Button>
                    </div>

                    {/* Divider */}
                    <div className="w-px h-10 bg-border flex-shrink-0" />

                    {/* Dropdown – center, grows */}
                    <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground mb-1">Danh mục đã lưu</p>
                        <Select value={selectedPortfolioId} onValueChange={handleSelectPortfolio}>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="-- Chọn danh mục hoặc tạo mới --" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="new">+ Tạo danh mục mới</SelectItem>
                                {portfolios.map(p => (
                                    <SelectItem key={p.id} value={p.id.toString()}>
                                        {p.name} &nbsp;·&nbsp; {new Date(p.created_at).toLocaleDateString("vi-VN")}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Delete – right, conditional */}
                    {selectedPortfolioId !== "new" && (
                        <>
                            <div className="w-px h-10 bg-border flex-shrink-0" />
                            <div className="flex-shrink-0">
                                <p className="text-xs text-muted-foreground mb-1">Xóa danh mục</p>
                                <Button
                                    variant="destructive"
                                    onClick={handleDeletePortfolio}
                                    disabled={deleting}
                                    className="gap-2 whitespace-nowrap"
                                >
                                    <Trash2 className="h-4 w-4" />
                                    {deleting ? "Đang xóa..." : "Xóa"}
                                </Button>
                            </div>
                        </>
                    )}
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                            <span>1. Khởi tạo danh mục</span>
                            <Button variant="default" onClick={analyze} disabled={loading}>
                                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                                {loading ? "Đang xử lý..." : "Lưu & Tính toán"}
                            </Button>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="text-sm font-medium mb-1 block">Tên danh mục</label>
                                <Input value={name} onChange={e => setName(e.target.value)} />
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-1 block">Khẩu vị rủi ro</label>
                                <Select value={riskProfile} onValueChange={setRiskProfile}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Chọn khẩu vị" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="conservative">Bảo thủ</SelectItem>
                                        <SelectItem value="balanced">Cân bằng</SelectItem>
                                        <SelectItem value="growth">Tăng trưởng</SelectItem>
                                        <SelectItem value="aggressive">Tích cực</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium mb-2 block">Vị thế hiện tại</label>
                            
                            <div className="hidden md:grid md:grid-cols-12 gap-2 text-xs font-semibold text-muted-foreground mb-1 px-1">
                                <div className="md:col-span-3">Mã cổ phiếu</div>
                                <div className="md:col-span-3">Khối lượng</div>
                                <div className="md:col-span-4">Giá vốn (VND)</div>
                                <div className="md:col-span-2 text-center">Thao tác</div>
                            </div>

                            {positions.map((pos, index) => (
                                <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
                                    <Input className="md:col-span-3" placeholder="Mã CP (vd: FPT)" value={pos.ticker} onChange={e => updatePosition(index, { ticker: e.target.value.toUpperCase() })} />
                                    <Input className="md:col-span-3" type="number" placeholder="Khối lượng" value={pos.qty || ""} onChange={e => updatePosition(index, { qty: Number(e.target.value) })} />
                                    <Input className="md:col-span-4" type="number" placeholder="Giá vốn" value={pos.avg_cost || ""} onChange={e => updatePosition(index, { avg_cost: Number(e.target.value) })} />
                                    <Button variant="outline" className="md:col-span-2 text-red-500 w-full" onClick={() => removePosition(index)} disabled={positions.length <= 1}>
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Xoá
                                    </Button>
                                </div>
                            ))}
                        </div>

                        <Button variant="secondary" onClick={addPosition}>
                            <Plus className="h-4 w-4 mr-2" />
                            Thêm mã
                        </Button>

                        {error && <div className="text-red-500 text-sm mt-2">{error}</div>}
                    </CardContent>
                </Card>

                {snapshot && (
                    <div className="space-y-6 mt-6">
                        {/* Các số lớn hiển thị ngay sau bộ nhập liệu */}
                        <div className="grid grid-cols-4 lg:grid-cols-8 gap-2">
                            <Card title="Cách tính: Tổng (Số lượng x Giá vốn)&#10;Ý nghĩa: Tổng số tiền đang đầu tư" className="p-2">
                                <CardTitle className="text-[11px] text-muted-foreground flex items-center justify-between mb-1">NAV <div><Info className="h-3 w-3" /></div></CardTitle>
                                <CardContent className="p-0 text-sm font-bold">{formatMoney(snapshot.nav)}</CardContent>
                            </Card>
                            <Card title="Cách tính: Phân vị 5% của chuỗi lợi nhuận lịch sử&#10;Ý nghĩa: Mức lỗ tối đa dự kiến trong 1 ngày (độ tin cậy 95%)" className="p-2">
                                <CardTitle className="text-[11px] text-muted-foreground flex items-center justify-between mb-1">VaR 95% (1D) <div><Info className="h-3 w-3" /></div></CardTitle>
                                <CardContent className="p-0 text-sm font-bold">{formatPercent(snapshot.var_95_1d)}</CardContent>
                            </Card>
                            <Card title="Cách tính: Trung bình các khoản lỗ vượt ngưỡng VaR&#10;Ý nghĩa: Mức lỗ trung bình nếu thị trường sập mạnh" className="p-2">
                                <CardTitle className="text-[11px] text-muted-foreground flex items-center justify-between mb-1">CVaR 95% <div><Info className="h-3 w-3" /></div></CardTitle>
                                <CardContent className="p-0 text-sm font-bold text-red-500">{formatPercent(snapshot.cvar_95)}</CardContent>
                            </Card>
                            <Card title="Cách tính: Covariance(Port, VNINDEX) / Variance(VNINDEX)&#10;Ý nghĩa: Độ nhạy so với VNINDEX. >1 là biến động mạnh hơn" className="p-2">
                                <CardTitle className="text-[11px] text-muted-foreground flex items-center justify-between mb-1">Beta <div><Info className="h-3 w-3" /></div></CardTitle>
                                <CardContent className="p-0 text-sm font-bold">{snapshot.beta.toFixed(2)}</CardContent>
                            </Card>
                            <Card title="Cách tính: (Lợi nhuận - Lãi suất phi rủi ro) / Độ lệch chuẩn&#10;Ý nghĩa: Lợi nhuận siêu ngạch trên 1 đơn vị rủi ro" className="p-2">
                                <CardTitle className="text-[11px] text-muted-foreground flex items-center justify-between mb-1">Sharpe <div><Info className="h-3 w-3" /></div></CardTitle>
                                <CardContent className="p-0 text-sm font-bold text-emerald-500">{snapshot.sharpe.toFixed(2)}</CardContent>
                            </Card>
                            <Card title="Cách tính: (Đáy - Đỉnh lịch sử) / Đỉnh lịch sử&#10;Ý nghĩa: Mức sụt giảm lớn nhất từ đỉnh lịch sử" className="p-2">
                                <CardTitle className="text-[11px] text-muted-foreground flex items-center justify-between mb-1">Max DD <div><Info className="h-3 w-3" /></div></CardTitle>
                                <CardContent className="p-0 text-sm font-bold text-orange-500">{formatPercent(snapshot.max_drawdown)}</CardContent>
                            </Card>
                            <Card title="Cách tính: Tổng bình phương các tỷ trọng&#10;Ý nghĩa: Độ tập trung mã. >0.25 là quá tập trung" className="p-2">
                                <CardTitle className="text-[11px] text-muted-foreground flex items-center justify-between mb-1">HHI <div><Info className="h-3 w-3" /></div></CardTitle>
                                <CardContent className="p-0 text-sm font-bold">{snapshot.hhi.toFixed(2)}</CardContent>
                            </Card>
                            <Card title="Cách tính: Số lượng / (10% x Thanh khoản trung bình 20 ngày)&#10;Ý nghĩa: Số ngày cần để bán sạch danh mục mà không ép giá" className="p-2">
                                <CardTitle className="text-[11px] text-muted-foreground flex items-center justify-between mb-1">Liquidity <div><Info className="h-3 w-3" /></div></CardTitle>
                                <CardContent className="p-0 text-sm font-bold">{snapshot.liquidity_days.toFixed(1)} d</CardContent>
                            </Card>
                        </div>

                        {/* Biểu đồ quan trọng nhất lên đầu */}
                        <Card className="border-emerald-200 shadow-md">
                            <CardHeader className="bg-emerald-50/50 pb-4 border-b">
                                <CardTitle className="flex items-center gap-2">
                                    <Goal className="h-5 w-5 text-emerald-600" /> 
                                    Tổng quan & Tỷ trọng Danh mục
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-6 grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                                <div className="h-[300px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie 
                                                data={positions.filter(p => p.ticker && p.qty > 0).map(p => ({ ticker: p.ticker, value: p.qty * p.avg_cost }))} 
                                                dataKey="value" 
                                                nameKey="ticker" 
                                                outerRadius={100} 
                                                innerRadius={50} 
                                                label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                                            >
                                                {positions.map((_, index) => (
                                                    <Cell key={`cell-${index}`} fill={["#16a34a", "#0ea5e9", "#f97316", "#dc2626", "#8b5cf6"][index % 5]} />
                                                ))}
                                            </Pie>
                                            <RechartsTooltip formatter={(value: any) => formatMoney(Number(value) || 0)} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold border-b pb-2">Đánh giá chung</h3>
                                    <p className="text-muted-foreground text-sm leading-relaxed">
                                        Danh mục này có tổng giá trị <strong>{formatMoney(snapshot.nav)}</strong>, được tối ưu hoá theo khẩu vị <strong>{riskProfile === 'conservative' ? 'Bảo thủ' : riskProfile === 'growth' ? 'Tăng trưởng' : riskProfile === 'aggressive' ? 'Tích cực' : 'Cân bằng'}</strong>.
                                    </p>
                                    <ul className="space-y-3 text-sm">
                                        <li className="flex gap-2">
                                            <div className="bg-blue-100 text-blue-600 p-1 rounded h-fit"><Info className="h-4 w-4" /></div>
                                            <div>
                                                <strong>Hiệu suất (Sharpe = {snapshot.sharpe.toFixed(2)}):</strong> 
                                                {snapshot.sharpe > 1 ? ' Danh mục đang sinh lời rất tốt trên mỗi đơn vị rủi ro phải chịu.' : ' Danh mục đang có mức sinh lời tương xứng với rủi ro.'}
                                            </div>
                                        </li>
                                        <li className="flex gap-2">
                                            <div className="bg-orange-100 text-orange-600 p-1 rounded h-fit"><Info className="h-4 w-4" /></div>
                                            <div>
                                                <strong>Rủi ro ngắn hạn (VaR = {formatPercent(snapshot.var_95_1d)}):</strong> 
                                                Trong điều kiện bình thường, có 95% xác suất danh mục sẽ KHÔNG lỗ vượt quá {formatMoney(snapshot.nav * snapshot.var_95_1d)} vào ngày mai.
                                            </div>
                                        </li>
                                        <li className="flex gap-2">
                                            <div className="bg-red-100 text-red-600 p-1 rounded h-fit"><Info className="h-4 w-4" /></div>
                                            <div>
                                                <strong>Sức chịu đựng (Max Drawdown = {formatPercent(snapshot.max_drawdown)}):</strong> 
                                                Nếu kịch bản xấu nhất trong quá khứ lặp lại, danh mục có thể bốc hơi khoảng {formatPercent(snapshot.max_drawdown)} giá trị từ đỉnh.
                                            </div>
                                        </li>
                                    </ul>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Các chart nhỏ giải thích thêm */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base flex items-center justify-between">
                                        <span className="flex items-center gap-2"><PieChartIcon className="h-4 w-4" /> Phân lớp Thanh khoản</span>
                                        <div title="Minh hoạ số tiền nằm ở cổ phiếu dễ bán (thanh khoản cao) so với cổ phiếu khó bán"><Info className="h-4 w-4 text-muted-foreground" /></div>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="h-64">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={[
                                            { name: "Tier 1 (< 1 ngày)", value: snapshot.nav * 0.7 },
                                            { name: "Tier 2 (1-3 ngày)", value: snapshot.nav * 0.2 },
                                            { name: "Tier 3 (> 3 ngày)", value: snapshot.nav * 0.1 }
                                        ]}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                            <XAxis dataKey="name" fontSize={12} />
                                            <YAxis fontSize={12} tickFormatter={(v) => `${(v / 1000000).toFixed(0)}M`} />
                                            <RechartsTooltip formatter={(v: any) => formatMoney(Number(v))} />
                                            <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base flex items-center justify-between">
                                        <span className="flex items-center gap-2"><Sigma className="h-4 w-4" /> Sức chịu đựng Vĩ mô (Giả định)</span>
                                        <div title="Minh hoạ mức độ thiệt hại của danh mục nếu các sự kiện khủng hoảng xảy ra (Dữ liệu mô phỏng)"><Info className="h-4 w-4 text-muted-foreground" /></div>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="h-64">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <RadarChart data={[
                                            { subject: 'Lãi suất +2%', A: -5 },
                                            { subject: 'Lạm phát phi mã', A: -8 },
                                            { subject: 'Đứt gãy chuỗi cung ứng', A: -12 },
                                            { subject: 'Suy thoái kinh tế', A: -20 },
                                            { subject: 'Sập sàn (Covid-like)', A: -30 }
                                        ]}>
                                            <PolarGrid />
                                            <PolarAngleAxis dataKey="subject" tick={{fontSize: 10}} />
                                            <PolarRadiusAxis />
                                            <Radar name="Sụt giảm (%)" dataKey="A" stroke="#dc2626" fill="#fecaca" fillOpacity={0.6} />
                                            <RechartsTooltip formatter={(v: any) => `${v}%`} />
                                        </RadarChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                )}
            </div>
            <Footer />

            {/* ===== SURVEY MODAL ===== */}
            {isSurveyOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="relative w-full max-w-2xl mx-4 bg-card border rounded-2xl shadow-2xl p-6 flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
                        {/* Header */}
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-bold flex items-center gap-2">
                                    <ClipboardList className="h-5 w-5 text-primary" />
                                    Khảo sát Khẩu vị Đầu tư
                                </h2>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Câu {currentQ + 1} / {SURVEY_QUESTIONS.length}
                                </p>
                            </div>
                            <button onClick={() => setIsSurveyOpen(false)} className="p-1 hover:bg-muted rounded-md">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Progress bar */}
                        <div className="w-full bg-muted rounded-full h-1.5">
                            <div
                                className="bg-primary h-1.5 rounded-full transition-all duration-300"
                                style={{ width: `${((currentQ + 1) / SURVEY_QUESTIONS.length) * 100}%` }}
                            />
                        </div>

                        {/* Question */}
                        {!surveyResult ? (
                            <>
                                <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                                    <p className="font-medium text-base leading-relaxed">
                                        {SURVEY_QUESTIONS[currentQ].text}
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    {SURVEY_QUESTIONS[currentQ].options.map((opt) => {
                                        const q = SURVEY_QUESTIONS[currentQ];
                                        const selected = (surveyAnswers[q.id] || []).includes(opt.score);
                                        return (
                                            <button
                                                key={opt.score}
                                                onClick={() => handleSurveySelect(q.id, opt.score, !!q.multiple)}
                                                className={`w-full text-left p-3 rounded-lg border transition-all text-sm ${
                                                    selected
                                                        ? "border-primary bg-primary/10 font-medium"
                                                        : "border-border hover:border-primary/50 hover:bg-muted"
                                                }`}
                                            >
                                                <span className={`inline-block w-5 h-5 rounded-${q.multiple ? "sm" : "full"} border mr-2 align-middle transition-colors ${selected ? "bg-primary border-primary" : "border-muted-foreground"}`} />
                                                {opt.label}
                                            </button>
                                        );
                                    })}
                                </div>

                                <div className="flex items-center justify-between pt-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setCurrentQ(q => Math.max(0, q - 1))}
                                        disabled={currentQ === 0}
                                    >
                                        <ChevronLeft className="h-4 w-4 mr-1" /> Câu trước
                                    </Button>
                                    {currentQ < SURVEY_QUESTIONS.length - 1 ? (
                                        <Button
                                            size="sm"
                                            onClick={() => setCurrentQ(q => q + 1)}
                                            disabled={!(surveyAnswers[SURVEY_QUESTIONS[currentQ].id]?.length)}
                                        >
                                            Câu tiếp <ChevronRight className="h-4 w-4 ml-1" />
                                        </Button>
                                    ) : (
                                        <Button
                                            size="sm"
                                            onClick={handleSurveyComplete}
                                            disabled={!(surveyAnswers[SURVEY_QUESTIONS[currentQ].id]?.length)}
                                        >
                                            <CheckCircle2 className="h-4 w-4 mr-1" /> Hoàn thành
                                        </Button>
                                    )}
                                </div>
                            </>
                        ) : (
                            /* Result screen */
                            <div className="flex flex-col items-center text-center gap-4 py-4">
                                <CheckCircle2 className="h-16 w-16 text-emerald-500" />
                                <div>
                                    <p className="text-muted-foreground text-sm">Kết quả phân loại của bạn</p>
                                    <h3 className={`text-4xl font-bold mt-1 ${RISK_PROFILE_COLOR[surveyResult]}`}>
                                        {RISK_PROFILE_LABEL[surveyResult]}
                                    </h3>
                                </div>
                                <p className="text-sm text-muted-foreground max-w-md">
                                    Khẩu vị rủi ro đã được cập nhật tự động vào mục &ldquo;Khẩu vị rủi ro&rdquo; ở phía dưới. Bạn vẫn có thể thay đổi thủ công nếu muốn.
                                </p>
                                <Button onClick={() => setIsSurveyOpen(false)}>Xác nhận & Đóng</Button>
                            </div>
                        )}
                    </div>
                </div>
            )}
            {/* ===== END SURVEY MODAL ===== */}
        </div>
    );
}
