"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import * as Sonner from "sonner";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import Editor from '@monaco-editor/react';

import {
  LayoutDashboard,
  Save,
  Plus,
  X,
  Filter,
  Trash2,
  Settings2,
  Eye,
  PenTool,
  BarChart3,
  LineChart,
  PieChart,
  Archive,
  ArrowLeft,
  Table2,
  ChevronRight,
  ChevronLeft,
  ChevronUp,
  Database,
  Calendar,
  Layers,
  FileSpreadsheet,
  Search,
  Maximize2,
  Minimize2,
  Download,
  Type,
  Square,
  Circle,
  Minus,
  Heading1,
  ChevronDown,
  AlignLeft,
  Columns2,
  Image as ImageIcon,
  Palette,
  Check,
  Forward,
  Sparkles,
  Copy,
  Play,
  MousePointer2,
  Hand,
  GripVertical,
  Shield,
  ShieldCheck,
  ShieldX,
  Users,
  Lock
} from "lucide-react";
import { api } from "@/lib/api-client";
import { useAuth } from "@/lib/AuthContext";

const EChartRenderer = dynamic(() => import("@/components/charts/EChartRenderer"), { ssr: false });
const WORKSPACE_ID = "00000000-0000-0000-0000-000000000000";


interface GlobalFilter {
  id: string;
  name: string;
  column: string;
  operator: "equals" | "contains" | "greater_than" | "less_than";
  defaultValue?: string;
}

interface DashboardFrame {
  id: string;
  name: string;
  pos: { x: number; y: number; w: number; h: number };
  tabId: string;
  isMain?: boolean;
  bgColor?: string;
  borderColor?: string;
  borderRadius?: number;
  borderStyle?: 'solid' | 'dashed' | 'dotted' | 'none';
  borderWidth?: number;
  boxShadow?: string;
  bgImage?: string;
  opacity?: number;
}

// Dashboard widget types (non-chart)
type WidgetType = 'heading' | 'text' | 'rectangle' | 'circle' | 'divider' | 'image' | 'filter' | 'code';
interface DashboardWidget {
  id: string;
  itemType: WidgetType;
  // text / heading / code
  text?: string;
  // image
  src?: string;
  objectFit?: 'cover' | 'contain' | 'fill';
  // style overrides
  bgColor?: string;
  borderColor?: string;
  borderRadius?: number;
  opacity?: number;
  fontSize?: number;
  fontWeight?: string;
  textAlign?: 'left' | 'center' | 'right';
  color?: string;
  borderStyle?: 'solid' | 'dashed' | 'dotted' | 'none';
  borderWidth?: number;
  zIndex?: number;
  pos: { x: number; y: number; w: number; h: number };
  tabId?: string;
  fontStyle?: 'normal' | 'italic';
  textDecoration?: 'none' | 'underline';
  fontFamily?: string;
  boxShadow?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  backdropBlur?: 'none' | 'sm' | 'md' | 'lg';
  bgGradient?: string;
  padding?: number;
  // Filter settings
  filterColumn?: string;
  filterType?: 'like' | 'dropdown' | 'date';
  dateSubtype?: 'date' | 'month' | 'year';
  activeValue?: string;
  filterOrientation?: 'vertical' | 'horizontal';
  controlWidth?: string;
  filterDropdownHeight?: number;
  filterDropdownWidth?: string;
  // Code settings
  code?: string;
}

const formatDate = (value?: string) => {
  if (!value) return "-";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "-" : parsed.toLocaleDateString();
};

const evaluateEChartsCode = (
  code: string, 
  data: any[], 
  context: any = {}
): { option: any; error: string | null } => {
  if (typeof window === 'undefined') return { option: {}, error: null };
  if (!code) return { option: {}, error: "No code provided." };
  try {
    const safeContext = {
      setFilter: context?.setFilter || (() => {}),
      switchTab: context?.switchTab || (() => {}),
      notify: context?.notify || ((msg: string) => console.log("Notify:", msg)),
      ...context
    };

    // Prevent access to dangerous globals during render
    const evalFunc = new Function("data", "window", "document", "location", "context", `
      try {
        ${code}
      } catch (e) {
        return { __error: e.message };
      }
    `);
    // Pass null for sensitive objects to prevent side-effects during render
    const result = evalFunc(data, null, null, null, safeContext);
    
    if (result?.__error) {
      return { option: {}, error: result.__error };
    }
    
    if (!result || typeof result !== "object") {
      return { option: {}, error: "Code must return an option object (e.g., return { ... })." };
    }
    return { option: result, error: null };
  } catch (err: any) {
    return { option: {}, error: err?.message || String(err) };
  }
};

const CodeWidgetRenderer = ({ 
  widget, 
  onSetFilter, 
  onSwitchTab,
  allWidgets
}: { 
  widget: DashboardWidget, 
  onSetFilter: (column: string, value: string) => void,
  onSwitchTab: (tabId: string) => void,
  allWidgets: DashboardWidget[]
}) => {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!widget.code) return;
    
    // We use a small delay to ensure the DOM is fully ready and to not block the main thread
    const timer = setTimeout(() => {
      const element = document.getElementById(`widget-${widget.id}`);
      if (!element) return;

      // Prepare context for the script
      const context = {
        element,
        id: widget.id,
        // Bridge API: allow interacting with the dashboard safely
        setFilter: (column: string, value: string) => onSetFilter(column, value),
        switchTab: (tabId: string) => onSwitchTab(tabId),
        // Helper to find other widgets (read-only)
        getWidget: (id: string) => allWidgets.find(w => w.id === id),
        // Notification bridge
        notify: (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
          if (type === 'success') Sonner.toast.success(msg);
          else if (type === 'error') Sonner.toast.error(msg);
          else Sonner.toast(msg);
        }
      };

      try {
        // We replace {{id}} but also provide context for better coding
        const processedCode = (widget.code || '').replace(/{{id}}/g, widget.id);
        
        // Wrap in an async-ready function to allow fetch/await if needed
        const scriptWrapper = new Function('context', `
          (async function(ctx) {
            const { element, id, setFilter, switchTab, getWidget, notify } = ctx;
            try {
              ${processedCode}
            } catch (err) {
              console.error('Runtime error in Custom JS widget ' + id + ':', err);
            }
          })(context);
        `);
        
        scriptWrapper(context);
      } catch (err) {
        console.error(`Compilation error in Custom JS widget ${widget.id}:`, err);
      }
    }, 50);

    return () => clearTimeout(timer);
  }, [widget.code, widget.id, allWidgets, onSetFilter, onSwitchTab]);

  return (
    <div 
      id={`widget-${widget.id}`} 
      className="w-full h-full overflow-hidden"
    />
  );
};

const getDefaultEChartsCode = (preview: any) => {
  const columns = preview?.columns || [];
  const col1 = columns[0]?.name || "category";
  const col2 = columns[1]?.name || columns[0]?.name || "value";

  return `// Variable 'data' is an array of records from the dataset.
// Write JavaScript to return the ECharts option object.

return {
  tooltip: {
    trigger: 'axis'
  },
  xAxis: {
    type: 'category',
    data: data.map(row => row['${col1}'])
  },
  yAxis: {
    type: 'value'
  },
  series: [
    {
      name: '${col2}',
      type: 'bar',
      data: data.map(row => row['${col2}']),
      itemStyle: {
        color: '#f97316' // Premium orange highlight
      }
    }
  ]
};`;
};

export default function BIHubPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user: currentUser } = useAuth();
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [isHeaderDisabled, setIsHeaderDisabled] = useState(false);
  const [mainFrameId, setMainFrameId] = useState<string | null>(null);
  const [tabFrameId, setTabFrameId] = useState<string | null>(null);
  const [tabFramePosition, setTabFramePosition] = useState<'top' | 'bottom' | 'left' | 'right'>('top');
  const [dashboardFrames, setDashboardFrames] = useState<DashboardFrame[]>([]);
  const [showAddFrameDropdown, setShowAddFrameDropdown] = useState(false);
  const addFrameDropdownRef = useRef<HTMLDivElement>(null);
  const [tabBorderRadius, setTabBorderRadius] = useState<number>(12);
  const [tabOpacity, setTabOpacity] = useState<number>(1);
  const [tabBarStyle, setTabBarStyle] = useState<"pills" | "underline" | "flat">("pills");
  const [tabFontSize, setTabFontSize] = useState<number>(12);
  const [tabFontWeight, setTabFontWeight] = useState<"normal" | "bold" | "semibold">("semibold");
  const [tabPaddingX, setTabPaddingX] = useState<number>(18);
  const [tabPaddingY, setTabPaddingY] = useState<number>(8);
  const [tabGap, setTabGap] = useState<number>(8);
  const [tabAlign, setTabAlign] = useState<"start" | "center" | "end">("start");
  const [tabActiveColor, setTabActiveColor] = useState<string>("var(--color-orange-500)");
  const [tabBgColor, setTabBgColor] = useState<string>("#ffffff");
  const [tabBorderColor, setTabBorderColor] = useState<string>("#ffffff");
  const [tabBarBgColor, setTabBarBgColor] = useState<string>("transparent");
  const [tabBarBorderColor, setTabBarBorderColor] = useState<string>("transparent");
  const [alignmentGuides, setAlignmentGuides] = useState<{ x?: number, y?: number, type: 'h' | 'v' }[]>([]);
  const SNAP_THRESHOLD = 8;

  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [selectedWidgetId, setSelectedWidgetId] = useState<string | null>(null);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [selectedWidgetIds, setSelectedWidgetIds] = useState<string[]>([]);
  const [selectionBox, setSelectionBox] = useState<{ x1: number, y1: number, x2: number, y2: number } | null>(null);
  const [interactionMode, setInteractionMode] = useState<"select" | "pan">("select");

  // History for Undo
  const [history, setHistory] = useState<{ items: any[], widgets: any[], frames: any[] }[]>([]);
  const [toolbarPos, setToolbarPos] = useState({ x: 16, y: 16 }); // Distance from bottom-right

  const startToolbarDrag = (e: React.MouseEvent) => {
    if (!isEditMode) return;
    e.preventDefault();
    e.stopPropagation();
    const startX = toolbarPos.x;
    const startY = toolbarPos.y;
    const startMouseX = e.clientX;
    const startMouseY = e.clientY;

    const onMove = (moveEvent: MouseEvent) => {
      const dx = moveEvent.clientX - startMouseX;
      const dy = moveEvent.clientY - startMouseY;
      // We use bottom/right positioning, so subtract movement
      setToolbarPos({
        x: Math.max(8, startX - dx),
        y: Math.max(8, startY - dy)
      });
    };

    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  const saveToHistory = () => {
    setHistory(prev => {
      const newState = {
        items: JSON.parse(JSON.stringify(dashboardItems)),
        widgets: JSON.parse(JSON.stringify(dashboardWidgets)),
        frames: JSON.parse(JSON.stringify(dashboardFrames))
      };
      // Limit history to 30 steps
      const newHistory = [...prev, newState];
      if (newHistory.length > 30) return newHistory.slice(newHistory.length - 30);
      return newHistory;
    });
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    const prevState = history[history.length - 1];
    setDashboardItems(prevState.items);
    setDashboardWidgets(prevState.widgets);
    setDashboardFrames(prevState.frames || []);
    setHistory(prev => prev.slice(0, prev.length - 1));
  };

  // Code editor scroll refs
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);

  const handleScroll = () => {
    if (textareaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  // BI Hub State
  const [activeTab, setActiveTab] = useState<"dashboards" | "charts">("dashboards");
  const [view, setView] = useState<"list" | "edit-dashboard" | "edit-chart" | "create-chart">("list");
  const [loading, setLoading] = useState(true);

  // Asset lists
  const [dashboards, setDashboards] = useState<any[]>([]);
  const [charts, setCharts] = useState<any[]>([]);
  const [datasets, setDatasets] = useState<any[]>([]);

  // Create Dashboard Modal State
  const [showCreateDashModal, setShowCreateDashModal] = useState(false);
  const [newDashName, setNewDashName] = useState("");
  const [newDashDesc, setNewDashDesc] = useState("");
  const [isEditingDashName, setIsEditingDashName] = useState(false);
  const [editingDashNameInput, setEditingDashNameInput] = useState('');

  // Dataset Preview Modal State
  const [showPreviewDatasetModal, setShowPreviewDatasetModal] = useState(false);
  const [previewDatasetData, setPreviewDatasetData] = useState<{ columns: any[], rows: any[], error?: string } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Select Dataset Modal State (when creating chart)
  const [showSelectDatasetModal, setShowSelectDatasetModal] = useState(false);
  const [datasetSearchQuery, setDatasetSearchQuery] = useState("");
  const [chartSearchQuery, setChartSearchQuery] = useState("");
  const [draggedChart, setDraggedChart] = useState<any>(null);
  const gridContainerRef = useRef<HTMLDivElement>(null);

  // ECharts Editor state
  const [chartConfigTab, setChartConfigTab] = useState<"schema" | "code">("schema");
  const [echartsCode, setEchartsCode] = useState("");
  const [evalError, setEvalError] = useState<string | null>(null);
  const [evalSuccess, setEvalSuccess] = useState(false);
  const [evaluatedOption, setEvaluatedOption] = useState<any>({});
  const [showMaximizeCodeModal, setShowMaximizeCodeModal] = useState(false);
  const [showFullsizePreview, setShowFullsizePreview] = useState(false);
  const previewChartRef = useRef<any>(null);
  const fullsizeChartRef = useRef<any>(null);

  // AI Prompt Generator state
  const [aiPromptChartDesc, setAiPromptChartDesc] = useState("");
  const [aiPromptFieldDesc, setAiPromptFieldDesc] = useState("");
  const [aiPromptDesignNote, setAiPromptDesignNote] = useState("");
  const [aiPromptCopied, setAiPromptCopied] = useState(false);

  // ==========================================
  // DASHBOARD BUILDER STATE
  // ==========================================
  const [selectedDashboard, setSelectedDashboard] = useState<any>(null);
  // Each item: { id, chart, data, pos: { x, y, w, h } } — all pixel values
  const [dashboardItems, setDashboardItems] = useState<any[]>([]);

  // Ref for free-form drag / resize interaction state (avoids stale closures)
  const interactionRef = useRef<{
    type: 'drag' | 'resize' | null;
    itemId: string | null;
    handle: string; // 'se' | 's' | 'e' | 'sw' | 's' | 'w' | 'n' | 'nw' | 'ne'
    startMouseX: number;
    startMouseY: number;
    startX: number;
    startY: number;
    startW: number;
    startH: number;
    initialPositions: { id: string, x: number, y: number, type: 'item' | 'widget' | 'frame' }[];
  }>({
    type: null, itemId: null, handle: 'se',
    startMouseX: 0, startMouseY: 0,
    startX: 0, startY: 0, startW: 0, startH: 0,
    initialPositions: []
  });
  const [showAddChart, setShowAddChart] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<'add' | 'manage'>('add');

  // Permission system state
  const [chartPermissions, setChartPermissions] = useState<Record<string, number[]>>({}); 
  const [tempChartPermissions, setTempChartPermissions] = useState<Record<string, number[]>>({});
  // chartPermissions[chart_id] = [user_id1, user_id2, ...]  (empty = private, only admin+creator)
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [permissionTargetChartIds, setPermissionTargetChartIds] = useState<string[]>([]);
  const [selectedManagedCharts, setSelectedManagedCharts] = useState<string[]>([]);
  const [allSystemUsers, setAllSystemUsers] = useState<any[]>([]);
  const [permissionUserSearch, setPermissionUserSearch] = useState('');
  const [savingPermissions, setSavingPermissions] = useState(false);
  const [showNoPermTabPopup, setShowNoPermTabPopup] = useState(false);
  const [noPermTabName, setNoPermTabName] = useState('');
  const [showAddElementDropdown, setShowAddElementDropdown] = useState(false);
  const [showTemplateSettings, setShowTemplateSettings] = useState(false);
  const addElementDropdownRef = useRef<HTMLDivElement>(null);
  const templateSettingsRef = useRef<HTMLDivElement>(null);
  const addChartRef = useRef<HTMLDivElement>(null);
  const widgetImageInputRef = useRef<HTMLInputElement>(null);
  const frameImageInputRef = useRef<HTMLInputElement>(null);

  const handleFrameImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && stylingFrameId) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        setDashboardFrames(prev => prev.map(f => f.id === stylingFrameId ? { ...f, bgImage: base64 } : f));
      };
      reader.readAsDataURL(file);
    }
  };
  // dashboard widgets (non-chart elements)
  const [dashboardWidgets, setDashboardWidgets] = useState<DashboardWidget[]>([]);
  const [editingWidgetId, setEditingWidgetId] = useState<string | null>(null);
  const [showWidgetStyleModal, setShowWidgetStyleModal] = useState(false);
  const [stylingWidgetId, setStylingWidgetId] = useState<string | null>(null);
  const [showFrameStyleModal, setShowFrameStyleModal] = useState(false);
  const [stylingFrameId, setStylingFrameId] = useState<string | null>(null);
  const [editingWidgetText, setEditingWidgetText] = useState('');
  const [globalFilters, setGlobalFilters] = useState<GlobalFilter[]>([]);
  const [activeFilterValues, setActiveFilterValues] = useState<Record<string, string>>({});
  const [isEditMode, setIsEditMode] = useState<boolean>(true);
  const [showAddFilterModal, setShowAddFilterModal] = useState<boolean>(false);
  const [editingFilter, setEditingFilter] = useState<GlobalFilter | null>(null);
  const [activeDropdownWidgetId, setActiveDropdownWidgetId] = useState<string | null>(null);

  // Dashboard Tabs State
  const [dashboardTabs, setDashboardTabs] = useState<{ id: string; name: string }[]>([]);
  const [activeTabId, setActiveTabId] = useState<string>('default');
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editingTabName, setEditingTabName] = useState<string>("");
  const [tabPosition, setTabPosition] = useState<"none" | "top" | "bottom" | "left" | "right" | "custom">("top");
  const [tabBarSize, setTabBarSize] = useState<number>(200); // Default width for side, default height for top/bottom
  const [customTabRect, setCustomTabRect] = useState<{ x: number, y: number, w: number, h: number }>({ x: 40, y: 40, w: 400, h: 60 });
  const [showTabPosDropdown, setShowTabPosDropdown] = useState(false);
  const tabPosDropdownRef = useRef<HTMLDivElement>(null);
  const [showTabSettings, setShowTabSettings] = useState(false);
  const [tabBarCollapseEnabled, setTabBarCollapseEnabled] = useState<boolean>(false);
  const [isTabBarCollapsed, setIsTabBarCollapsed] = useState<boolean>(false);
  const [tabBarPinned, setTabBarPinned] = useState<boolean>(false);

  // Whiteboard Layout State
  const [layoutMode, setLayoutMode] = useState<'slide' | 'whiteboard'>('slide');
  const [showIframePreview, setShowIframePreview] = useState(false);
  const [zoom, setZoom] = useState<number>(1);
  const zoomRef = useRef(1);
  // Keep zoomRef in sync
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [spacePressed, setSpacePressed] = useState(false);
  const isPanningRef = useRef<{ active: boolean; startX: number; startY: number; startPanX: number; startPanY: number }>({ active: false, startX: 0, startY: 0, startPanX: 0, startPanY: 0 });

  const startCustomTabDrag = (e: React.MouseEvent) => {
    if (!isEditMode) return;
    e.preventDefault();
    e.stopPropagation();

    const startX = customTabRect.x;
    const startY = customTabRect.y;
    const startMouseX = e.clientX;
    const startMouseY = e.clientY;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const dx = moveEvent.clientX - startMouseX;
      const dy = moveEvent.clientY - startMouseY;
      setCustomTabRect(prev => ({
        ...prev,
        x: Math.max(0, startX + dx),
        y: Math.max(0, startY + dy)
      }));
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  const startCustomTabResize = (e: React.MouseEvent, handle: string) => {
    if (!isEditMode) return;
    e.preventDefault();
    e.stopPropagation();

    const startX = customTabRect.x;
    const startY = customTabRect.y;
    const startW = customTabRect.w;
    const startH = customTabRect.h;
    const startMouseX = e.clientX;
    const startMouseY = e.clientY;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const dx = moveEvent.clientX - startMouseX;
      const dy = moveEvent.clientY - startMouseY;

      let newRect = { ...customTabRect };

      if (handle.includes('e')) newRect.w = Math.max(100, startW + dx);
      if (handle.includes('s')) newRect.h = Math.max(40, startH + dy);
      if (handle.includes('w')) {
        const delta = Math.min(startW - 100, dx);
        newRect.x = startX + delta;
        newRect.w = startW - delta;
      }
      if (handle.includes('n')) {
        const delta = Math.min(startH - 40, dy);
        newRect.y = startY + delta;
        newRect.h = startH - delta;
      }

      setCustomTabRect(newRect);
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  // ==========================================
  // DASHBOARD BUILDER HELPERS
  // ==========================================
  // ==========================================
  // DASHBOARD BUILDER HELPERS
  // ==========================================
  const renderTabItem = (tab: { id: string; name: string }, horizontal: boolean) => {
    const isActive = activeTabId === tab.id;
    const isEditing = editingTabId === tab.id;

    // Helper for generating soft translucent glow colors dynamically
    const getRGBAColor = (hex: string, alpha: number) => {
      if (!hex) return `rgba(234, 88, 12, ${alpha})`;
      if (hex.startsWith('var')) {
        return `rgba(234, 88, 12, ${alpha})`;
      }
      let c = hex.substring(1);
      if (c.length === 3) {
        c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
      }
      try {
        const r = parseInt(c.substring(0, 2), 16);
        const g = parseInt(c.substring(2, 4), 16);
        const b = parseInt(c.substring(4, 6), 16);
        if (isNaN(r) || isNaN(g) || isNaN(b)) {
          return `rgba(234, 88, 12, ${alpha})`;
        }
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
      } catch (e) {
        return `rgba(234, 88, 12, ${alpha})`;
      }
    };

    const activeColorHex = tabActiveColor.startsWith('var') ? '#ea580c' : tabActiveColor;

    // Apply styles based on tabBarStyle
    let styleClasses = "relative group/item select-none transition-all duration-300 ease-out hover:scale-[1.02] active:scale-[0.98]";
    let inlineStyles: React.CSSProperties = { 
      borderRadius: `${tabBorderRadius}px`, 
      opacity: tabOpacity,
      fontSize: `${tabFontSize}px`,
      fontWeight: tabFontWeight,
      paddingLeft: `${tabPaddingX}px`,
      paddingRight: `${tabPaddingX}px`,
      paddingTop: `${tabPaddingY}px`,
      paddingBottom: `${tabPaddingY}px`,
    };

    if (tabBarStyle === 'pills') {
      if (isActive) {
        styleClasses += " text-white border-transparent";
        inlineStyles.backgroundColor = activeColorHex;
        inlineStyles.borderColor = 'transparent';
        inlineStyles.boxShadow = `0 6px 16px -2px ${getRGBAColor(activeColorHex, 0.35)}, inset 0 1px 0 0 rgba(255, 255, 255, 0.15)`;
      } else {
        styleClasses += " border-neutral-800/60 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50 hover:border-neutral-700/50 hover:shadow-md hover:shadow-black/5";
        inlineStyles.backgroundColor = tabBgColor;
        inlineStyles.borderColor = tabBorderColor;
      }
    } else if (tabBarStyle === 'underline') {
      // Underlines shouldn't have solid borders/backgrounds by default
      styleClasses += " border-transparent rounded-none bg-transparent";
      if (isActive) {
        styleClasses += " font-bold";
        inlineStyles.color = activeColorHex;
      } else {
        styleClasses += " text-neutral-400 hover:text-neutral-200";
      }
    } else { // flat
      if (isActive) {
        styleClasses += " bg-neutral-850 border-neutral-800 text-white shadow-sm shadow-black/10";
      } else {
        styleClasses += " border-transparent text-neutral-500 hover:text-neutral-300 bg-transparent hover:bg-neutral-800/30";
      }
    }

    return (
      <div
        key={tab.id}
        onClick={() => !isEditing && handleSelectTab(tab.id)}
        onDoubleClick={() => {
          if (isEditMode && !isEditing) {
            setEditingTabId(tab.id);
            setEditingTabName(tab.name);
          }
        }}
        style={inlineStyles}
        title={isEditMode ? "Double-click to rename" : undefined}
        className={`flex items-center gap-2 text-xs cursor-pointer border shrink-0 ${styleClasses} ${!horizontal ? 'w-full justify-between' : ''}`}
      >
        {/* Soft active indicator for underline style - adapts to horizontal/vertical layout */}
        {tabBarStyle === 'underline' && isActive && (
          horizontal ? (
            <div 
              className="absolute bottom-0 left-[15%] right-[15%] h-[3px] rounded-full animate-in fade-in slide-in-from-bottom-1 duration-200"
              style={{ backgroundColor: activeColorHex }}
            />
          ) : (
            <div 
              className="absolute left-0 top-[15%] bottom-[15%] w-[3px] rounded-full animate-in fade-in slide-in-from-left-1 duration-200"
              style={{ backgroundColor: activeColorHex }}
            />
          )
        )}

        {isEditing ? (
          <input
            value={editingTabName}
            onChange={e => setEditingTabName(e.target.value)}
            onBlur={() => {
              if (editingTabName.trim()) {
                setDashboardTabs(prev => prev.map(t => t.id === tab.id ? { ...t, name: editingTabName.trim() } : t));
              }
              setEditingTabId(null);
            }}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                if (editingTabName.trim()) {
                  setDashboardTabs(prev => prev.map(t => t.id === tab.id ? { ...t, name: editingTabName.trim() } : t));
                }
                setEditingTabId(null);
              } else if (e.key === 'Escape') {
                setEditingTabId(null);
              }
            }}
            onClick={e => e.stopPropagation()}
            onDoubleClick={e => e.stopPropagation()}
            className="bg-neutral-950 text-neutral-50 border border-orange-500/50 rounded-lg px-2 py-0.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-orange-500 w-28 transition-all"
            autoFocus
          />
        ) : (
          <span className="truncate">
            {tab.name}
          </span>
        )}

        {isEditMode && dashboardTabs.length > 1 && (
          <button
            onClick={(e) => handleDeleteTab(tab.id, e)}
            className="p-1 text-neutral-500 hover:text-red-400 hover:bg-red-500/10 rounded-full transition-all duration-200 shrink-0 ml-1 opacity-0 group-hover/item:opacity-100 focus:opacity-100"
            title="Delete Tab"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>
    );
  };

  const renderAddTabButton = () => {
    const isOrange = tabActiveColor.startsWith('var');
    const activeColorHex = isOrange ? '#ea580c' : tabActiveColor;
    
    const getRGBA = (hex: string, alpha: number) => {
      let c = hex.substring(1);
      if (c.length === 3) {
        c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
      }
      try {
        const r = parseInt(c.substring(0, 2), 16);
        const g = parseInt(c.substring(2, 4), 16);
        const b = parseInt(c.substring(4, 6), 16);
        if (isNaN(r) || isNaN(g) || isNaN(b)) {
          return `rgba(234, 88, 12, ${alpha})`;
        }
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
      } catch (e) {
        return `rgba(234, 88, 12, ${alpha})`;
      }
    };

    const isCustomMode = dashboardTabs.length > 1;

    return (
      <button
        onClick={isCustomMode ? () => setShowTabSettings(true) : handleAddTab}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold transition-all duration-300 rounded-xl cursor-pointer shrink-0 hover:scale-[1.02] active:scale-[0.98] border border-dashed group/add-btn"
        style={{ 
          borderRadius: `${tabBorderRadius}px`,
          color: activeColorHex,
          backgroundColor: getRGBA(activeColorHex, 0.04),
          borderColor: getRGBA(activeColorHex, 0.2),
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = getRGBA(activeColorHex, 0.08);
          e.currentTarget.style.borderColor = getRGBA(activeColorHex, 0.45);
          e.currentTarget.style.boxShadow = `0 4px 12px ${getRGBA(activeColorHex, 0.12)}`;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = getRGBA(activeColorHex, 0.04);
          e.currentTarget.style.borderColor = getRGBA(activeColorHex, 0.2);
          e.currentTarget.style.boxShadow = 'none';
        }}
        title={isCustomMode ? "Tab Bar Settings" : "Add New Tab"}
      >
        {isCustomMode ? (
          <Settings2 className="w-3.5 h-3.5 transition-transform duration-300 group-hover/add-btn:rotate-90" />
        ) : (
          <Plus className="w-3.5 h-3.5 transition-transform duration-300 group-hover/add-btn:rotate-90" /> 
        )}
        <span>{isCustomMode ? "Custom Tab Bar" : "New Tab"}</span>
      </button>
    );
  };

  // Direct Chart Edit from Dashboard Modal State
  const [editDashboardChartItem, setEditDashboardChartItem] = useState<any | null>(null);
  const [editDashboardChartCode, setEditDashboardChartCode] = useState("");
  const [editDashboardChartEvalError, setEditDashboardChartEvalError] = useState<string | null>(null);
  const [editDashboardChartEvalSuccess, setEditDashboardChartEvalSuccess] = useState(false);
  const [editDashboardChartEvaluatedOption, setEditDashboardChartEvaluatedOption] = useState<any>({});

  // Form states for Filter Modal
  const [filterNameInput, setFilterNameInput] = useState("");
  const [filterColumnInput, setFilterColumnInput] = useState("");
  const [filterOperatorInput, setFilterOperatorInput] = useState<"equals" | "contains" | "greater_than" | "less_than">("equals");
  const [filterDefaultValueInput, setFilterDefaultValueInput] = useState("");

  // ==========================================
  // CHART BUILDER STATE
  // ==========================================
  const [editingChartId, setEditingChartId] = useState<string | null>(null);
  const [chartName, setChartName] = useState("");
  const [chartType, setChartType] = useState("bar");
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>("");
  const [datasetPreview, setDatasetPreview] = useState<any>(null);
  const [xEncoding, setXEncoding] = useState("");
  const [yEncoding, setYEncoding] = useState("");
  const [isSchemaExpanded, setIsSchemaExpanded] = useState(true);
  const [showChartPreview, setShowChartPreview] = useState(false);
  // Auto generate template code on new chart dataset load
  useEffect(() => {
    if (datasetPreview?.rows && !editingChartId && !echartsCode) {
      const defaultCode = getDefaultEChartsCode(datasetPreview);
      setEchartsCode(defaultCode);

      const evalResult = evaluateEChartsCode(defaultCode, datasetPreview.rows);
      if (!evalResult.error) {
        setEvaluatedOption(evalResult.option);
        setEvalError(null);
        setEvalSuccess(true);
      } else {
        setEvalError(evalResult.error);
        setEvalSuccess(false);
      }
    }
  }, [datasetPreview, editingChartId, echartsCode]);

  // Load lists on mount
  useEffect(() => {
    loadHubData().then(res => {
      const isPreview = searchParams.get('preview') === 'true';
      const isHeaderDisabledParam = searchParams.get('disable_header') === 'true';
      const dashId = searchParams.get('dashboardId');

      if (isHeaderDisabledParam) {
        setIsHeaderDisabled(true);
      }

      if (isPreview && dashId && res?.dashboardsData) {
        const dashboard = res.dashboardsData.find((d: any) => d.id === dashId);
        if (dashboard) {
          setIsPreviewMode(true);
          const urlOverrides = {
            mainFrameId: searchParams.get('mainFrameId'),
            tabId: searchParams.get('tabId')
          };
          handleOpenDashboard(dashboard, urlOverrides);
          setTimeout(() => setIsEditMode(false), 50); // Ensure edit mode is false
        }
      }
    });
  }, []);

  // ==========================================
  // DASHBOARD LAYOUT & VIEW LOGIC
  // ==========================================
  const [clipboard, setClipboard] = useState<{ type: 'item' | 'widget', data: any } | null>(null);

  const handleCopy = () => {
    if (selectedItemId) {
      const item = dashboardItems.find(i => i.id === selectedItemId);
      if (item) setClipboard({ type: 'item', data: { ...JSON.parse(JSON.stringify(item)), sourceTabId: activeTabId } });
    } else if (selectedWidgetId) {
      const widget = dashboardWidgets.find(w => w.id === selectedWidgetId);
      if (widget) setClipboard({ type: 'widget', data: { ...JSON.parse(JSON.stringify(widget)), sourceTabId: activeTabId } });
    }
  };

  const handlePaste = async () => {
    if (!clipboard) return;
    saveToHistory(); // Save current state before modifying
    const isSameTab = clipboard.data.sourceTabId === activeTabId;
    const offset = isSameTab ? 20 : 0;
    const newId = Math.random().toString(36).substr(2, 9);

    if (clipboard.type === 'item') {
      try {
        const originalChart = clipboard.data.chart;
        // Create an independent copy of the chart in the database
        const newChart = await api.charts.create({
          workspace_id: WORKSPACE_ID,
          dataset_id: originalChart.dataset_id,
          name: `${originalChart.name} (Copy)`,
          description: originalChart.description,
          chart_type: originalChart.chart_type,
          encodings: originalChart.encodings,
          echarts_option: originalChart.echarts_option,
          transform_config: originalChart.transform_config
        });

        const newItem = {
          ...clipboard.data,
          id: newId,
          chart: newChart,
          tabId: activeTabId,
          pos: { ...clipboard.data.pos, x: clipboard.data.pos.x + offset, y: clipboard.data.pos.y + offset }
        };
        setDashboardItems(prev => [...prev, newItem]);
        setSelectedItemId(newId);
        setSelectedWidgetId(null);
      } catch (err) {
        console.error("Failed to clone chart during paste", err);
      }
    } else {
      const newWidget = {
        ...clipboard.data,
        id: newId,
        tabId: activeTabId,
        pos: { ...clipboard.data.pos, x: clipboard.data.pos.x + offset, y: clipboard.data.pos.y + offset }
      };
      setDashboardWidgets(prev => [...prev, newWidget]);
      setSelectedWidgetId(newId);
      setSelectedItemId(null);
    }
  };

  const handleDeleteSelected = () => {
    if (selectedItemIds.length > 0 || selectedWidgetIds.length > 0) {
      saveToHistory();
      selectedItemIds.forEach(id => handleRemoveChartFromDashboard(id));
      selectedWidgetIds.forEach(id => handleRemoveWidget(id));
      setSelectedItemIds([]);
      setSelectedWidgetIds([]);
      setSelectedItemId(null);
      setSelectedWidgetId(null);
      return;
    }
    if (selectedItemId) {
      saveToHistory();
      handleRemoveChartFromDashboard(selectedItemId);
      setSelectedItemId(null);
      setSelectedItemIds([]);
    } else if (selectedWidgetId) {
      saveToHistory();
      handleRemoveWidget(selectedWidgetId);
      setSelectedWidgetId(null);
      setSelectedWidgetIds([]);
    }
  };

  const tabBoundingBox = useMemo(() => {
    const tabItems = dashboardItems.filter(i => (i.tabId || 'default') === activeTabId);
    const tabWidgets = dashboardWidgets.filter(w => (w.tabId || 'default') === activeTabId);
    const tabFrames = dashboardFrames.filter(f => (f.tabId || 'default') === activeTabId);

    if (layoutMode === 'slide') {
      const maxYVal = Math.max(
        720,
        ...tabItems.map(i => (i.pos?.y ?? 0) + (i.pos?.h ?? 360)),
        ...tabWidgets.map(w => (w.pos?.y ?? 0) + (w.pos?.h ?? 40)),
        ...tabFrames.map(f => (f.pos?.y ?? 0) + (f.pos?.h ?? 100))
      );
      return {
        minX: 0,
        minY: 0,
        maxX: 1280,
        maxY: maxYVal
      };
    }

    // If a main frame is specified, use its dimensions as the tab's bounding box
    if (mainFrameId) {
      const mainFrame = tabFrames.find(f => f.id === mainFrameId) || tabWidgets.find(w => w.id === mainFrameId);
      if (mainFrame) {
        return {
          minX: mainFrame.pos.x,
          minY: mainFrame.pos.y,
          maxX: mainFrame.pos.x + mainFrame.pos.w,
          maxY: mainFrame.pos.y + mainFrame.pos.h
        };
      }
    }

    if (tabItems.length === 0 && tabWidgets.length === 0 && tabFrames.length === 0) return { minX: 0, minY: 0, maxX: 0, maxY: 0 };

    const allRects = [
      ...tabItems.map(i => i.pos),
      ...tabWidgets.map(w => w.pos),
      ...tabFrames.map(f => f.pos)
    ].filter(p => p && typeof p.x === 'number' && typeof p.y === 'number');

    if (allRects.length === 0) return { minX: 0, minY: 0, maxX: 0, maxY: 0 };

    return {
      minX: Math.min(...allRects.map(r => r.x)),
      minY: Math.min(...allRects.map(r => r.y)),
      maxX: Math.max(...allRects.map(r => r.x + r.w)),
      maxY: Math.max(...allRects.map(r => r.y + r.h))
    };
  }, [dashboardItems, dashboardWidgets, dashboardFrames, activeTabId, mainFrameId, layoutMode]);


  const fitToContent = (padding = 80) => {
    if (!gridContainerRef.current) return;
    const { minX, minY, maxX, maxY } = tabBoundingBox;
    if (maxX === 0 && maxY === 0) {
      setZoom(1);
      setPan({ x: 0, y: 0 });
      return;
    }

    const bw = maxX - minX + padding;
    const bh = maxY - minY + padding;
    const rect = gridContainerRef.current.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return;

    // For Main Frame preview, we want to perfectly fill the viewport
    const fitZoom = (isPreviewMode && mainFrameId) 
      ? Math.min(rect.width / (maxX - minX), rect.height / (maxY - minY))
      : Math.min(Math.max(0.1, rect.width / bw), Math.max(0.1, rect.height / bh), 4);
    
    const fitPanX = (rect.width - (maxX - minX) * fitZoom) / 2 - minX * fitZoom;
    const fitPanY = (rect.height - (maxY - minY) * fitZoom) / 2 - minY * fitZoom;

    setZoom(fitZoom);
    setPan({ x: fitPanX, y: fitPanY });
  };

  useEffect(() => {
    if (isPreviewMode && layoutMode === 'whiteboard' && gridContainerRef.current) {
      const handleResize = () => fitToContent(0);
      window.addEventListener('resize', handleResize);
      
      const timer = setTimeout(() => {
        fitToContent(0); // 0px padding for full frame preview
      }, 100);
      
      return () => {
        window.removeEventListener('resize', handleResize);
        clearTimeout(timer);
      };
    }
  }, [isPreviewMode, layoutMode, dashboardItems.length, dashboardWidgets.length, dashboardFrames.length, activeTabId, mainFrameId, view]);

  const fitSlide = () => {
    if (!gridContainerRef.current) return;
    const rect = gridContainerRef.current.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return;

    const SLIDE_WIDTH = 1280;
    if (isPreviewMode) {
      // Preview mode: Zoom to fill the viewport width exactly, with no margins
      const newZoom = rect.width / SLIDE_WIDTH;
      setZoom(newZoom);
      setPan({ x: 0, y: 0 });
    } else {
      // Edit mode: Left margin 20px, Right margin 25px (total 45px margin)
      const marginLeft = 20;
      const marginRight = 25;
      const newZoom = rect.width / (SLIDE_WIDTH + marginLeft + marginRight);
      const panX = marginLeft * newZoom;
      setZoom(newZoom);
      setPan({ x: panX, y: 0 });
    }
  };

  useEffect(() => {
    if (layoutMode === 'slide' && gridContainerRef.current) {
      const handleResize = () => fitSlide();
      window.addEventListener('resize', handleResize);
      
      const timer = setTimeout(() => {
        fitSlide();
      }, 100);
      
      return () => {
        window.removeEventListener('resize', handleResize);
        clearTimeout(timer);
      };
    }
  }, [layoutMode, isPreviewMode, activeTabId, view, dashboardItems.length, dashboardWidgets.length, dashboardFrames.length, tabPosition, tabBarSize, isTabBarCollapsed, tabBarCollapseEnabled]);


  // Outside click listener to close custom dropdowns
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.custom-dropdown-container')) {
        setActiveDropdownWidgetId(null);
      }
    };
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  // Dashboard keyboard listeners (Spacebar for panning + Ctrl+C/V/Z + Delete)
  useEffect(() => {
    if (view !== 'edit-dashboard') return;
    const handleKeyDown = (e: KeyboardEvent) => {
      // Avoid conflicts with Monaco or inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || (e.target as HTMLElement).closest('.monaco-editor')) {
        return;
      }

      // Spacebar panning only for whiteboard mode
      if (layoutMode === 'whiteboard' && e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        setSpacePressed(true);
      }

      // Clipboard logic
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'c' || e.key === 'C') {
          handleCopy();
        } else if (e.key === 'v' || e.key === 'V') {
          handlePaste();
        } else if (e.key === 'z' || e.key === 'Z') {
          e.preventDefault();
          handleUndo();
        }
      }

      // Delete logic
      if (e.key === 'Delete' || e.key === 'Backspace') {
        // Only if not editing text
        if (editingWidgetId === null && editingTabId === null && !isEditingDashName) {
          handleDeleteSelected();
        }
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setSpacePressed(false);
        isPanningRef.current.active = false;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      setSpacePressed(false);
    };
  }, [view, layoutMode, selectedItemId, selectedWidgetId, selectedItemIds, selectedWidgetIds, dashboardItems, dashboardWidgets, clipboard, editingWidgetId, editingTabId, isEditingDashName]);

  // Wheel handler (Whiteboard or Slide+Ctrl)
  // In whiteboard + select mode:
  //   - Normal scroll        → pan up/down
  //   - Ctrl + scroll        → zoom in/out (anchored to cursor)
  //   - Shift + scroll       → pan left/right
  // In whiteboard + pan mode, or slide + Ctrl:
  //   - Always zooms (existing behaviour)
  const handleWheel = (e: React.WheelEvent) => {
    if (isPreviewMode && mainFrameId) return;

    const isWhiteboardSelect = layoutMode === 'whiteboard' && interactionMode === 'select';
    const isSlideCtrl = layoutMode === 'slide' && e.ctrlKey;

    if (!isWhiteboardSelect && !isSlideCtrl && layoutMode !== 'whiteboard') return;

    e.preventDefault();
    const rect = gridContainerRef.current?.getBoundingClientRect();
    if (!rect) return;

    // --- Whiteboard + Select tool: directional scroll ---
    if (isWhiteboardSelect) {
      if (e.ctrlKey) {
        // Ctrl + scroll → zoom (anchored to cursor)
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
        const newZoom = Math.min(4, Math.max(0.15, zoom * zoomFactor));
        const newPanX = mouseX - (mouseX - pan.x) * (newZoom / zoom);
        const newPanY = mouseY - (mouseY - pan.y) * (newZoom / zoom);
        setZoom(newZoom);
        setPan({ x: newPanX, y: newPanY });
      } else if (e.shiftKey) {
        // Shift + scroll → pan left/right
        const scrollSpeed = 1.5;
        setPan(prev => ({ ...prev, x: prev.x - e.deltaY * scrollSpeed }));
      } else {
        // Normal scroll → pan up/down
        const scrollSpeed = 1.5;
        setPan(prev => ({ ...prev, y: prev.y - e.deltaY * scrollSpeed }));
      }
      return;
    }

    // --- Whiteboard + Pan tool or Slide+Ctrl: always zoom ---
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
    const newZoom = Math.min(4, Math.max(0.15, zoom * zoomFactor));
    const newPanX = mouseX - (mouseX - pan.x) * (newZoom / zoom);
    const newPanY = mouseY - (mouseY - pan.y) * (newZoom / zoom);
    setZoom(newZoom);
    setPan({ x: newPanX, y: newPanY });
  };

  // Background panning & selection (click-drag on empty space, or spacebar+drag)
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (isPreviewMode && mainFrameId) return;

    const rect = gridContainerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = (e.clientX - rect.left - pan.x) / zoom;
    const y = (e.clientY - rect.top - pan.y) / zoom;

    // Deselect if clicking directly on canvas background
    if (e.target === e.currentTarget) {
      setSelectedItemId(null);
      setSelectedWidgetId(null);
      setSelectedItemIds([]);
      setSelectedWidgetIds([]);
    }

    // Only start panning if spacebar is held OR interactionMode is 'pan'
    if (spacePressed || interactionMode === 'pan') {
      e.preventDefault();
      isPanningRef.current = { active: true, startX: e.clientX, startY: e.clientY, startPanX: pan.x, startPanY: pan.y };
      const onMove = (ev: MouseEvent) => {
        if (!isPanningRef.current.active) return;
        const dx = ev.clientX - isPanningRef.current.startX;
        const dy = ev.clientY - isPanningRef.current.startY;
        setPan({ x: isPanningRef.current.startPanX + dx, y: isPanningRef.current.startPanY + dy });
      };
      const onUp = () => {
        isPanningRef.current.active = false;
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    } else if (interactionMode === 'select' && e.target === e.currentTarget) {
      // Marquee Selection Box
      e.preventDefault();
      setSelectionBox({ x1: x, y1: y, x2: x, y2: y });

      const onMove = (moveEvent: MouseEvent) => {
        const mx = (moveEvent.clientX - rect.left - pan.x) / zoom;
        const my = (moveEvent.clientY - rect.top - pan.y) / zoom;
        setSelectionBox(prev => prev ? { ...prev, x2: mx, y2: my } : null);

        // Find items in box
        const xMin = Math.min(x, mx);
        const yMin = Math.min(y, my);
        const xMax = Math.max(x, mx);
        const yMax = Math.max(y, my);

        const tabItems = dashboardItems.filter(i => (i.tabId || 'default') === activeTabId);
        const tabWidgets = dashboardWidgets.filter(w => (w.tabId || 'default') === activeTabId);

        const inBoxItems = tabItems.filter(i => 
          i.pos.x + i.pos.w >= xMin && i.pos.x <= xMax &&
          i.pos.y + i.pos.h >= yMin && i.pos.y <= yMax
        ).map(i => i.id);

        const inBoxWidgets = tabWidgets.filter(w => 
          w.pos.x + w.pos.w >= xMin && w.pos.x <= xMax &&
          w.pos.y + w.pos.h >= yMin && w.pos.y <= yMax
        ).map(w => w.id);

        setSelectedItemIds(inBoxItems);
        setSelectedWidgetIds(inBoxWidgets);

        // For properties panel
        if (inBoxItems.length > 0) {
          setSelectedItemId(inBoxItems[0]);
          setSelectedWidgetId(null);
        } else if (inBoxWidgets.length > 0) {
          setSelectedWidgetId(inBoxWidgets[0]);
          setSelectedItemId(null);
        }
      };

      const onUp = () => {
        setSelectionBox(null);
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      };

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    }
  };

  // Reset chart search query when Add Chart drawer opens/closes
  useEffect(() => {
    if (!showAddChart) {
      setChartSearchQuery("");
    }
  }, [showAddChart]);

  const loadHubData = async () => {
    try {
      setLoading(true);
      const [dashboardsData, chartsData, datasetsData] = await Promise.all([
        api.dashboards.list(WORKSPACE_ID),
        api.charts.list(WORKSPACE_ID),
        api.datasets.list(WORKSPACE_ID)
      ]);
      
      // Load ALL chart permissions so we can filter dashboards globally
      let globalPerms: Record<string, number[]> = {};
      const allChartIds = chartsData.map((c: any) => c.id);
      if (allChartIds.length > 0) {
        try {
          globalPerms = await api.permissions.getDashboardChartPermissions(allChartIds);
          setChartPermissions(globalPerms || {});
        } catch {
          setChartPermissions({});
        }
      } else {
        setChartPermissions({});
      }

      setDashboards(dashboardsData);
      setCharts(chartsData);
      setDatasets(datasetsData);
      if (datasetsData.length > 0 && !selectedDatasetId) {
        setSelectedDatasetId(datasetsData[0].id);
      }
      return { dashboardsData, chartsData, datasetsData };
    } catch (err) {
      console.error("Failed to load BI Hub data", err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Load Dataset Preview for Chart Builder
  useEffect(() => {
    if (selectedDatasetId && (view === "create-chart" || view === "edit-chart")) {
      loadChartDatasetPreview(selectedDatasetId);
    }
  }, [selectedDatasetId, view]);

  useEffect(() => {
    const areSomeOpen = showTemplateSettings || showAddChart || showAddElementDropdown || showAddFrameDropdown;
    if (!areSomeOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      // Template Settings
      if (showTemplateSettings && templateSettingsRef.current && !templateSettingsRef.current.contains(event.target as Node)) {
        setShowTemplateSettings(false);
      }
      // Add Chart
      if (showAddChart && addChartRef.current && !addChartRef.current.contains(event.target as Node)) {
        setShowAddChart(false);
      }
      // Add Element Dropdown
      if (showAddElementDropdown && addElementDropdownRef.current && !addElementDropdownRef.current.contains(event.target as Node)) {
        setShowAddElementDropdown(false);
      }
      // Add Frame Dropdown
      if (showAddFrameDropdown && addFrameDropdownRef.current && !addFrameDropdownRef.current.contains(event.target as Node)) {
        setShowAddFrameDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showTemplateSettings, showAddChart, showAddElementDropdown, showAddFrameDropdown]);

  const loadChartDatasetPreview = async (id: string) => {
    try {
      setDatasetPreview(null);
      const res = await fetch(`http://localhost:8000/api/v1/datasets/${id}/preview`, { method: "POST" });
      const data = await res.json();
      setDatasetPreview(data);
      if (data.columns && data.columns.length > 0) {
        // Auto-configure encodings only if we aren't editing a pre-loaded chart or encodings are empty
        if (!xEncoding) setXEncoding(data.columns[0].name);
        if (!yEncoding) setYEncoding(data.columns.length > 1 ? data.columns[1].name : data.columns[0].name);
      }
    } catch (err) {
      console.error("Failed to load dataset preview", err);
    }
  };

  // ==========================================
  // DASHBOARD ACTIONS
  // ==========================================
  const handleOpenDashboard = async (dashboard: any, urlOverrides?: { mainFrameId?: string | null, tabId?: string | null }) => {
    setSelectedDashboard(dashboard);
    setIsEditMode(false); // default to view mode for clean look

    const loadedFilters = dashboard.global_filters || [];
    setGlobalFilters(loadedFilters);

    const initialValues: Record<string, string> = {};
    loadedFilters.forEach((f: any) => {
      initialValues[f.id] = f.defaultValue || "";
    });
    setActiveFilterValues(initialValues);

    const configuredMainFrameId = urlOverrides?.mainFrameId !== undefined ? urlOverrides.mainFrameId : (dashboard.theme_config?.mainFrameId || null);

    // Load tabs
    const loadedTabs = dashboard.theme_config?.tabs || [{ id: 'default', name: 'Tab 1' }];
    setDashboardTabs(loadedTabs);
    const fallbackTabId = loadedTabs[0]?.id || 'default';
    
    let initialTabId = urlOverrides?.tabId || fallbackTabId;
    if (!urlOverrides?.tabId && isPreviewMode && configuredMainFrameId) {
      const target = (dashboard.theme_config?.frames || []).find((f: any) => f.id === configuredMainFrameId)
                  || (dashboard.widgets || []).find((w: any) => w.id === configuredMainFrameId);
      if (target && target.tabId) {
        initialTabId = target.tabId;
      }
    }
    handleSelectTab(initialTabId);
    setTabPosition(dashboard.theme_config?.tabPosition || "top");
    setTabBarCollapseEnabled(dashboard.theme_config?.tabBarCollapseEnabled ?? false);
    setIsTabBarCollapsed(false);
    setTabBarPinned(dashboard.theme_config?.tabBarPinned ?? false);
    setTabBarSize(dashboard.theme_config?.tabBarSize || (dashboard.theme_config?.tabPosition === 'left' || dashboard.theme_config?.tabPosition === 'right' ? 200 : 64));
    setCustomTabRect(dashboard.theme_config?.customTabRect || { x: 40, y: 40, w: 400, h: 60 });
    setLayoutMode(dashboard.theme_config?.layoutMode || 'slide');
    setZoom(dashboard.theme_config?.zoom || 1);
    setPan(dashboard.theme_config?.pan || { x: 0, y: 0 });
    setDashboardFrames(dashboard.theme_config?.frames || []);
    setMainFrameId(configuredMainFrameId);
    setTabFrameId(dashboard.theme_config?.tabFrameId || null);
    setTabFramePosition(dashboard.theme_config?.tabFramePosition || 'top');
    setTabBorderRadius(dashboard.theme_config?.tabBorderRadius ?? 12);
    setTabOpacity(dashboard.theme_config?.tabOpacity ?? 1);
    setTabBarStyle(dashboard.theme_config?.tabBarStyle ?? "pills");
    setTabFontSize(dashboard.theme_config?.tabFontSize ?? 12);
    setTabFontWeight(dashboard.theme_config?.tabFontWeight ?? "semibold");
    setTabPaddingX(dashboard.theme_config?.tabPaddingX ?? 18);
    setTabPaddingY(dashboard.theme_config?.tabPaddingY ?? 8);
    setTabGap(dashboard.theme_config?.tabGap ?? 8);
    setTabAlign(dashboard.theme_config?.tabAlign ?? "start");
    setTabActiveColor(dashboard.theme_config?.tabActiveColor ?? "var(--color-orange-500)");
    setTabBgColor(dashboard.theme_config?.tabBgColor ?? "#ffffff");
    setTabBorderColor(dashboard.theme_config?.tabBorderColor ?? "#ffffff");
    setTabBarBgColor(dashboard.theme_config?.tabBarBgColor ?? "transparent");
    setTabBarBorderColor(dashboard.theme_config?.tabBarBorderColor ?? "transparent");

    const newItems: any[] = [];

    setLoading(true);
    try {
      const chartsList = charts.length > 0 ? charts : await api.charts.list(WORKSPACE_ID);
      const items = dashboard.items || [];

      // Auto-layout offset for items without valid pixel positions
      let autoX = 20, autoY = 20;

      for (const item of items) {
        let chart = chartsList.find((c: any) => c.id === item.chart_id);
        if (!chart) {
          try {
            const list = await api.charts.list(WORKSPACE_ID);
            chart = list.find((c: any) => c.id === item.chart_id);
          } catch {
            chart = null;
          }
        }

        let data: any[] = [];
        if (chart) {
          data = await fetchDatasetPreview(chart.dataset_id);
        }

        // Convert legacy grid coords (w < 50 = grid units) to pixel positions
        const isLegacy = item.w < 50;
        const pos = isLegacy
          ? { x: autoX, y: autoY, w: 520, h: 360 }
          : { x: item.x ?? autoX, y: item.y ?? autoY, w: item.w ?? 520, h: item.h ?? 360 };
        if (isLegacy) { autoX += 540; if (autoX > 900) { autoX = 20; autoY += 380; } }

        newItems.push({
          id: item.id,
          chart,
          data,
          pos,
          hideHeader: item.config?.hideHeader ?? false,
          zIndex: item.config?.zIndex ?? 1,
          tabId: item.config?.tabId || fallbackTabId
        });
      }

      setDashboardItems(newItems);

      const loadedWidgets = (dashboard.widgets || []).map((w: any) => ({
        ...w,
        tabId: w.tabId || fallbackTabId
      }));
      setDashboardWidgets(loadedWidgets);

      // Load chart permissions for this dashboard
      const chartIdsToLoad = newItems
        .filter(i => i.chart?.id)
        .map(i => i.chart.id);
      if (chartIdsToLoad.length > 0) {
        try {
          const permData = await api.permissions.getDashboardChartPermissions(chartIdsToLoad);
          setChartPermissions(permData || {});
        } catch {
          setChartPermissions({});
        }
      } else {
        setChartPermissions({});
      }

      setView("edit-dashboard");
    } catch (err) {
      console.error(err);
      alert("Failed to load dashboard details");
    } finally {
      setLoading(false);
    }
  };

  const fetchDatasetPreview = async (datasetId: string) => {
    try {
      const res = await fetch(`http://localhost:8000/api/v1/datasets/${datasetId}/preview`, { method: "POST" });
      const data = await res.json();
      return data.rows || [];
    } catch (err) {
      console.error("Failed to fetch data for dataset", datasetId);
      return [];
    }
  };

  const handleCreateDashboard = async () => {
    if (!newDashName.trim()) {
      alert("Please enter a dashboard name");
      return;
    }
    try {
      const newDash = await api.dashboards.create({
        workspace_id: WORKSPACE_ID,
        name: newDashName,
        description: newDashDesc,
        global_filters: []
      });
      setShowCreateDashModal(false);
      setNewDashName("");
      setNewDashDesc("");

      // Reload lists and edit the newly created dashboard
      await loadHubData();
      handleOpenDashboard(newDash);
    } catch (err) {
      console.error(err);
      alert("Failed to create dashboard");
    }
  };

  const handleDeleteDashboard = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this dashboard?")) return;
    try {
      await api.dashboards.delete(id);
      setDashboards(prev => prev.filter(d => d.id !== id));
    } catch (err) {
      console.error(err);
      alert("Failed to delete dashboard");
    }
  };

  const handleSaveDashboard = async () => {
    if (!selectedDashboard) return;
    try {
      const itemsPayload = dashboardItems.map(item => ({
        chart_id: item.chart.id,
        x: Math.round(item.pos.x),
        y: Math.round(item.pos.y),
        w: Math.round(item.pos.w),
        h: Math.round(item.pos.h),
        config: {
          hideHeader: item.hideHeader,
          zIndex: item.zIndex,
          tabId: item.tabId || 'default'
        }
      }));
      const updated = await api.dashboards.update(selectedDashboard.id, {
        name: selectedDashboard.name,
        description: selectedDashboard.description,
        items: itemsPayload,
        widgets: dashboardWidgets,
        global_filters: globalFilters,
        theme_config: {
          ...(selectedDashboard.theme_config || {}),
          tabs: dashboardTabs,
          tabPosition: tabPosition,
          tabBarSize: tabBarSize,
          customTabRect: customTabRect,
          layoutMode: layoutMode,
          zoom: zoom,
          pan: pan,
          frames: dashboardFrames,
          mainFrameId: mainFrameId,
          tabFrameId: tabFrameId,
          tabFramePosition: tabFramePosition,
          tabBorderRadius: tabBorderRadius,
          tabOpacity: tabOpacity,
          tabBarStyle: tabBarStyle,
          tabFontSize: tabFontSize,
          tabFontWeight: tabFontWeight,
          tabPaddingX: tabPaddingX,
          tabPaddingY: tabPaddingY,
          tabGap: tabGap,
          tabAlign: tabAlign,
          tabActiveColor: tabActiveColor,
          tabBgColor: tabBgColor,
          tabBorderColor: tabBorderColor,
          tabBarBgColor: tabBarBgColor,
          tabBarBorderColor: tabBarBorderColor,
          tabBarCollapseEnabled: tabBarCollapseEnabled,
          tabBarPinned: tabBarPinned
        }
      });
      setSelectedDashboard(updated);
      alert("Dashboard saved successfully!");
      loadHubData();
    } catch (err) {
      console.error(err);
      alert("Failed to save dashboard");
    }
  };

  // ============================================================
  // FREE-FORM DRAG + RESIZE
  // ============================================================
  const startDrag = (e: React.MouseEvent, itemId: string) => {
    if (!isEditMode) return;
    saveToHistory();

    // If item is not in selection, select only it. Otherwise, move the whole selection.
    let currentItemIds = selectedItemIds;
    let currentWidgetIds = selectedWidgetIds;

    if (!selectedItemIds.includes(itemId)) {
      setSelectedItemId(itemId);
      setSelectedItemIds([itemId]);
      setSelectedWidgetId(null);
      setSelectedWidgetIds([]);
      currentItemIds = [itemId];
      currentWidgetIds = [];
    }

    e.preventDefault();
    e.stopPropagation();
    const item = dashboardItems.find(i => i.id === itemId);
    if (!item) return;

    // Capture initial positions of all selected items
    const initialPositions: { id: string, x: number, y: number, type: 'item' | 'widget' | 'frame' }[] = [
      ...dashboardItems.filter(i => currentItemIds.includes(i.id)).map(i => ({ id: i.id, x: i.pos.x, y: i.pos.y, type: 'item' as const })),
      ...dashboardWidgets.filter(w => currentWidgetIds.includes(w.id)).map(w => ({ id: w.id, x: w.pos.x, y: w.pos.y, type: 'widget' as const }))
    ];

    interactionRef.current = {
      type: 'drag', itemId, handle: '',
      startMouseX: e.clientX, startMouseY: e.clientY,
      startX: item.pos.x, startY: item.pos.y,
      startW: item.pos.w, startH: item.pos.h,
      initialPositions
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  const startResize = (e: React.MouseEvent, itemId: string, handle: string) => {
    if (!isEditMode) return;
    saveToHistory();
    setSelectedItemId(itemId);
    setSelectedItemIds([itemId]);
    setSelectedWidgetId(null);
    setSelectedWidgetIds([]);
    e.preventDefault();
    e.stopPropagation();
    const item = dashboardItems.find(i => i.id === itemId);
    if (!item) return;
    interactionRef.current = {
      type: 'resize', itemId, handle,
      startMouseX: e.clientX, startMouseY: e.clientY,
      startX: item.pos.x, startY: item.pos.y,
      startW: item.pos.w, startH: item.pos.h,
      initialPositions: []
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  const calculateSnapping = (currentPos: { x: number, y: number, w: number, h: number }, excludeIds: string[]) => {
    const guides: { x?: number, y?: number, type: 'h' | 'v' }[] = [];
    let snappedX = currentPos.x;
    let snappedY = currentPos.y;

    const others = [
      ...dashboardItems.filter(i => !excludeIds.includes(i.id) && (i.tabId || 'default') === activeTabId).map(i => i.pos),
      ...dashboardWidgets.filter(w => !excludeIds.includes(w.id) && (w.tabId || 'default') === activeTabId).map(w => w.pos),
      ...dashboardFrames.filter(f => !excludeIds.includes(f.id) && (f.tabId || 'default') === activeTabId).map(f => ({ ...f.pos }))
    ];

    // Add screen/canvas center target values
    const screenTargetsX: number[] = [];
    const screenTargetsY: number[] = [];
    if (layoutMode === 'slide') {
      screenTargetsX.push(640); // 1280 / 2
      screenTargetsY.push(360); // 720 / 2
    } else if (mainFrameId) {
      const frame = dashboardFrames.find(f => f.id === mainFrameId);
      if (frame) {
        screenTargetsX.push(frame.pos.x + frame.pos.w / 2);
        screenTargetsY.push(frame.pos.y + frame.pos.h / 2);
      }
    }

    const currentRight = currentPos.x + currentPos.w;
    const currentBottom = currentPos.y + currentPos.h;
    const currentCenterX = currentPos.x + currentPos.w / 2;
    const currentCenterY = currentPos.y + currentPos.h / 2;

    let closestDeltaX = SNAP_THRESHOLD;
    let closestDeltaY = SNAP_THRESHOLD;

    // Collect candidate targets
    const xTargets: { val: number; source: string }[] = [];
    const yTargets: { val: number; source: string }[] = [];

    screenTargetsX.forEach(val => xTargets.push({ val, source: 'screen' }));
    screenTargetsY.forEach(val => yTargets.push({ val, source: 'screen' }));

    for (const other of others) {
      const otherRight = other.x + other.w;
      const otherCenterX = other.x + other.w / 2;
      xTargets.push({ val: other.x, source: 'other' });
      xTargets.push({ val: otherRight, source: 'other' });
      xTargets.push({ val: otherCenterX, source: 'other' });

      const otherBottom = other.y + other.h;
      const otherCenterY = other.y + other.h / 2;
      yTargets.push({ val: other.y, source: 'other' });
      yTargets.push({ val: otherBottom, source: 'other' });
      yTargets.push({ val: otherCenterY, source: 'other' });
    }

    // Snapping for X axis
    xTargets.forEach(t => {
      const deltas = [
        { delta: currentPos.x - t.val, snapVal: t.val },
        { delta: currentRight - t.val, snapVal: t.val - currentPos.w },
        { delta: currentCenterX - t.val, snapVal: t.val - currentPos.w / 2 }
      ];
      deltas.forEach(d => {
        if (Math.abs(d.delta) < Math.abs(closestDeltaX)) {
          closestDeltaX = d.delta;
          snappedX = d.snapVal;
        }
      });
    });

    // Snapping for Y axis
    yTargets.forEach(t => {
      const deltas = [
        { delta: currentPos.y - t.val, snapVal: t.val },
        { delta: currentBottom - t.val, snapVal: t.val - currentPos.h },
        { delta: currentCenterY - t.val, snapVal: t.val - currentPos.h / 2 }
      ];
      deltas.forEach(d => {
        if (Math.abs(d.delta) < Math.abs(closestDeltaY)) {
          closestDeltaY = d.delta;
          snappedY = d.snapVal;
        }
      });
    });

    // Now find all targets matching final snapped coords
    const finalRight = snappedX + currentPos.w;
    const finalCenterX = snappedX + currentPos.w / 2;

    xTargets.forEach(t => {
      if (
        Math.abs(snappedX - t.val) < 0.1 ||
        Math.abs(finalRight - t.val) < 0.1 ||
        Math.abs(finalCenterX - t.val) < 0.1
      ) {
        if (!guides.some(g => g.x === t.val)) {
          guides.push({ x: t.val, type: 'v' });
        }
      }
    });

    const finalBottom = snappedY + currentPos.h;
    const finalCenterY = snappedY + currentPos.h / 2;

    yTargets.forEach(t => {
      if (
        Math.abs(snappedY - t.val) < 0.1 ||
        Math.abs(finalBottom - t.val) < 0.1 ||
        Math.abs(finalCenterY - t.val) < 0.1
      ) {
        if (!guides.some(g => g.y === t.val)) {
          guides.push({ y: t.val, type: 'h' });
        }
      }
    });

    return { snappedX, snappedY, guides };
  };

  const onMouseMove = (e: MouseEvent) => {
    const s = interactionRef.current;
    if (!s.type || !s.itemId) return;
    const z = zoomRef.current;
    const dx = ((e.clientX - s.startMouseX) / z) * 1.15;
    const dy = ((e.clientY - s.startMouseY) / z) * 1.15;

    if (s.type === 'drag') {
      if (s.initialPositions.length > 0) {
        const primaryInit = s.initialPositions.find(p => p.id === s.itemId);
        if (!primaryInit) return;

        const rawX = primaryInit.x + dx;
        const rawY = primaryInit.y + dy;

        const { snappedX, snappedY, guides } = calculateSnapping(
          { x: rawX, y: rawY, w: s.startW, h: s.startH },
          s.initialPositions.map(p => p.id)
        );

        setAlignmentGuides(guides);
        const finalDx = snappedX - primaryInit.x;
        const finalDy = snappedY - primaryInit.y;

        setDashboardItems(prev => prev.map(item => {
          const init = s.initialPositions.find(p => p.id === item.id && p.type === 'item');
          if (!init) return item;
          return { ...item, pos: { ...item.pos, x: Math.max(0, init.x + finalDx), y: Math.max(0, init.y + finalDy) } };
        }));
        setDashboardWidgets(prev => prev.map(w => {
          const init = s.initialPositions.find(p => p.id === w.id && p.type === 'widget');
          if (!init) return w;
          return { ...w, pos: { ...w.pos, x: Math.max(0, init.x + finalDx), y: Math.max(0, init.y + finalDy) } };
        }));
        setDashboardFrames(prev => prev.map(f => {
          const init = s.initialPositions.find(p => p.id === f.id && p.type === 'frame');
          if (!init) return f;
          return { ...f, pos: { ...f.pos, x: Math.max(0, init.x + finalDx), y: Math.max(0, init.y + finalDy) } };
        }));
      } else {
        const rawX = s.startX + dx;
        const rawY = s.startY + dy;
        const { snappedX, snappedY, guides } = calculateSnapping({ x: rawX, y: rawY, w: s.startW, h: s.startH }, [s.itemId as string]);
        setAlignmentGuides(guides);

        setDashboardItems(prev => prev.map(item => {
          if (item.id !== s.itemId) return item;
          return { ...item, pos: { ...item.pos, x: Math.max(0, snappedX), y: Math.max(0, snappedY) } };
        }));
      }
      return;
    }

    // resize — handle determines which edges move
    if (s.type === 'resize') {
      setDashboardItems(prev => prev.map(item => {
        if (item.id !== s.itemId) return item;
        let { x, y, w, h } = { x: s.startX, y: s.startY, w: s.startW, h: s.startH };
        const MIN_W = 220, MIN_H = 160;
        if (s.handle.includes('e')) w = Math.max(MIN_W, s.startW + dx);
        if (s.handle.includes('s')) h = Math.max(MIN_H, s.startH + dy);
        if (s.handle.includes('w')) {
          const newW = Math.max(MIN_W, s.startW - dx);
          x = s.startX + (s.startW - newW);
          w = newW;
        }
        if (s.handle.includes('n')) {
          const newH = Math.max(MIN_H, s.startH - dy);
          y = s.startY + (s.startH - newH);
          h = newH;
        }

        const { snappedX, snappedY, guides } = calculateSnapping({ x, y, w, h }, [s.itemId as string]);
        setAlignmentGuides(guides);

        if (s.handle.includes('e')) w = snappedX + w - x;
        if (s.handle.includes('s')) h = snappedY + h - y;
        if (s.handle.includes('w')) { w = w + (x - snappedX); x = snappedX; }
        if (s.handle.includes('n')) { h = h + (y - snappedY); y = snappedY; }

        return { ...item, pos: { x, y, w, h } };
      }));
    }
  };

  const onMouseUp = () => {
    interactionRef.current.type = null;
    setAlignmentGuides([]);
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
  };

  const handleAddChartToDashboard = async (chart: any, dropX?: number, dropY?: number) => {
    saveToHistory();
    const newId = Math.random().toString(36).substr(2, 9);

    // Calculate pixel position
    let posX = 20 + (dashboardItems.length % 3) * 540;
    let posY = 20 + Math.floor(dashboardItems.length / 3) * 380;

    if (layoutMode === 'whiteboard' && gridContainerRef.current) {
      const rect = gridContainerRef.current.getBoundingClientRect();
      if (dropX !== undefined && dropY !== undefined) {
        posX = (dropX - rect.left - pan.x) / zoom - 260;
        posY = (dropY - rect.top - pan.y) / zoom - 180;
      } else {
        // Place in center of current viewport
        const viewCenterX = rect.width / 2;
        const viewCenterY = rect.height / 2;
        posX = (viewCenterX - pan.x) / zoom - 260;
        posY = (viewCenterY - pan.y) / zoom - 180;
      }
    } else if (dropX !== undefined && dropY !== undefined && gridContainerRef.current) {
      const rect = gridContainerRef.current.getBoundingClientRect();
      posX = Math.max(0, dropX - rect.left - 260); // center the 520px card on cursor
      posY = Math.max(0, dropY - rect.top - 20);
    }

    const pos = { x: posX, y: posY, w: 520, h: 360 };
    const data = await fetchDatasetPreview(chart.dataset_id);
    setDashboardItems(prev => [...prev, { id: newId, chart, data, pos, hideHeader: false, zIndex: 1, tabId: activeTabId }]);
    setShowAddChart(false);
    setDraggedChart(null);
  };

  const handleGridDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!draggedChart) return;
    await handleAddChartToDashboard(draggedChart, e.clientX, e.clientY);
  };

  const handleRemoveChartFromDashboard = (id: string) => {
    setDashboardItems(prev => prev.filter(i => i.id !== id));
  };

  const handleRemoveWidget = (id: string) => {
    setDashboardWidgets(prev => prev.filter(w => w.id !== id));
    if (stylingWidgetId === id) {
      setShowWidgetStyleModal(false);
      setStylingWidgetId(null);
    }
  };

  const FRAME_SIZES = [
    { name: 'Custom', w: 800, h: 600 },
    { name: 'A4 Portrait', w: 794, h: 1123 },
    { name: 'A4 Landscape', w: 1123, h: 794 },
    { name: 'Mobile (iPhone 14)', w: 390, h: 844 },
    { name: 'iPad Air', w: 820, h: 1180 },
    { name: 'Desktop HD', w: 1280, h: 720 },
    { name: 'Desktop Full HD', w: 1920, h: 1080 },
    { name: 'Website Viewport', w: 1440, h: 900 },
  ];

  const handleAddFrame = (size: { name: string, w: number, h: number }) => {
    saveToHistory();
    const id = Math.random().toString(36).substr(2, 9);
    const rect = gridContainerRef.current?.getBoundingClientRect();
    let x = 100, y = 100;
    if (rect) {
      x = (rect.width / 2 - pan.x) / zoom - size.w / 2;
      y = (rect.height / 2 - pan.y) / zoom - size.h / 2;
    }

    const newFrame: DashboardFrame = {
      id,
      name: size.name,
      pos: { x, y, w: size.w, h: size.h },
      tabId: activeTabId,
    };

    setDashboardFrames(prev => [...prev, newFrame]);
    setShowAddFrameDropdown(false);
  };

  const startFrameResize = (e: React.MouseEvent, frameId: string) => {
    if (!isEditMode) return;
    saveToHistory();
    e.preventDefault();
    e.stopPropagation();
    const frame = dashboardFrames.find(f => f.id === frameId);
    if (!frame) return;
    
    const isCustom = frame.name === 'Custom';
    const aspectRatio = frame.pos.w / frame.pos.h;

    interactionRef.current = {
      type: 'resize', itemId: `frame:${frameId}`, handle: 'se',
      startMouseX: e.clientX, startMouseY: e.clientY,
      startX: frame.pos.x, startY: frame.pos.y,
      startW: frame.pos.w, startH: frame.pos.h,
      initialPositions: []
    };
    const onMove = (ev: MouseEvent) => {
      const s = interactionRef.current;
      if (s.type !== 'resize' || !s.itemId?.startsWith('frame:')) return;
      const fId = s.itemId.replace('frame:', '');
      const z = zoomRef.current;
      const dx = (ev.clientX - s.startMouseX) / z;
      const dy = (ev.clientY - s.startMouseY) / z;
      
      setDashboardFrames(prev => prev.map(f => {
        if (f.id !== fId) return f;
        
        let newW, newH;
        if (isCustom) {
          newW = Math.max(100, s.startW + dx);
          newH = Math.max(100, s.startH + dy);
        } else {
          // Lock aspect ratio: use the larger relative delta
          const deltaW = dx;
          const deltaH = dy * aspectRatio;
          const delta = Math.abs(deltaW) > Math.abs(deltaH) ? deltaW : deltaH;
          
          newW = Math.max(100, s.startW + delta);
          newH = newW / aspectRatio;
        }
        
        return { ...f, pos: { ...f.pos, w: newW, h: newH } };
      }));
    };
    const onUp = () => {
      interactionRef.current.type = null;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  const startFrameDrag = (e: React.MouseEvent, frameId: string) => {
    if (!isEditMode) return;
    saveToHistory();
    setSelectedItemId(null);
    setSelectedWidgetId(null);
    setSelectedItemIds([]);
    setSelectedWidgetIds([]);
    e.preventDefault();
    e.stopPropagation();
    const frame = dashboardFrames.find(f => f.id === frameId);
    if (!frame) return;
    interactionRef.current = {
      type: 'drag', itemId: `frame:${frameId}`, handle: '',
      startMouseX: e.clientX, startMouseY: e.clientY,
      startX: frame.pos.x, startY: frame.pos.y,
      startW: frame.pos.w, startH: frame.pos.h,
      initialPositions: []
    };
    const onMove = (ev: MouseEvent) => {
      const s = interactionRef.current;
      if (!s.type || !s.itemId?.startsWith('frame:')) return;
      const fId = s.itemId.replace('frame:', '');
      const z = zoomRef.current;
      const dx = (ev.clientX - s.startMouseX) / z;
      const dy = (ev.clientY - s.startMouseY) / z;
      setDashboardFrames(prev => prev.map(f => f.id !== fId ? f : {
        ...f, pos: { ...f.pos, x: s.startX + dx, y: s.startY + dy }
      }));
    };
    const onUp = () => {
      interactionRef.current.type = null;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  const handleDeleteFrame = (id: string) => {
    saveToHistory();
    setDashboardFrames(prev => prev.filter(f => f.id !== id));
    if (mainFrameId === id) setMainFrameId(null);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const src = event.target?.result as string;

      // If we are currently styling a widget and it's an image, replace its src
      if (showWidgetStyleModal && stylingWidgetId) {
        setDashboardWidgets(prev => prev.map(w => w.id === stylingWidgetId ? { ...w, src } : w));
      } else {
        // Otherwise, add a new image widget
        const id = Math.random().toString(36).substr(2, 9);
        const offset = (dashboardWidgets.length % 5) * 20;

        const widget: DashboardWidget = {
          id,
          itemType: 'image',
          src,
          objectFit: 'contain',
          pos: { x: 40 + offset, y: 40 + offset, w: 200, h: 200 },
          zIndex: 1,
          borderStyle: 'none',
          borderWidth: 0,
          borderRadius: 0,
          bgColor: 'transparent',
          borderColor: 'transparent',
          tabId: activeTabId
        };

        setDashboardWidgets(prev => [...prev, widget]);
      }

      setShowAddElementDropdown(false);
      // Reset input
      if (widgetImageInputRef.current) widgetImageInputRef.current.value = '';
    };
    reader.readAsDataURL(file);
  };

  const addWidget = (type: WidgetType) => {
    if (type === 'image') {
      widgetImageInputRef.current?.click();
      return;
    }
    saveToHistory();

    const id = Math.random().toString(36).substr(2, 9);
    const offset = (dashboardWidgets.length % 5) * 20;

    let baseX = 20 + offset;
    let baseY = 20 + offset;
    let isWhiteboard = layoutMode === 'whiteboard' && gridContainerRef.current;

    if (isWhiteboard && gridContainerRef.current) {
      const rect = gridContainerRef.current.getBoundingClientRect();
      baseX = (rect.width / 2 - pan.x) / zoom;
      baseY = (rect.height / 2 - pan.y) / zoom;
    }

    const defaults: Record<WidgetType, Partial<DashboardWidget>> = {
      heading: {
        text: 'Section Header',
        pos: isWhiteboard
          ? { x: baseX - 200 + offset, y: baseY - 30 + offset, w: 400, h: 60 }
          : { x: 20 + offset, y: 20 + offset, w: 400, h: 60 },
        bgColor: 'transparent',
        borderColor: 'transparent',
        fontSize: 24,
        fontWeight: '800',
        textAlign: 'left',
        color: 'var(--color-neutral-50)'
      },
      text: {
        text: 'Double-click to edit text...',
        pos: isWhiteboard
          ? { x: baseX - 170 + offset, y: baseY - 60 + offset, w: 340, h: 120 }
          : { x: 20 + offset, y: 100 + offset, w: 340, h: 120 },
        bgColor: 'var(--color-neutral-900)',
        borderColor: 'var(--color-neutral-800)',
        fontSize: 14,
        fontWeight: '400',
        textAlign: 'left',
        color: 'var(--color-neutral-300)',
        borderStyle: 'solid',
        borderWidth: 2,
        borderRadius: 8
      },
      rectangle: {
        pos: isWhiteboard
          ? { x: baseX - 140 + offset, y: baseY - 90 + offset, w: 280, h: 180 }
          : { x: 60 + offset, y: 60 + offset, w: 280, h: 180 },
        bgColor: 'rgba(99,102,241,0.08)',
        borderColor: 'rgba(99,102,241,0.4)',
        borderRadius: 12,
        borderStyle: 'solid',
        borderWidth: 2
      },
      circle: {
        pos: isWhiteboard
          ? { x: baseX - 80 + offset, y: baseY - 80 + offset, w: 160, h: 160 }
          : { x: 80 + offset, y: 80 + offset, w: 160, h: 160 },
        bgColor: 'rgba(249,115,22,0.08)',
        borderColor: 'rgba(249,115,22,0.4)',
        borderRadius: 9999,
        borderStyle: 'solid',
        borderWidth: 2
      },
      divider: {
        pos: isWhiteboard
          ? { x: baseX - 300 + offset, y: baseY + offset, w: 600, h: 2 }
          : { x: 20 + offset, y: 50 + offset, w: 600, h: 2 },
        bgColor: 'var(--color-neutral-800)',
        borderColor: 'transparent',
        borderStyle: 'solid',
        borderWidth: 0
      },
      image: {
        pos: isWhiteboard
          ? { x: baseX - 100 + offset, y: baseY - 100 + offset, w: 200, h: 200 }
          : { x: 20 + offset, y: 20 + offset, w: 200, h: 200 },
        src: '',
        objectFit: 'cover'
      },
      filter: {
        pos: isWhiteboard
          ? { x: baseX - 120 + offset, y: baseY - 40 + offset, w: 240, h: 80 }
          : { x: 20 + offset, y: 20 + offset, w: 240, h: 80 },
        bgColor: 'var(--color-neutral-900)',
        borderColor: 'var(--color-neutral-800)',
        borderStyle: 'solid',
        borderWidth: 1,
        borderRadius: 12,
        filterType: 'dropdown',
        filterColumn: '',
        activeValue: '',
        filterOrientation: 'vertical',
        controlWidth: '100%',
        zIndex: 20
      },
      code: {
        pos: isWhiteboard
          ? { x: baseX - 200 + offset, y: baseY - 100 + offset, w: 400, h: 200 }
          : { x: 20 + offset, y: 20 + offset, w: 400, h: 200 },
        bgColor: 'rgba(30,30,40,0.8)',
        borderColor: 'rgba(249,115,22,0.4)',
        borderStyle: 'solid',
        borderWidth: 1,
        borderRadius: 12,
        code: `// DOM element of this widget can be accessed via:
// document.getElementById('widget-{{id}}')

const element = document.getElementById('widget-{{id}}');
if (element) {
  element.style.display = 'flex';
  element.style.alignItems = 'center';
  element.style.justifyContent = 'center';
  element.innerHTML = '<div style="color: #f97316; font-weight: bold;">Custom JS Running...</div>';
  
  // You can also interact with other elements or add event listeners
  console.log('Widget {{id}} initialized');
}`
      }
    };
    const widget: DashboardWidget = { id, itemType: type, ...defaults[type], zIndex: 1, tabId: activeTabId } as DashboardWidget;
    setDashboardWidgets(prev => [...prev, widget]);
    setShowAddElementDropdown(false);
  };

  const startWidgetDrag = (e: React.MouseEvent, widgetId: string) => {
    if (!isEditMode) return;
    saveToHistory();

    // If widget is not in selection, select only it. Otherwise, move the whole selection.
    let currentItemIds = selectedItemIds;
    let currentWidgetIds = selectedWidgetIds;

    if (!selectedWidgetIds.includes(widgetId)) {
      setSelectedWidgetId(widgetId);
      setSelectedWidgetIds([widgetId]);
      setSelectedItemId(null);
      setSelectedItemIds([]);
      currentItemIds = [];
      currentWidgetIds = [widgetId];
    }

    e.preventDefault();
    e.stopPropagation();
    const widget = dashboardWidgets.find(w => w.id === widgetId);
    if (!widget) return;

    // Capture initial positions of all selected items
    const initialPositions: { id: string, x: number, y: number, type: 'item' | 'widget' | 'frame' }[] = [
      ...dashboardItems.filter(i => currentItemIds.includes(i.id)).map(i => ({ id: i.id, x: i.pos.x, y: i.pos.y, type: 'item' as const })),
      ...dashboardWidgets.filter(w => currentWidgetIds.includes(w.id)).map(w => ({ id: w.id, x: w.pos.x, y: w.pos.y, type: 'widget' as const }))
    ];

    interactionRef.current = {
      type: 'drag', itemId: `widget:${widgetId}`, handle: '',
      startMouseX: e.clientX, startMouseY: e.clientY,
      startX: widget.pos.x, startY: widget.pos.y,
      startW: widget.pos.w, startH: widget.pos.h,
      initialPositions
    };
    const onMove = (ev: MouseEvent) => {
      const s = interactionRef.current;
      if (!s.type || !s.itemId?.startsWith('widget:')) return;
      const wId = s.itemId.replace('widget:', '');
      const z = zoomRef.current;
      const dx = ((ev.clientX - s.startMouseX) / z) * 1.15;
      const dy = ((ev.clientY - s.startMouseY) / z) * 1.15;

      if (s.initialPositions.length > 0) {
        setDashboardItems(prev => prev.map(item => {
          const init = s.initialPositions.find(p => p.id === item.id && p.type === 'item');
          if (!init) return item;
          return { ...item, pos: { ...item.pos, x: Math.max(0, init.x + dx), y: Math.max(0, init.y + dy) } };
        }));
        setDashboardWidgets(prev => prev.map(w => {
          const init = s.initialPositions.find(p => p.id === w.id && p.type === 'widget');
          if (!init) return w;
          return { ...w, pos: { ...w.pos, x: Math.max(0, init.x + dx), y: Math.max(0, init.y + dy) } };
        }));
      } else {
        setDashboardWidgets(prev => prev.map(w => w.id !== wId ? w : {
          ...w, pos: { ...w.pos, x: Math.max(0, s.startX + dx), y: Math.max(0, s.startY + dy) }
        }));
      }
    };
    const onUp = () => {
      interactionRef.current.type = null;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  const startWidgetResize = (e: React.MouseEvent, widgetId: string, handle: string) => {
    if (!isEditMode) return;
    saveToHistory();
    setSelectedWidgetId(widgetId);
    setSelectedWidgetIds([widgetId]);
    setSelectedItemId(null);
    setSelectedItemIds([]);
    e.preventDefault();
    e.stopPropagation();
    const widget = dashboardWidgets.find(w => w.id === widgetId);
    if (!widget) return;
    interactionRef.current = {
      type: 'resize', itemId: `widget:${widgetId}`, handle,
      startMouseX: e.clientX, startMouseY: e.clientY,
      startX: widget.pos.x, startY: widget.pos.y,
      startW: widget.pos.w, startH: widget.pos.h,
      initialPositions: []
    };
    const onMove = (ev: MouseEvent) => {
      const s = interactionRef.current;
      if (s.type !== 'resize' || !s.itemId?.startsWith('widget:')) return;
      const wId = s.itemId.replace('widget:', '');
      const z = zoomRef.current;
      const dx = ((ev.clientX - s.startMouseX) / z) * 1.15;
      const dy = ((ev.clientY - s.startMouseY) / z) * 1.15;
      setDashboardWidgets(prev => prev.map(w => {
        if (w.id !== wId) return w;
        let { x, y, w: ww, h } = { x: s.startX, y: s.startY, w: s.startW, h: s.startH };
        const MIN = 20;
        if (s.handle.includes('e')) ww = Math.max(MIN, s.startW + dx);
        if (s.handle.includes('s')) h = Math.max(MIN, s.startH + dy);
        if (s.handle.includes('w')) { const nw = Math.max(MIN, s.startW - dx); x = s.startX + (s.startW - nw); ww = nw; }
        if (s.handle.includes('n')) { const nh = Math.max(MIN, s.startH - dy); y = s.startY + (s.startH - nh); h = nh; }
        return { ...w, pos: { x, y, w: ww, h } };
      }));
    };
    const onUp = () => {
      interactionRef.current.type = null;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  const handleOpenDirectChartEditor = (item: any) => {
    setEditDashboardChartItem(item);
    const code = item.chart.transform_config?.code ||
      `return ${JSON.stringify(item.chart.echarts_option, null, 2)};`;
    setEditDashboardChartCode(code);

    // Evaluate initial code
    const filteredData = getFilteredData(item);
    const evalResult = evaluateEChartsCode(code, filteredData);
    if (!evalResult.error) {
      setEditDashboardChartEvaluatedOption(evalResult.option);
      setEditDashboardChartEvalError(null);
      setEditDashboardChartEvalSuccess(true);
    } else {
      setEditDashboardChartEvaluatedOption({});
      setEditDashboardChartEvalError(evalResult.error);
      setEditDashboardChartEvalSuccess(false);
    }
  };

  const handleRunDirectChartCode = () => {
    if (!editDashboardChartItem) return;
    const filteredData = getFilteredData(editDashboardChartItem);
    const evalResult = evaluateEChartsCode(editDashboardChartCode, filteredData);
    if (evalResult.error) {
      setEditDashboardChartEvalError(evalResult.error);
      setEditDashboardChartEvalSuccess(false);
    } else {
      setEditDashboardChartEvaluatedOption(evalResult.option);
      setEditDashboardChartEvalError(null);
      setEditDashboardChartEvalSuccess(true);
    }
  };

  const handleSaveDirectChartCode = async () => {
    if (!editDashboardChartItem) return;

    const filteredData = getFilteredData(editDashboardChartItem);
    const evalResult = evaluateEChartsCode(editDashboardChartCode, filteredData);
    if (evalResult.error) {
      alert("Your ECharts code contains errors. Please fix them before saving.");
      setEditDashboardChartEvalError(evalResult.error);
      setEditDashboardChartEvalSuccess(false);
      return;
    }

    const chart = editDashboardChartItem.chart;
    const payload = {
      workspace_id: WORKSPACE_ID,
      name: chart.name,
      dataset_id: chart.dataset_id,
      chart_type: "custom",
      encodings: {},
      echarts_option: evalResult.option,
      transform_config: { code: editDashboardChartCode }
    };

    try {
      const updatedChart = await api.charts.update(chart.id, payload);

      // Update charts list in BI Hub
      setCharts(prev => prev.map(c => c.id === chart.id ? updatedChart : c));

      // Update items inside dashboard
      setDashboardItems(prev => prev.map(item => {
        if (item.chart.id === chart.id) {
          return {
            ...item,
            chart: updatedChart
          };
        }
        return item;
      }));

      alert("Chart updated successfully!");
      setEditDashboardChartItem(null);
    } catch (err) {
      console.error("Failed to save direct chart code", err);
      alert("Failed to save chart changes");
    }
  };

  // Dashboard Filters Logic
  const getAvailableColumns = () => {
    const columnsSet = new Set<string>();
    dashboardItems.forEach(item => {
      if (item.data && item.data.length > 0) {
        Object.keys(item.data[0]).forEach(key => columnsSet.add(key));
      }
    });
    return Array.from(columnsSet);
  };

  const getAvailableColumnsWithDataset = () => {
    const colToDatasets: Record<string, Set<string>> = {};
    dashboardItems.forEach(item => {
      if (item.data && item.data.length > 0) {
        const datasetId = item.chart?.dataset_id;
        const dsName = datasets.find(d => d.id === datasetId)?.name || 'Unknown Dataset';
        Object.keys(item.data[0]).forEach(key => {
          if (!colToDatasets[key]) {
            colToDatasets[key] = new Set();
          }
          colToDatasets[key].add(dsName);
        });
      }
    });
    return Object.entries(colToDatasets).map(([col, dsSet]) => ({
      column: col,
      datasets: Array.from(dsSet).join(', ')
    }));
  };

  const getUniqueValuesForColumn = (column: string) => {
    if (!column) return [];
    const valuesSet = new Set<string>();
    dashboardItems.forEach(item => {
      if (item.data && Array.isArray(item.data)) {
        item.data.forEach((row: any) => {
          let targetKey = column;
          if (row[targetKey] === undefined) {
            const foundKey = Object.keys(row).find(k => k.toLowerCase() === column.toLowerCase());
            if (foundKey) targetKey = foundKey;
          }
          if (row[targetKey] !== undefined && row[targetKey] !== null) {
            valuesSet.add(String(row[targetKey]));
          }
        });
      }
    });
    return Array.from(valuesSet).sort();
  };

  const getFilteredData = (item: any) => {
    if (!item.data || !Array.isArray(item.data)) return [];

    // Find all active filter widgets on the same tab
    const itemTabId = item.tabId || 'default';
    const widgetFilters = dashboardWidgets.filter(w =>
      w.itemType === 'filter' &&
      (w.tabId || 'default') === itemTabId &&
      w.filterColumn &&
      w.activeValue !== undefined &&
      w.activeValue !== ""
    );

    return item.data.filter((row: any) => {
      // 1. Static global filters
      for (const filter of globalFilters) {
        const activeValue = activeFilterValues[filter.id];
        if (activeValue === undefined || activeValue === "" || activeValue === null) {
          continue;
        }
        let targetKey = filter.column;
        if (row[targetKey] === undefined) {
          const foundKey = Object.keys(row).find(k => k.toLowerCase() === filter.column.toLowerCase());
          if (foundKey) targetKey = foundKey;
        }
        if (row[targetKey] !== undefined) {
          const rowVal = row[targetKey];
          const filterVal = activeValue;
          if (filter.operator === "equals") {
            if (String(rowVal).toLowerCase() !== String(filterVal).toLowerCase()) return false;
          } else if (filter.operator === "contains") {
            if (!String(rowVal).toLowerCase().includes(String(filterVal).toLowerCase())) return false;
          } else if (filter.operator === "greater_than") {
            const rNum = parseFloat(rowVal);
            const fNum = parseFloat(filterVal);
            if (isNaN(rNum) || isNaN(fNum) || rNum < fNum) return false;
          } else if (filter.operator === "less_than") {
            const rNum = parseFloat(rowVal);
            const fNum = parseFloat(filterVal);
            if (isNaN(rNum) || isNaN(fNum) || rNum > fNum) return false;
          }
        }
      }

      // 2. Interactive canvas filter widgets
      for (const wFilter of widgetFilters) {
        const col = wFilter.filterColumn!;
        const filterVal = wFilter.activeValue!;
        const fType = wFilter.filterType || 'dropdown';

        let targetKey = col;
        if (row[targetKey] === undefined) {
          const foundKey = Object.keys(row).find(k => k.toLowerCase() === col.toLowerCase());
          if (foundKey) targetKey = foundKey;
        }

        if (row[targetKey] !== undefined) {
          const rowVal = String(row[targetKey]);

          if (fType === 'like') {
            if (!rowVal.toLowerCase().includes(filterVal.toLowerCase())) return false;
          } else if (fType === 'dropdown') {
            if (rowVal.toLowerCase() !== filterVal.toLowerCase()) return false;
          } else if (fType === 'date') {
            const rowDate = new Date(rowVal);
            if (!isNaN(rowDate.getTime())) {
              if (wFilter.dateSubtype === 'year') {
                const yearVal = rowDate.getFullYear().toString();
                if (yearVal !== filterVal) return false;
              } else if (wFilter.dateSubtype === 'month') {
                const monthVal = `${rowDate.getFullYear()}-${String(rowDate.getMonth() + 1).padStart(2, '0')}`;
                if (monthVal !== filterVal) return false;
              } else {
                // Full date comparison (YYYY-MM-DD)
                const dateVal = rowDate.toISOString().split('T')[0];
                if (dateVal !== filterVal) return false;
              }
            } else {
              // Fallback string matching if not a parseable date
              if (!rowVal.toLowerCase().includes(filterVal.toLowerCase())) return false;
            }
          }
        } else {
          // If the chart dataset does not contain this column at all, we don't filter it out
          // so that the filter only affects charts containing the column.
        }
      }

      return true;
    });
  };

  const openAddFilterModal = () => {
    setEditingFilter(null);
    setFilterNameInput("");
    const cols = getAvailableColumns();
    setFilterColumnInput(cols.length > 0 ? cols[0] : "");
    setFilterOperatorInput("equals");
    setFilterDefaultValueInput("");
    setShowAddFilterModal(true);
  };

  const openEditFilterModal = (filter: GlobalFilter) => {
    setEditingFilter(filter);
    setFilterNameInput(filter.name);
    setFilterColumnInput(filter.column);
    setFilterOperatorInput(filter.operator);
    setFilterDefaultValueInput(filter.defaultValue || "");
    setShowAddFilterModal(true);
  };

  const handleSaveFilter = () => {
    if (!filterNameInput || !filterColumnInput) {
      alert("Please enter a filter name and target column.");
      return;
    }
    if (editingFilter) {
      const updated = globalFilters.map(f => f.id === editingFilter.id ? {
        ...f,
        name: filterNameInput,
        column: filterColumnInput,
        operator: filterOperatorInput,
        defaultValue: filterDefaultValueInput
      } : f);
      setGlobalFilters(updated);
      setActiveFilterValues(prev => ({ ...prev, [editingFilter.id]: filterDefaultValueInput }));
    } else {
      const newId = Math.random().toString(36).substr(2, 9);
      const newFilter: GlobalFilter = {
        id: newId,
        name: filterNameInput,
        column: filterColumnInput,
        operator: filterOperatorInput,
        defaultValue: filterDefaultValueInput
      };
      setGlobalFilters([...globalFilters, newFilter]);
      setActiveFilterValues(prev => ({ ...prev, [newId]: filterDefaultValueInput }));
    }
    setShowAddFilterModal(false);
  };

  const handleRemoveFilter = (filterId: string) => {
    setGlobalFilters(globalFilters.filter(f => f.id !== filterId));
    setActiveFilterValues(prev => {
      const copy = { ...prev };
      delete copy[filterId];
      return copy;
    });
  };

  // Helper: check if current user has permission to view a chart
  const hasChartPermission = (chartId: string): boolean => {
    if (!chartId) return true;
    
    // Admin always has permission
    if ((currentUser as any)?.role === 'admin') return true;

    const perms = chartPermissions[chartId];
    // No permissions set = private: only admin/creator can view
    if (!perms || perms.length === 0) {
      // Check if current user is creator (we don't have that info directly in FE, 
      // so when no permissions set, treat as "private - no access for regular users")
      return false;
    }
    // Has permission list - check if current user is in the list
    if (!currentUser) return false;
    return perms.includes((currentUser as any).id);
  };

  const handleSelectTab = (tabId: string) => {
    // Permission check: if not in edit mode, check if user can access this tab
    if (!isEditMode && currentUser) {
      const tabChartItems = dashboardItems.filter(i => (i.tabId || 'default') === tabId && i.chart?.id);
      if (tabChartItems.length > 0) {
        const hasAnyAccess = tabChartItems.some(i => hasChartPermission(i.chart.id));
        if (!hasAnyAccess) {
          const tabName = dashboardTabs.find(t => t.id === tabId)?.name || 'Tab';
          setNoPermTabName(tabName);
          setShowNoPermTabPopup(true);
          return; // Don't switch tab
        }
      }
    }

    setActiveTabId(tabId);

    // If custom/floating tab bar is attached to a frame, jump to the equivalent frame in the new tab
    if (tabPosition === 'custom' && tabFrameId) {
      const currentAttachedFrame = dashboardFrames.find(f => f.id === tabFrameId);
      if (currentAttachedFrame && (currentAttachedFrame.tabId || 'default') !== (tabId || 'default')) {
        // Look for a frame in the target tab with the same name
        const targetFrame = dashboardFrames.find(f => 
          (f.tabId === tabId || (tabId === 'default' && !f.tabId)) && 
          f.name === currentAttachedFrame.name
        );
        if (targetFrame) {
          setTabFrameId(targetFrame.id);
        } else {
          // Fallback: any frame in that tab
          const firstFrame = dashboardFrames.find(f => (f.tabId === tabId || (tabId === 'default' && !f.tabId)));
          if (firstFrame) {
            setTabFrameId(firstFrame.id);
          }
        }
      }
    }

    // Sync mainFrameId when switching tabs to maintain consistent preview scaling/focus
    if (mainFrameId) {
      const currentMainFrame = dashboardFrames.find(f => f.id === mainFrameId) || dashboardWidgets.find(w => w.id === mainFrameId);
      if (currentMainFrame && (currentMainFrame.tabId || 'default') !== (tabId || 'default')) {
        // We only sync by name for Frames, as Widgets don't have a name property
        const frameName = (currentMainFrame as any).name;

        if (frameName) {
          // Look for a frame in the target tab with the same name
          const targetFrame = dashboardFrames.find(f => 
            (f.tabId === tabId || (tabId === 'default' && !f.tabId)) && 
            f.name === frameName
          );
          
          if (targetFrame) {
            setMainFrameId(targetFrame.id);
          } else {
            // Fallback: pick the first frame in the new tab to keep preview mode active on a valid frame
            const firstFrame = dashboardFrames.find(f => (f.tabId === tabId || (tabId === 'default' && !f.tabId)));
            if (firstFrame) {
              setMainFrameId(firstFrame.id);
            }
          }
        } else {
          // If it's a widget or nameless frame, just pick the first frame in the new tab as fallback
          const firstFrame = dashboardFrames.find(f => (f.tabId === tabId || (tabId === 'default' && !f.tabId)));
          if (firstFrame) {
            setMainFrameId(firstFrame.id);
          }
        }
      }
    }
    
    // Auto-pan to frame if switching tabs in whiteboard mode
    // Skip this in preview mode so the fitToContent effect handles it precisely with 0 padding
    if (layoutMode === 'whiteboard' && !isPreviewMode) {
      const frame = dashboardFrames.find(f => f.tabId === tabId || (tabId === 'default' && !f.tabId));
      if (frame) {
        // Center the frame in view
        if (gridContainerRef.current) {
          const rect = gridContainerRef.current.getBoundingClientRect();
          const targetZoom = Math.min(1.5, Math.min(rect.width / (frame.pos.w + 100), rect.height / (frame.pos.h + 100)));
          setZoom(targetZoom);
          setPan({
            x: (rect.width / 2) - (frame.pos.x + frame.pos.w / 2) * targetZoom,
            y: (rect.height / 2) - (frame.pos.y + frame.pos.h / 2) * targetZoom
          });
        }
      }
    }
  };

  const handleAddTab = () => {
    saveToHistory();
    const newId = Math.random().toString(36).substr(2, 9);
    const newTab = { id: newId, name: `Tab ${dashboardTabs.length + 1}` };

    // Auto-clone attached frame or mainframe if in whiteboard mode
    const framesToClone: DashboardFrame[] = [];

    // 1. Check custom tab frame
    if (tabPosition === 'custom' && tabFrameId) {
      const sourceFrame = dashboardFrames.find(f => f.id === tabFrameId);
      if (sourceFrame && (sourceFrame.tabId === activeTabId || (!sourceFrame.tabId && activeTabId === 'default'))) {
        framesToClone.push(sourceFrame);
      }
    }

    // 2. Check mainframe in whiteboard layout
    if (layoutMode === 'whiteboard' && mainFrameId) {
      const sourceMainFrame = dashboardFrames.find(f => f.id === mainFrameId);
      if (sourceMainFrame && (sourceMainFrame.tabId === activeTabId || (!sourceMainFrame.tabId && activeTabId === 'default'))) {
        // Avoid duplicate if mainFrameId is the same as tabFrameId
        if (!framesToClone.some(f => f.id === sourceMainFrame.id)) {
          framesToClone.push(sourceMainFrame);
        }
      }
    }

    // Clone all identified frames to the new tab
    if (framesToClone.length > 0) {
      const newFrames = framesToClone.map(sourceFrame => {
        const newFrameId = Math.random().toString(36).substr(2, 9);
        return {
          ...sourceFrame,
          id: newFrameId,
          tabId: newId, // Assign to new tab
          name: sourceFrame.name
        };
      });
      setDashboardFrames(prev => [...prev, ...newFrames]);
    }

    setDashboardTabs(prev => [...prev, newTab]);
    // Keep activeTabId unchanged to stay on the current screen
    setShowTabSettings(true);
    if (tabPosition === 'none') {
      setTabPosition('top');
    }
  };

  const handleDeleteTab = (tabId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (dashboardTabs.length <= 1) {
      alert("A dashboard must have at least one tab.");
      return;
    }
    if (!confirm("Deleting this tab will also delete all charts and widgets inside it. Are you sure?")) {
      return;
    }
    saveToHistory();
    setDashboardItems(prev => prev.filter(item => item.tabId !== tabId));
    setDashboardWidgets(prev => prev.filter(w => w.tabId !== tabId));

    const styledWidget = dashboardWidgets.find(w => w.id === stylingWidgetId);
    if (styledWidget && (styledWidget.tabId === tabId || !styledWidget.tabId)) {
      setShowWidgetStyleModal(false);
      setStylingWidgetId(null);
    }

    const updatedTabs = dashboardTabs.filter(t => t.id !== tabId);
    setDashboardTabs(updatedTabs);

    if (activeTabId === tabId) {
      handleSelectTab(updatedTabs[0].id);
    }
  };


  // ==========================================
  // CHART ACTIONS
  // ==========================================
  const handleOpenChartForEdit = (chart: any) => {
    setEditingChartId(chart.id);
    setChartName(chart.name);
    setChartType(chart.chart_type);
    setSelectedDatasetId(chart.dataset_id);

    // Load pre-configured encodings
    if (chart.encodings) {
      setXEncoding(chart.encodings.x || "");
      setYEncoding(chart.encodings.y || "");
    }

    // Load ECharts JS code or construct dynamic option fallback
    const code = chart.transform_config?.code ||
      `return ${JSON.stringify(chart.echarts_option, null, 2)};`;
    setEchartsCode(code);

    // Set initial evaluation state
    setEvalError(null);
    setEvalSuccess(true);
    setEvaluatedOption(chart.echarts_option || {});
    setChartConfigTab("schema");
    setShowChartPreview(true);

    setView("edit-chart");
  };

  const handleCreateChartInit = () => {
    setDatasetSearchQuery("");
    setShowSelectDatasetModal(true);
  };

  const handleSelectDatasetForNewChart = (datasetId: string) => {
    setEditingChartId(null);
    setChartName("");
    setChartType("bar");
    setSelectedDatasetId(datasetId);
    setXEncoding("");
    setYEncoding("");
    setEchartsCode("");
    setEvalError(null);
    setEvalSuccess(false);
    setEvaluatedOption({});
    setDatasetPreview(null);
    setShowChartPreview(false);
    setShowSelectDatasetModal(false);
    setView("create-chart");
  };
  const handleDeleteChart = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this chart? It will also be removed from any dashboards using it.")) return;
    try {
      await api.charts.delete(id);
      setCharts(prev => prev.filter(c => c.id !== id));
      loadHubData(); // reload layout to sync any dashboard items deleted in cascade
    } catch (err) {
      console.error(err);
      alert("Failed to delete chart");
    }
  };

  const handleRunCode = () => {
    const rows = datasetPreview?.rows || [];
    const evalResult = evaluateEChartsCode(echartsCode, rows);
    if (evalResult.error) {
      setEvalError(evalResult.error);
      setEvalSuccess(false);
    } else {
      setEvaluatedOption(evalResult.option);
      setEvalError(null);
      setEvalSuccess(true);
      setShowChartPreview(true);
    }
  };
  const handleExportChart = (format: 'png' | 'jpeg', isFullsize = false) => {
    const chartRef = isFullsize ? fullsizeChartRef : previewChartRef;
    if (!chartRef.current) return;
    try {
      const echartInstance = chartRef.current.getEchartsInstance();
      const dataURL = echartInstance.getDataURL({
        type: format,
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        excludeComponents: ['toolbox']
      });

      const link = document.createElement('a');
      link.download = `${chartName || 'chart'}.${format}`;
      link.href = dataURL;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Failed to download chart image", error);
      alert("Failed to download chart image");
    }
  };

  const handleSaveChart = async () => {
    if (!chartName || !selectedDatasetId) {
      alert("Please provide a chart name and select a dataset.");
      return;
    }

    // Run code to get the latest options
    const rows = datasetPreview?.rows || [];
    const evalResult = evaluateEChartsCode(echartsCode, rows);
    if (evalResult.error) {
      alert("Your ECharts code contains errors. Please fix them before saving.");
      setEvalError(evalResult.error);
      setEvalSuccess(false);
      return;
    }

    const payload = {
      workspace_id: WORKSPACE_ID,
      name: chartName,
      dataset_id: selectedDatasetId,
      chart_type: "custom",
      encodings: {},
      echarts_option: evalResult.option,
      transform_config: { code: echartsCode }
    };

    try {
      console.log("Attempting to save chart. Payload:", payload);
      if (editingChartId) {
        const updated = await api.charts.update(editingChartId, payload);
        console.log("Chart updated successfully. Response:", updated);
        alert("Chart updated successfully!");
      } else {
        const created = await api.charts.create(payload);
        console.log("Chart created successfully. Response:", created);
        setEditingChartId(created.id);
        setView("edit-chart");
        alert("Chart saved successfully!");
      }

      loadHubData();
    } catch (err) {
      console.error("Failed to save chart. Error:", err);
      alert("Failed to save chart");
    }
  };

  // ==========================================
  // DATASET ACTIONS
  // ==========================================
  const handlePreviewDataset = async (id: string) => {
    setPreviewLoading(true);
    setPreviewDatasetData(null);
    setShowPreviewDatasetModal(true);
    try {
      const res = await api.datasets.preview(id);
      setPreviewDatasetData(res);
    } catch (error: any) {
      setPreviewDatasetData({
        columns: [],
        rows: [],
        error: error.response?.data?.detail || "Failed to load preview data"
      });
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleDeleteDataset = async (id: string) => {
    if (!confirm("Are you sure you want to delete this dataset? All charts built on it will fail to load.")) return;
    try {
      await api.datasets.delete(id);
      setDatasets(prev => prev.filter(ds => ds.id !== id));
    } catch (err) {
      console.error(err);
      alert("Failed to delete dataset");
    }
  };

  // Chart config computed
  const currentChartConfig = {
    chartType: "custom",
    encodings: {},
    echartsOption: evaluatedOption
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-50 flex flex-col">
      {view === "list" && (
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10 flex-1 flex flex-col">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-4xl font-extrabold tracking-tight flex items-center gap-3">
                <Archive className="text-orange-500 animate-pulse" />
                Trực quan hóa
              </h1>
              <p className="text-neutral-400 mt-2">Manage datasets, build charts, and orchestrate visual dashboards.</p>
            </div>

            {/* Contextual Action Button based on Tab */}
            <div>
              {activeTab === "dashboards" && (
                <button
                  onClick={() => setShowCreateDashModal(true)}
                  className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-5 py-2.5 rounded-xl font-semibold transition-all duration-200 shadow-lg shadow-orange-600/20 hover:shadow-orange-600/40 transform hover:-translate-y-0.5"
                >
                  <Plus className="w-5 h-5" />
                  Create Dashboard
                </button>
              )}
              {activeTab === "charts" && (
                <button
                  onClick={handleCreateChartInit}
                  className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-5 py-2.5 rounded-xl font-semibold transition-all duration-200 shadow-lg shadow-orange-600/20 hover:shadow-orange-600/40 transform hover:-translate-y-0.5"
                >
                  <Plus className="w-5 h-5" />
                  Create Chart
                </button>
              )}
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-neutral-800 mb-8 bg-neutral-900/10 p-1.5 rounded-xl gap-2 w-max shadow-inner">
            <button
              onClick={() => setActiveTab("dashboards")}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all duration-200 ${activeTab === "dashboards"
                ? "bg-orange-600 text-white shadow"
                : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/50"
                }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              Dashboards
              <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-semibold ${activeTab === "dashboards" ? "bg-orange-700 text-white" : "bg-neutral-800 text-neutral-400"}`}>
                {dashboards.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab("charts")}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all duration-200 ${activeTab === "charts"
                ? "bg-orange-600 text-white shadow"
                : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/50"
                }`}
            >
              <BarChart3 className="w-4 h-4" />
              Charts
              <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-semibold ${activeTab === "charts" ? "bg-orange-700 text-white" : "bg-neutral-800 text-neutral-400"}`}>
                {charts.length}
              </span>
            </button>
          </div>

          {/* Tab content wrapper */}
          <div className="flex-1">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : activeTab === "dashboards" ? (
              // Dashboards view
              dashboards.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center py-20 border border-dashed border-neutral-800 rounded-3xl bg-neutral-900/20">
                  <LayoutDashboard className="w-16 h-16 text-neutral-700 mb-4 stroke-1" />
                  <h3 className="text-xl font-bold text-neutral-300">No Dashboards Yet</h3>
                  <p className="text-neutral-500 text-sm mt-1 max-w-sm">Create a dashboard layout to organize and display your charts.</p>
                  <button
                    onClick={() => setShowCreateDashModal(true)}
                    className="mt-6 flex items-center gap-2 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 text-orange-500 px-5 py-2.5 rounded-xl font-semibold transition-all duration-200"
                  >
                    <Plus className="w-5 h-5" />
                    Create First Dashboard
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {dashboards.filter(dashboard => {
                    if ((currentUser as any)?.role === 'admin') return true;
                    if (!dashboard.items || dashboard.items.length === 0) return true;
                    return dashboard.items.some((item: any) => hasChartPermission(item.chart_id));
                  }).map(dashboard => (
                    <div
                      key={dashboard.id}
                      onClick={() => handleOpenDashboard(dashboard)}
                      className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-6 hover:border-orange-500/50 hover:bg-neutral-900/90 transition-all duration-250 cursor-pointer shadow-lg hover:shadow-2xl group flex flex-col justify-between h-48"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500 group-hover:bg-orange-600 group-hover:text-white transition-all duration-250">
                            <LayoutDashboard className="w-5 h-5" />
                          </div>
                          <button
                            onClick={(e) => handleDeleteDashboard(e, dashboard.id)}
                            className="p-2 text-neutral-500 hover:text-red-400 hover:bg-neutral-800/80 rounded-xl opacity-0 group-hover:opacity-100 transition-all"
                            title="Delete Dashboard"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <h3 className="font-bold text-lg text-orange-400 truncate group-hover:text-orange-300">{dashboard.name}</h3>
                        {dashboard.description ? (
                          <p className="text-xs text-neutral-400 mt-1 line-clamp-2">{dashboard.description}</p>
                        ) : (
                          <p className="text-xs text-neutral-600 mt-1 italic">No description provided</p>
                        )}
                      </div>
                      <div className="flex items-center justify-between border-t border-neutral-800/60 pt-4 text-[10px] text-neutral-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          Updated {formatDate(dashboard.updated_at || dashboard.created_at)}
                        </span>
                        <span className="flex items-center gap-1 font-semibold text-orange-500 group-hover:translate-x-1 transition-transform">
                          Open Dashboard
                          <ChevronRight className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : (
              // Charts list
              charts.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center py-20 border border-dashed border-neutral-800 rounded-3xl bg-neutral-900/20">
                  <BarChart3 className="w-16 h-16 text-neutral-700 mb-4 stroke-1" />
                  <h3 className="text-xl font-bold text-neutral-300">No Visual Charts Yet</h3>
                  <p className="text-neutral-500 text-sm mt-1 max-w-sm">Create and style data charts from your connections.</p>
                  <button
                    onClick={handleCreateChartInit}
                    className="mt-6 flex items-center gap-2 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 text-orange-500 px-5 py-2.5 rounded-xl font-semibold transition-all duration-200"
                  >
                    <Plus className="w-5 h-5" />
                    Create First Chart
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {charts.map(chart => (
                    <div
                      key={chart.id}
                      onClick={() => handleOpenChartForEdit(chart)}
                      className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-6 hover:border-orange-500/50 hover:bg-neutral-900/90 transition-all duration-250 cursor-pointer shadow-lg hover:shadow-2xl group flex flex-col justify-between h-44"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500 group-hover:bg-orange-600 group-hover:text-white transition-all duration-250">
                            {chart.chart_type === "line" ? (
                              <LineChart className="w-5 h-5" />
                            ) : chart.chart_type === "pie" ? (
                              <PieChart className="w-5 h-5" />
                            ) : (
                              <BarChart3 className="w-5 h-5" />
                            )}
                          </div>
                          <button
                            onClick={(e) => handleDeleteChart(e, chart.id)}
                            className="p-2 text-neutral-500 hover:text-red-400 hover:bg-neutral-800/80 rounded-xl opacity-0 group-hover:opacity-100 transition-all"
                            title="Delete Chart"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <h3 className="font-bold text-lg text-orange-400 truncate group-hover:text-orange-300">{chart.name}</h3>
                        <p className="text-xs text-neutral-500 uppercase tracking-widest mt-1 font-semibold">{chart.chart_type} chart</p>
                      </div>
                      <div className="flex items-center justify-between border-t border-neutral-800/60 pt-4 text-[10px] text-neutral-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          Created {formatDate(chart.created_at)}
                        </span>
                        <span className="flex items-center gap-1 font-semibold text-orange-500 group-hover:translate-x-1 transition-transform">
                          Edit Chart
                          <ChevronRight className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        </div>
      )}

      {/* ==========================================
          DASHBOARD BUILDER SUB-VIEW
          ========================================== */}
      {view === "edit-dashboard" && selectedDashboard && (
        <div 
          className={`flex-1 flex flex-col ${(isPreviewMode && layoutMode === 'whiteboard') ? 'fixed inset-0 z-[100]' : ''}`}
          style={isPreviewMode ? {
            backgroundColor: (mainFrameId 
              ? (dashboardFrames.find(f => f.id === mainFrameId)?.bgColor || dashboardWidgets.find(w => w.id === mainFrameId)?.bgColor || selectedDashboard?.theme_config?.canvasBg || '#f8f9fa') 
              : (selectedDashboard?.theme_config?.canvasBg || '#f8f9fa'))
          } : {}}
        >
          {/* Hide the global scroll-to-top button which overlaps with dashboard controls */}
          <style dangerouslySetInnerHTML={{ __html: `
            .scroll-to-top-button { display: none !important; }
            ${(isPreviewMode && layoutMode === 'whiteboard') ? 'body { overflow: hidden !important; }' : ''}
          ` }} />
          {/* Dashboard Header */}
          {!isHeaderDisabled && !isPreviewMode && (
            <div className="h-20 border-b border-neutral-800 bg-neutral-900/60 flex items-center justify-between px-8 backdrop-blur-md sticky top-0 z-20 shrink-0">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => {
                    setView("list");
                    setSelectedDashboard(null);
                    setShowWidgetStyleModal(false);
                    setStylingWidgetId(null);
                    setShowAddChart(false);
                  }}
                  className="p-2 hover:bg-neutral-800 rounded-xl text-neutral-400 hover:text-white transition-colors cursor-pointer"
                  title="Back to Trực quan hóa"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <h1 className="text-xl font-bold flex items-center gap-2 text-orange-400">
                    {isEditMode && isEditingDashName ? (
                      <input
                        type="text"
                        value={editingDashNameInput}
                        onChange={e => setEditingDashNameInput(e.target.value)}
                        onBlur={() => {
                          if (editingDashNameInput.trim()) {
                            setSelectedDashboard((prev: any) => prev ? { ...prev, name: editingDashNameInput.trim() } : prev);
                          }
                          setIsEditingDashName(false);
                        }}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            if (editingDashNameInput.trim()) {
                              setSelectedDashboard((prev: any) => prev ? { ...prev, name: editingDashNameInput.trim() } : prev);
                            }
                            setIsEditingDashName(false);
                          } else if (e.key === 'Escape') {
                            setIsEditingDashName(false);
                          }
                        }}
                        className="text-xl font-bold bg-neutral-950 border border-neutral-800 text-orange-400 focus:outline-none focus:border-orange-500 rounded px-2 py-0.5 w-64 shadow-inner"
                        autoFocus
                      />
                    ) : (
                      <span
                        onClick={() => {
                          if (isEditMode) {
                            setEditingDashNameInput(selectedDashboard.name);
                            setIsEditingDashName(true);
                          }
                        }}
                        className={isEditMode ? "cursor-pointer hover:bg-neutral-800/40 rounded px-1 -mx-1 transition-colors" : ""}
                        title={isEditMode ? "Click to rename dashboard" : undefined}
                      >
                        {selectedDashboard.name}
                      </span>
                    )}
                    {isEditMode && (
                      <button
                        onClick={() => {
                          if (layoutMode === 'whiteboard') {
                            setShowIframePreview(true);
                          } else {
                            window.open(`/hub?preview=true&disable_header=true&dashboardId=${selectedDashboard.id}${mainFrameId ? `&mainFrameId=${mainFrameId}` : ''}&tabId=${activeTabId}&layoutMode=${layoutMode}`, '_blank');
                          }
                        }}
                        className="ml-2 flex items-center gap-1.5 px-2.5 py-1 text-[10px] bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/25 rounded font-mono uppercase tracking-wide cursor-pointer transition-colors select-none"
                        title={layoutMode === 'whiteboard' ? "Open preview overlay" : "Open standalone preview in new tab"}
                      >
                        <Eye className="w-3 h-3" /> Preview Dashboard
                      </button>
                    )}
                  </h1>
                  {selectedDashboard.description && (
                    <p className="text-xs text-neutral-500 truncate max-w-lg mt-0.5">{selectedDashboard.description}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Toggle Mode */}
                <div className="flex bg-neutral-950 border border-neutral-800 p-1 rounded-xl shadow-inner mr-2">
                  <button
                    onClick={() => setIsEditMode(false)}
                    className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg cursor-pointer transition-colors ${!isEditMode ? "bg-orange-600 text-white" : "text-neutral-400 hover:text-neutral-200"}`}
                  >
                    <Eye className="w-3.5 h-3.5" /> View
                  </button>
                  <button
                    onClick={() => setIsEditMode(true)}
                    className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg cursor-pointer transition-colors ${isEditMode ? "bg-orange-600 text-white" : "text-neutral-400 hover:text-neutral-200"}`}
                  >
                    <PenTool className="w-3.5 h-3.5" /> Edit
                  </button>
                </div>

                {isEditMode && (
                  <>
                    <button
                      onClick={() => {
                        setShowTemplateSettings(true);
                        setShowAddChart(false);
                        setShowWidgetStyleModal(false);
                        setShowTabSettings(false);
                      }}
                      className="flex items-center gap-2 bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 text-neutral-300 hover:text-neutral-50 px-4 py-2 rounded-xl text-sm font-semibold transition-colors cursor-pointer"
                    >
                      <Palette className="w-4 h-4 text-pink-400" /> Template
                    </button>

                    <button
                      onClick={() => {
                        setShowAddChart(true);
                        setShowTemplateSettings(false);
                        setShowWidgetStyleModal(false);
                        setShowTabSettings(false);
                      }}
                      className="flex items-center gap-2 bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 text-neutral-300 hover:text-neutral-50 px-4 py-2 rounded-xl text-sm font-semibold transition-colors cursor-pointer"
                    >
                      <BarChart3 className="w-4 h-4" /> Add Chart
                    </button>

                    {/* Add Element Dropdown */}
                    <div className="relative" ref={addElementDropdownRef}>
                      <button
                        onClick={() => setShowAddElementDropdown(p => !p)}
                        className="flex items-center gap-2 bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 text-neutral-300 hover:text-neutral-50 px-4 py-2 rounded-xl text-sm font-semibold transition-colors cursor-pointer"
                      >
                        <Plus className="w-4 h-4" /> Add Element
                        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showAddElementDropdown ? 'rotate-180' : ''}`} />
                      </button>
                      {showAddElementDropdown && (
                        <div className="absolute right-0 top-full mt-2 w-52 bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
                          <div className="px-3 py-2 border-b border-neutral-800">
                            <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Dashboard Actions</span>
                          </div>
                          {([
                            { 
                              type: 'action_tab', 
                              icon: <LayoutDashboard className="w-4 h-4" />, 
                              label: dashboardTabs.length > 1 ? 'Tab Settings' : 'New Tab', 
                              desc: dashboardTabs.length > 1 ? 'Manage dashboard tab bar' : 'Create a new dashboard tab' 
                            },
                            { type: 'action_filter', icon: <Filter className="w-4 h-4" />, label: 'Filter', desc: 'Add filter widget to canvas' },
                            { type: 'action_toggle_header', icon: <LayoutDashboard className="w-4 h-4" />, label: 'Toggle Headers', desc: 'Show/hide all chart headers' },
                          ]).map(item => (
                            <button
                              key={item.type}
                              onClick={() => {
                                if (item.type === 'action_tab') {
                                  if (dashboardTabs.length > 1) {
                                    setShowTabSettings(true);
                                  } else {
                                    handleAddTab();
                                  }
                                } else if (item.type === 'action_filter') {
                                  addWidget('filter');
                                } else if (item.type === 'action_toggle_header') {
                                  setDashboardItems(prev => {
                                    const areAllHidden = prev.length > 0 && prev.every(i => i.hideHeader);
                                    return prev.map(i => ({ ...i, hideHeader: !areAllHidden }));
                                  });
                                }
                                setShowAddElementDropdown(false);
                              }}
                              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-neutral-800 transition-colors text-left cursor-pointer border-b border-neutral-800"
                            >
                              <span className="text-orange-500 shrink-0">{item.icon}</span>
                              <div>
                                <div className="text-sm font-semibold text-neutral-50">{item.label}</div>
                                <div className="text-[10px] text-neutral-500">{item.desc}</div>
                              </div>
                            </button>
                          ))}
                          <div className="px-3 py-2 border-b border-neutral-800 bg-neutral-900/50">
                            <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Visual Elements</span>
                          </div>
                          {([
                            { type: 'heading' as WidgetType, icon: <Heading1 className="w-4 h-4" />, label: 'Section Header', desc: 'Bold heading text' },
                            { type: 'text' as WidgetType, icon: <AlignLeft className="w-4 h-4" />, label: 'Text Box', desc: 'Editable paragraph' },
                            { type: 'image' as WidgetType, icon: <ImageIcon className="w-4 h-4" />, label: 'Image / Icon', desc: 'Upload PNG, JPG, SVG' },
                            { type: 'rectangle' as WidgetType, icon: <Square className="w-4 h-4" />, label: 'Rectangle', desc: 'Shape / container' },
                            { type: 'circle' as WidgetType, icon: <Circle className="w-4 h-4" />, label: 'Circle / Oval', desc: 'Rounded shape' },
                            { type: 'divider' as WidgetType, icon: <Minus className="w-4 h-4" />, label: 'Divider', desc: 'Horizontal separator' },
                            { type: 'code' as WidgetType, icon: <PenTool className="w-4 h-4" />, label: 'Custom JS', desc: 'Add interactive logic' },
                          ]).map(item => (
                            <button
                              key={item.type}
                              onClick={() => { addWidget(item.type as WidgetType); setShowAddElementDropdown(false); }}
                              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-neutral-800 transition-colors text-left cursor-pointer"
                            >
                              <span className="text-pink-400 shrink-0">{item.icon}</span>
                              <div>
                                <div className="text-sm font-semibold text-neutral-50">{item.label}</div>
                                <div className="text-[10px] text-neutral-500">{item.desc}</div>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={handleSaveDashboard}
                      className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-5 py-2 rounded-xl font-bold transition-all shadow-lg shadow-orange-600/10 cursor-pointer"
                    >
                      <Save className="w-4 h-4" /> Save
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Dashboard Body Area - Outer Flex container */}
          <div className={`flex-1 flex min-h-0 ${(isHeaderDisabled || isPreviewMode) ? '' : 'mt-4'} ${tabPosition === 'left' || tabPosition === 'right' ? 'flex-row' : 'flex-col'} relative`}>

            {/* Floating Expand Handles */}
            {tabBarCollapseEnabled && isTabBarCollapsed && (
              <>
                {tabPosition === 'left' && (
                  <button
                    onClick={() => setIsTabBarCollapsed(false)}
                    className="absolute right-4 top-4 z-30 w-8 h-8 rounded-full bg-neutral-900 border border-neutral-800/80 flex items-center justify-center text-neutral-400 hover:text-orange-500 hover:border-orange-500/40 shadow-xl transition-all hover:scale-110 active:scale-95 group/expand-btn cursor-pointer"
                    title="Expand Tab Bar"
                  >
                    <ChevronRight className="w-4 h-4 transition-transform group-hover/expand-btn:translate-x-0.5" />
                  </button>
                )}
                {tabPosition === 'right' && (
                  <button
                    onClick={() => setIsTabBarCollapsed(false)}
                    className="absolute right-4 top-4 z-30 w-8 h-8 rounded-full bg-neutral-900 border border-neutral-800/80 flex items-center justify-center text-neutral-400 hover:text-orange-500 hover:border-orange-500/40 shadow-xl transition-all hover:scale-110 active:scale-95 group/expand-btn cursor-pointer"
                    title="Expand Tab Bar"
                  >
                    <ChevronLeft className="w-4 h-4 transition-transform group-hover/expand-btn:-translate-x-0.5" />
                  </button>
                )}
                {tabPosition === 'top' && (
                  <button
                    onClick={() => setIsTabBarCollapsed(false)}
                    className="absolute right-4 top-4 z-30 w-8 h-8 rounded-full bg-neutral-900 border border-neutral-800/80 flex items-center justify-center text-neutral-400 hover:text-orange-500 hover:border-orange-500/40 shadow-xl transition-all hover:scale-110 active:scale-95 group/expand-btn cursor-pointer"
                    title="Expand Tab Bar"
                  >
                    <ChevronDown className="w-4 h-4 transition-transform group-hover/expand-btn:translate-y-0.5" />
                  </button>
                )}
                {tabPosition === 'bottom' && (
                  <button
                    onClick={() => setIsTabBarCollapsed(false)}
                    className="absolute right-4 bottom-4 z-30 w-8 h-8 rounded-full bg-neutral-900 border border-neutral-800/80 flex items-center justify-center text-neutral-400 hover:text-orange-500 hover:border-orange-500/40 shadow-xl transition-all hover:scale-110 active:scale-95 group/expand-btn cursor-pointer"
                    title="Expand Tab Bar"
                  >
                    <ChevronUp className="w-4 h-4 transition-transform group-hover/expand-btn:-translate-y-0.5" />
                  </button>
                )}
              </>
            )}

            {/* Left Tab Bar */}
            {tabPosition === 'left' && !mainFrameId && (
              <div
                className="shrink-0 flex flex-col overflow-y-auto border-r"
                style={{ 
                  width: (isTabBarCollapsed && tabBarCollapseEnabled) ? 0 : tabBarSize,
                  justifyContent: tabAlign === 'center' ? 'center' : tabAlign === 'end' ? 'flex-end' : 'flex-start',
                  paddingLeft: (isTabBarCollapsed && tabBarCollapseEnabled) ? 0 : undefined,
                  paddingRight: (isTabBarCollapsed && tabBarCollapseEnabled) ? 0 : undefined,
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  overflow: 'hidden',
                  backgroundColor: tabBarBgColor !== 'transparent' ? tabBarBgColor : undefined,
                  borderColor: tabBarBorderColor !== 'transparent' ? tabBarBorderColor : 'rgba(23, 23, 23, 0.6)'
                }}
              >
                <div className="flex flex-col p-4 flex-1" style={{ gap: `${tabGap}px`, minWidth: tabBarSize - 32 }}>
                  {dashboardTabs.map(tab => renderTabItem(tab, false))}
                  {isEditMode && renderAddTabButton()}

                  {tabBarCollapseEnabled && (
                    <button 
                      onClick={() => setIsTabBarCollapsed(true)}
                      className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-neutral-500 hover:text-neutral-200 bg-neutral-950/20 hover:bg-neutral-800/40 border border-neutral-850 hover:border-neutral-800 rounded-xl transition-all duration-200 cursor-pointer shrink-0 mt-auto"
                      style={{ borderRadius: `${tabBorderRadius}px` }}
                      title="Collapse Tab Bar"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" /> <span>Collapse</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Central Vertical Container (Top Bar + Canvas + Bottom Bar) */}
            <div className={`flex-1 flex flex-col min-h-0 ${tabPosition === 'right' ? 'order-first' : ''}`}>

              {/* Top Tab Bar */}
              {tabPosition === 'top' && !mainFrameId && (
                <div
                  className={`border-b border-neutral-900/60 shrink-0 flex items-center gap-4 px-8 ${
                    tabBarPinned 
                      ? (isPreviewMode ? 'sticky top-0 z-40 bg-neutral-900/90 backdrop-blur-md' : 'sticky top-20 z-40 bg-neutral-900/90 backdrop-blur-md') 
                      : 'bg-transparent relative'
                  }`}
                  style={{ 
                    height: (isTabBarCollapsed && tabBarCollapseEnabled) ? 0 : tabBarSize,
                    paddingTop: (isTabBarCollapsed && tabBarCollapseEnabled) ? 0 : undefined,
                    paddingBottom: (isTabBarCollapsed && tabBarCollapseEnabled) ? 0 : undefined,
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    overflow: 'hidden',
                    backgroundColor: tabBarBgColor !== 'transparent' ? tabBarBgColor : undefined,
                    borderColor: tabBarBorderColor !== 'transparent' ? tabBarBorderColor : undefined
                  }}
                >
                  <div className="flex flex-1 items-center justify-between min-w-0" style={{ height: tabBarSize - 24 }}>
                    <div className={`flex flex-1 flex-wrap items-center ${tabAlign === 'center' ? 'justify-center' : tabAlign === 'end' ? 'justify-end' : 'justify-start'}`} style={{ gap: `${tabGap}px` }}>
                      {dashboardTabs.map(tab => renderTabItem(tab, true))}
                      {isEditMode && renderAddTabButton()}
                    </div>
                    {tabBarCollapseEnabled && (
                      <button 
                        onClick={() => setIsTabBarCollapsed(true)}
                        className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-neutral-500 hover:text-neutral-200 bg-neutral-950/20 hover:bg-neutral-800/40 border border-neutral-850 hover:border-neutral-800 rounded-xl transition-all duration-200 cursor-pointer shrink-0 ml-4"
                        style={{ borderRadius: `${tabBorderRadius}px` }}
                        title="Collapse Tab Bar"
                      >
                        <ChevronUp className="w-3.5 h-3.5" /> <span>Collapse</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              <input
                type="file"
                ref={widgetImageInputRef}
                onChange={handleImageUpload}
                accept="image/*,.ico"
                className="hidden"
              />

              {/* Free-Form Canvas */}
              <div
                className={`flex-1 relative ${(layoutMode === 'whiteboard' || (isPreviewMode && mainFrameId)) ? 'overflow-hidden' : 'overflow-visible'}`}
                style={{
                  backgroundColor: isPreviewMode 
                    ? (selectedDashboard?.theme_config?.canvasBg || '#f8f9fa') 
                    : (layoutMode === 'slide' 
                      ? '#ffffff' // White editor pasteboard background for Slide mode
                      : (selectedDashboard?.theme_config?.canvasBg || '#f8f9fa')),
                  cursor: layoutMode === 'whiteboard' ? (spacePressed ? (isPanningRef.current.active ? 'grabbing' : 'grab') : 'default') : 'default'
                }}
                ref={gridContainerRef}
                onDragOver={isEditMode ? (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; } : undefined}
                onDrop={isEditMode ? handleGridDrop : undefined}
                onWheel={handleWheel}
                onMouseDown={handleCanvasMouseDown}
              >
                {/* Whiteboard dot-grid background */}
                {layoutMode === 'whiteboard' && !isPreviewMode && (
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)`,
                      backgroundSize: `${20 * zoom}px ${20 * zoom}px`,
                      backgroundPosition: `${pan.x % (20 * zoom)}px ${pan.y % (20 * zoom)}px`
                    }}
                  />
                )}

                {/* Alignment Guides */}
                {isEditMode && alignmentGuides.map((guide, idx) => (
                  <div
                    key={idx}
                    className="absolute pointer-events-none z-[2000] border-fuchsia-500"
                    style={{
                      left: guide.x !== undefined ? guide.x * zoom + pan.x : 0,
                      top: guide.y !== undefined ? guide.y * zoom + pan.y : 0,
                      width: guide.type === 'v' ? '1px' : '4000px',
                      height: guide.type === 'h' ? '1px' : '4000px',
                      marginLeft: guide.type === 'h' ? '-2000px' : '0',
                      marginTop: guide.type === 'v' ? '-2000px' : '0',
                      borderStyle: 'dashed',
                      borderWidth: guide.type === 'v' ? '0 0 0 1px' : '1px 0 0 0',
                    }}
                  />
                ))}

                {/* Zoom Controls Toolbar (Whiteboard only) */}
                {layoutMode === 'whiteboard' && !isPreviewMode && (
                  <div
                    className="absolute z-50 flex items-center gap-1 bg-neutral-900/90 border border-neutral-800 rounded-xl px-1.5 py-1.5 shadow-xl backdrop-blur-md group/toolbar bottom-6 left-1/2 -translate-x-1/2"
                  >
                    <button
                      onClick={() => { const nz = Math.max(0.15, zoom * 0.85); const rect = gridContainerRef.current?.getBoundingClientRect(); if (rect) { const cx = rect.width / 2; const cy = rect.height / 2; setPan({ x: cx - (cx - pan.x) * (nz / zoom), y: cy - (cy - pan.y) * (nz / zoom) }); } setZoom(nz); }}
                      className="w-7 h-7 flex items-center justify-center text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors text-sm font-bold"
                    >−</button>
                    <span className="text-[10px] font-mono text-neutral-300 w-10 text-center select-none">{Math.round(zoom * 100)}%</span>
                    <button
                      onClick={() => { const nz = Math.min(4, zoom * 1.15); const rect = gridContainerRef.current?.getBoundingClientRect(); if (rect) { const cx = rect.width / 2; const cy = rect.height / 2; setPan({ x: cx - (cx - pan.x) * (nz / zoom), y: cy - (cy - pan.y) * (nz / zoom) }); } setZoom(nz); }}
                      className="w-7 h-7 flex items-center justify-center text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors text-sm font-bold"
                    >+</button>
                    <div className="w-px h-5 bg-neutral-700 mx-0.5" />
                    <button
                      onClick={() => setInteractionMode('select')}
                      className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${interactionMode === 'select' ? 'bg-orange-600 text-white' : 'text-neutral-400 hover:text-white hover:bg-neutral-800'}`}
                      title="Selection Mode"
                    >
                      <MousePointer2 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => setInteractionMode('pan')}
                      className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${interactionMode === 'pan' ? 'bg-orange-600 text-white' : 'text-neutral-400 hover:text-white hover:bg-neutral-800'}`}
                      title="Pan Mode"
                    >
                      <Hand className="w-3 h-3" />
                    </button>
                    <div className="w-px h-5 bg-neutral-700 mx-0.5" />
                    <button
                      onClick={() => fitToContent(isPreviewMode ? 0 : 80)}
                      className="px-1.5 h-7 flex items-center justify-center text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors text-[9px] font-bold uppercase tracking-wider"
                    >Fit</button>
                    <button
                      onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
                      className="px-1.5 h-7 flex items-center justify-center text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors text-[9px] font-bold"
                    >100%</button>
                    <div className="w-px h-5 bg-neutral-700 mx-0.5" />
                    <div className="relative" ref={addFrameDropdownRef}>
                      <button
                        onClick={() => setShowAddFrameDropdown(!showAddFrameDropdown)}
                        className={`px-2 h-7 flex items-center gap-1.5 rounded-lg transition-colors text-[9px] font-bold uppercase tracking-wider ${showAddFrameDropdown ? 'bg-orange-600 text-white' : 'text-neutral-400 hover:text-white hover:bg-neutral-800'}`}
                      >
                        <Columns2 className="w-3 h-3" />
                        Add Frame
                      </button>

                      {showAddFrameDropdown && (
                        <div className="absolute bottom-full mb-2 left-0 w-48 bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl overflow-hidden py-1 z-[10001]">
                          <div className="px-3 py-1.5 border-b border-neutral-800 mb-1">
                            <span className="text-[10px] font-bold text-neutral-500 uppercase">Screen Sizes</span>
                          </div>
                          {FRAME_SIZES.map(size => (
                            <button
                              key={size.name}
                              onClick={() => handleAddFrame(size)}
                              className="w-full px-3 py-2 text-left hover:bg-neutral-800 flex flex-col gap-0.5 transition-colors"
                            >
                              <span className="text-[11px] font-bold text-neutral-200">{size.name}</span>
                              <span className="text-[9px] text-neutral-500 font-mono">{size.w} x {size.h} px</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {dashboardItems.filter(item => (item.tabId || 'default') === activeTabId).length === 0 &&
                  dashboardWidgets.filter(w => (w.tabId || 'default') === activeTabId).length === 0 ? (
                  <div className={`m-8 min-h-[400px] flex flex-col items-center justify-center text-center p-12 bg-neutral-900/10 rounded-3xl border-2 border-dashed transition-colors ${draggedChart ? 'border-orange-400 bg-orange-500/5' : 'border-neutral-800'
                    }`}>
                    <LayoutDashboard className={`w-16 h-16 mb-4 stroke-1 animate-pulse ${draggedChart ? 'text-orange-500' : 'text-neutral-700'}`} />
                    <h3 className="text-lg font-bold text-neutral-400">
                      {draggedChart ? `Drop "${draggedChart.name}" here` : 'Empty Tab'}
                    </h3>
                    <p className="text-neutral-500 text-sm mt-1 max-w-sm">
                      {isEditMode
                        ? draggedChart ? 'Release to add this chart to the dashboard.' : "Drag a chart from the sidebar, click 'Add Chart', or use 'Add Element' to build your dashboard tab."
                        : "No charts added to this tab yet. Switch to Edit mode to build this tab."}
                    </p>
                  </div>
                ) : (
                  // Pixel-based free-form canvas — wrapped in zoom/pan transform for whiteboard
                  <div
                    className="relative shrink-0"
                    style={{
                      transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                      transformOrigin: '0 0',
                      backgroundColor: layoutMode === 'slide' ? (selectedDashboard?.theme_config?.canvasBg || '#f8f9fa') : 'transparent',
                      boxShadow: (layoutMode === 'slide' && !isPreviewMode) ? '0 25px 50px -12px rgba(0, 0, 0, 0.5)' : 'none',
                      ...(layoutMode === 'whiteboard' ? {
                        width: 'max-content',
                        minWidth: '100%',
                        minHeight: '100%',
                      } : {
                        width: '1280px',
                        minHeight: isPreviewMode 
                          ? `${tabBoundingBox.maxY - tabBoundingBox.minY}px`
                          : Math.max(
                              720,
                              ...dashboardItems.filter(i => (i.tabId || 'default') === activeTabId).map(i => (i.pos?.y ?? 0) + (i.pos?.h ?? 360) + 40),
                              ...dashboardWidgets.filter(w => (w.tabId || 'default') === activeTabId).map(w => (w.pos?.y ?? 0) + (w.pos?.h ?? 40) + 40)
                            )
                      })
                    }}
                    onMouseDown={handleCanvasMouseDown}
                  >
                    {/* Slide mode dashed orange boundaries */}
                    {layoutMode === 'slide' && !isPreviewMode && (
                      <>
                        <div
                          className="absolute top-0 bottom-0 pointer-events-none z-[9999]"
                          style={{
                            left: 0,
                            width: 0,
                            borderLeft: '2px dashed #f97316',
                          }}
                        />
                        <div
                          className="absolute top-0 bottom-0 pointer-events-none z-[9999]"
                          style={{
                            left: '1280px',
                            width: 0,
                            borderLeft: '2px dashed #f97316',
                          }}
                        />
                      </>
                    )}
                    {/* Marquee Selection Box */}
                    {selectionBox && !isPreviewMode && (
                      <div
                        style={{
                          position: 'absolute',
                          left: Math.min(selectionBox.x1, selectionBox.x2),
                          top: Math.min(selectionBox.y1, selectionBox.y2),
                          width: Math.abs(selectionBox.x2 - selectionBox.x1),
                          height: Math.abs(selectionBox.y2 - selectionBox.y1),
                          backgroundColor: 'rgba(249, 115, 22, 0.1)',
                          border: '1px solid var(--color-orange-500)',
                          zIndex: 9999,
                          pointerEvents: 'none',
                        }}
                      />
                    )}

                    {/* Whiteboard bounding box rectangle — removed: was incorrectly wrapping elements */}

                    {dashboardFrames.filter(f => (f.tabId || 'default') === activeTabId).map(frame => (
                      <div
                        key={frame.id}
                        style={{
                          position: 'absolute',
                          left: frame.pos.x,
                          top: frame.pos.y,
                          width: frame.pos.w,
                          height: frame.pos.h,
                          border: frame.borderColor ? `${frame.borderWidth || 2}px ${frame.borderStyle || 'solid'} ${frame.borderColor}` : (isEditMode ? (mainFrameId === frame.id ? '4px solid #f97316' : '2px dashed #404040') : (mainFrameId === frame.id ? '2px solid transparent' : 'none')),
                          zIndex: 0, // Frames stay in background
                          pointerEvents: isEditMode ? 'auto' : 'none',
                          backgroundColor: frame.bgColor || (isEditMode ? 'rgba(255, 255, 255, 0.02)' : 'transparent'),
                          borderRadius: frame.borderRadius ? `${frame.borderRadius}px` : 0,
                          boxShadow: frame.boxShadow || 'none',
                          opacity: frame.opacity !== undefined ? frame.opacity : 1,
                          backgroundImage: frame.bgImage ? `url(${frame.bgImage})` : 'none',
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                        }}
                        className={`group ${isEditMode ? 'cursor-move' : ''}`}
                        onMouseDown={isEditMode ? (e) => startFrameDrag(e, frame.id) : undefined}
                      >
                        {/* Frame Label */}
                        {isEditMode && (
                          <div className="absolute -top-7 left-0 flex items-center gap-2 bg-neutral-900 px-2 py-1 rounded-t-lg border border-b-0 border-neutral-800">
                          <span className={`text-[10px] font-bold uppercase tracking-widest ${mainFrameId === frame.id ? 'text-orange-500' : 'text-neutral-500'}`}>
                            {frame.name} {mainFrameId === frame.id ? '(Main Screen)' : ''}
                          </span>
                          <span className="text-[9px] text-neutral-600 font-mono">{frame.pos.w}x{frame.pos.h}</span>
                          
                          <div className="flex items-center gap-1.5 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={(e) => { e.stopPropagation(); setMainFrameId(frame.id === mainFrameId ? null : frame.id); }}
                                className={`p-1 rounded hover:bg-neutral-800 transition-colors ${mainFrameId === frame.id ? 'text-orange-500' : 'text-neutral-500'}`}
                                title="Set as Main Screen"
                              >
                                <Eye className="w-3 h-3" />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); setStylingFrameId(frame.id); setShowFrameStyleModal(true); setShowWidgetStyleModal(false); setShowTabSettings(false); }}
                                className="p-1 rounded hover:bg-neutral-800 text-neutral-500 hover:text-orange-500 transition-colors"
                                title="Frame Settings"
                              >
                                <Settings2 className="w-3 h-3" />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDeleteFrame(frame.id); }}
                                className="p-1 rounded hover:bg-neutral-800 text-neutral-500 hover:text-red-400 transition-colors"
                                title="Delete Frame"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Resize Handle */}
                        {isEditMode && (
                          <div
                            onMouseDown={(e) => startFrameResize(e, frame.id)}
                            className="absolute bottom-0 right-0 w-6 h-6 cursor-se-resize flex items-end justify-end p-1 text-neutral-500 hover:text-orange-500 transition-colors z-10"
                            title="Resize Frame"
                          >
                            <svg viewBox="0 0 10 10" className="w-3 h-3" fill="currentColor">
                              <path d="M0 10 L10 10 L10 0 Z" />
                            </svg>
                          </div>
                        )}
                      </div>
                    ))}

                    {/* Floating / Frame-Attached Tab Bar */}
                    {(tabPosition === 'custom' || (mainFrameId && ['top', 'bottom', 'left', 'right'].includes(tabPosition))) && (
                      <div
                        style={{
                          position: 'absolute',
                          ...( ( (tabPosition === 'custom' && tabFrameId) || (tabPosition !== 'custom' && mainFrameId) ) ? (() => {
                            const targetId = tabPosition === 'custom' ? tabFrameId : mainFrameId;
                            const targetPos = tabPosition === 'custom' ? tabFramePosition : tabPosition;
                            const f = dashboardFrames.find(f => f.id === targetId) || dashboardWidgets.find(w => w.id === targetId);
                            if (!f) return { left: customTabRect.x, top: customTabRect.y, width: customTabRect.w, height: customTabRect.h, zIndex: 1000 };
                            
                            const barSize = tabBarSize;
                            const spacing = 10;
                            
                            if (targetPos === 'top') {
                              return { left: f.pos.x, top: f.pos.y - barSize - spacing, width: f.pos.w, height: barSize, zIndex: 1000 };
                            } else if (targetPos === 'bottom') {
                              return { left: f.pos.x, top: f.pos.y + f.pos.h + spacing, width: f.pos.w, height: barSize, zIndex: 1000 };
                            } else if (targetPos === 'left') {
                              return { left: f.pos.x - barSize - spacing, top: f.pos.y, width: barSize, height: f.pos.h, zIndex: 1000 };
                            } else { // right
                              return { left: f.pos.x + f.pos.w + spacing, top: f.pos.y, width: barSize, height: f.pos.h, zIndex: 1000 };
                            }
                          })() : {
                            left: customTabRect.x,
                            top: customTabRect.y,
                            width: customTabRect.w,
                            height: customTabRect.h,
                            zIndex: 1000,
                          }),
                          backgroundColor: tabBarBgColor !== 'transparent' ? tabBarBgColor : 'rgba(23, 23, 23, 0.75)',
                          backdropFilter: 'blur(12px)',
                          border: isEditMode 
                            ? `2px solid ${tabBarBorderColor !== 'transparent' ? tabBarBorderColor : 'var(--color-orange-500)'}` 
                            : `1px solid ${tabBarBorderColor !== 'transparent' ? tabBarBorderColor : 'rgba(63, 63, 70, 0.4)'}`,
                        }}
                        className="rounded-2xl shadow-2xl flex flex-col overflow-hidden group transition-all duration-300"
                      >
                        {isEditMode && !tabFrameId && tabPosition === 'custom' && (
                          <div
                            className="bg-orange-500/10 border-b border-orange-500/20 px-3 py-1 flex items-center justify-between cursor-move"
                            onMouseDown={startCustomTabDrag}
                          >
                            <span className="text-[9px] font-bold text-orange-500 uppercase tracking-tighter">Custom Tab Bar</span>
                            <div className="flex gap-1">
                              <LayoutDashboard className="w-2.5 h-2.5 text-orange-500" />
                            </div>
                          </div>
                        )}
                        <div 
                          className={`flex-1 p-2 overflow-auto flex ${(() => {
                            const targetId = tabPosition === 'custom' ? tabFrameId : mainFrameId;
                            const targetPos = tabPosition === 'custom' ? tabFramePosition : tabPosition;
                            return (targetId && (targetPos === 'top' || targetPos === 'bottom')) || (!targetId && customTabRect.w >= customTabRect.h);
                          })() ? 'flex-row items-center' : 'flex-col'}`}
                          style={{ gap: `${tabGap}px` }}
                        >
                          {dashboardTabs.map(tab => renderTabItem(tab, (() => {
                            const targetId = tabPosition === 'custom' ? tabFrameId : mainFrameId;
                            const targetPos = tabPosition === 'custom' ? tabFramePosition : tabPosition;
                            return (targetId && (targetPos === 'top' || targetPos === 'bottom')) || (!targetId && customTabRect.w >= customTabRect.h);
                          })()))}
                          {isEditMode && renderAddTabButton()}
                        </div>

                        {/* Resize Handles - only for floating */}
                        {isEditMode && !tabFrameId && tabPosition === 'custom' && (
                          <>
                            <div onMouseDown={e => startCustomTabResize(e, 'e')} className="absolute top-6 right-0 w-1.5 h-[calc(100%-24px)] cursor-ew-resize" />
                            <div onMouseDown={e => startCustomTabResize(e, 's')} className="absolute bottom-0 left-0 w-full h-1.5 cursor-ns-resize" />
                            <div onMouseDown={e => startCustomTabResize(e, 'se')} className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize flex items-end justify-end pr-0.5 pb-0.5">
                              <Maximize2 className="w-2.5 h-2.5 text-orange-500" />
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    {/* ---- Chart Items ---- */}
                    {dashboardItems.filter(item => (item.tabId || 'default') === activeTabId).map(item => {
                      if (!item.chart || !item.pos) return null;

                      const filteredData = getFilteredData(item);
                      let evaluatedOption = item.chart.echarts_option || {};
                      if (item.chart.transform_config?.code) {
                        const context = {
                          setFilter: (col: string, val: string) => {
                            setDashboardWidgets(prev => prev.map(w => 
                              (w.itemType === 'filter' && w.filterColumn === col) ? { ...w, activeValue: val } : w
                            ));
                          },
                          switchTab: (tabId: string) => handleSelectTab(tabId),
                          notify: (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
                            if (type === 'success') Sonner.toast.success(msg);
                            else if (type === 'error') Sonner.toast.error(msg);
                            else Sonner.toast(msg);
                          }
                        };
                        const evalResult = evaluateEChartsCode(item.chart.transform_config.code, filteredData, context);
                        if (!evalResult.error) evaluatedOption = evalResult.option;
                      }
                      const config = {
                        chartType: item.chart.chart_type,
                        encodings: item.chart.encodings,
                        echartsOption: evaluatedOption
                      };

                      return (
                        <div
                          key={item.id}
                          style={{
                            position: 'absolute',
                            left: item.pos.x,
                            top: item.pos.y,
                            width: item.pos.w,
                            height: item.pos.h,
                            zIndex: item.zIndex || 1,
                            backgroundColor: selectedDashboard?.theme_config?.chartBg || undefined,
                            borderColor: (selectedItemId === item.id || selectedItemIds.includes(item.id)) ? 'var(--color-orange-500)' : (selectedDashboard?.theme_config?.chartBorderColor || undefined),
                            borderWidth: (selectedItemId === item.id || selectedItemIds.includes(item.id)) ? '2px' : undefined,
                            borderRadius: selectedDashboard?.theme_config?.chartBorderRadius ? `${selectedDashboard.theme_config.chartBorderRadius}px` : undefined,
                            boxShadow: selectedDashboard?.theme_config?.chartShadow || undefined
                            }}
                            className={`bg-neutral-900 border flex flex-col overflow-hidden shadow-lg group
                            hover:border-neutral-700/60 hover:shadow-2xl transition-[border-color,box-shadow] ${(selectedItemId === item.id || selectedItemIds.includes(item.id)) ? 'border-orange-500 ring-2 ring-orange-500/20' : 'border-neutral-800/80'}`}
                            onMouseDown={isEditMode ? (e) => {
                            setSelectedItemId(item.id);
                            setSelectedItemIds([item.id]);
                            setSelectedWidgetId(null);
                            setSelectedWidgetIds([]);
                            if (item.hideHeader) startDrag(e, item.id);
                            } : undefined}
                            >
                          {/* Title bar — drag handle */}
                          {!item.hideHeader && (
                            <div
                              className={`flex justify-between items-center px-4 py-3 shrink-0 border-b border-neutral-800/60 ${isEditMode ? 'cursor-move select-none' : ''
                                }`}
                              onMouseDown={isEditMode ? (e) => startDrag(e, item.id) : undefined}
                            >
                              {isEditMode && (
                                <span className="text-neutral-600 text-xs mr-2 shrink-0">⠿⠿</span>
                              )}
                              <h3 className="font-bold text-orange-400 truncate flex-1">{item.chart.name}</h3>
                              {isEditMode && (
                                <div className="flex items-center gap-1.5 shrink-0">
                                  {dashboardTabs.length > 1 && (
                                    <select
                                      onMouseDown={e => e.stopPropagation()}
                                      value={item.tabId || 'default'}
                                      onChange={e => {
                                        const targetTabId = e.target.value;
                                        setDashboardItems(prev => prev.map(i => i.id === item.id ? { ...i, tabId: targetTabId } : i));
                                      }}
                                      className="bg-neutral-850 border border-neutral-800 text-[10px] text-neutral-300 rounded px-1.5 py-0.5 focus:outline-none cursor-pointer focus:border-orange-500 max-w-[80px]"
                                      title="Move to Tab"
                                    >
                                      {dashboardTabs.map(t => (
                                        <option key={t.id} value={t.id} className="bg-neutral-900 text-neutral-300">{t.name}</option>
                                      ))}
                                    </select>
                                  )}
                                  <button
                                    onMouseDown={e => e.stopPropagation()}
                                    onClick={(e) => { e.stopPropagation(); handleOpenDirectChartEditor(item); }}
                                    className="text-neutral-500 hover:text-orange-500 p-1 hover:bg-neutral-800/80 rounded-lg transition-colors cursor-pointer"
                                    title="Edit Chart Code"
                                  >
                                    <PenTool className="w-4 h-4" />
                                  </button>
                                  <button
                                    onMouseDown={e => e.stopPropagation()}
                                    onClick={(e) => { e.stopPropagation(); handleRemoveChartFromDashboard(item.id); }}
                                    className="text-neutral-500 hover:text-red-400 p-1 hover:bg-neutral-800/80 rounded-lg transition-colors cursor-pointer"
                                    title="Remove Chart"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Floating controls when header is hidden in Edit Mode */}
                          {isEditMode && item.hideHeader && (
                            <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                              <button
                                onMouseDown={e => e.stopPropagation()}
                                onClick={(e) => { e.stopPropagation(); handleOpenDirectChartEditor(item); }}
                                className="bg-neutral-800/80 text-neutral-400 hover:text-orange-500 p-1.5 rounded-lg transition-colors cursor-pointer shadow-lg"
                                title="Edit Chart Code"
                              >
                                <PenTool className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onMouseDown={e => e.stopPropagation()}
                                onClick={(e) => { e.stopPropagation(); handleRemoveChartFromDashboard(item.id); }}
                                className="bg-neutral-800/80 text-neutral-400 hover:text-red-400 p-1.5 rounded-lg transition-colors cursor-pointer shadow-lg"
                                title="Remove Chart"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}

                          {/* Chart area */}
                          <div className="flex-1 relative min-h-0">
                            <div className="absolute inset-0 p-2 flex items-center justify-center">
                              {!hasChartPermission(item.chart.id) ? (
                                <div className="flex flex-col items-center justify-center text-center p-4 h-full w-full bg-neutral-900/50 rounded-lg border border-dashed border-neutral-800">
                                  <ShieldX className="w-8 h-8 text-neutral-600 mb-2" />
                                  <p className="text-sm font-semibold text-neutral-400">No Permission</p>
                                  <p className="text-xs text-neutral-500 mt-1 max-w-[200px]">You don't have access to view this chart's data.</p>
                                </div>
                              ) : (
                                <EChartRenderer config={config} data={filteredData} />
                              )}
                            </div>
                          </div>

                          {/* Resize handles — only in edit mode */}
                          {isEditMode && (
                            <>
                              {/* Edges */}
                              <div onMouseDown={e => startResize(e, item.id, 'e')} className="absolute top-8 right-0 w-2 h-[calc(100%-36px)] cursor-ew-resize z-10" />
                              <div onMouseDown={e => startResize(e, item.id, 's')} className="absolute bottom-0 left-6 w-[calc(100%-24px)] h-2 cursor-ns-resize z-10" />
                              <div onMouseDown={e => startResize(e, item.id, 'w')} className="absolute top-8 left-0 w-2 h-[calc(100%-36px)] cursor-ew-resize z-10" />
                              <div onMouseDown={e => startResize(e, item.id, 'n')} className="absolute top-[36px] left-0 w-full h-2 cursor-ns-resize z-10" />
                              {/* Corners */}
                              <div onMouseDown={e => startResize(e, item.id, 'se')} className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize z-20 flex items-end justify-end pr-1 pb-1">
                                <svg viewBox="0 0 8 8" className="w-3 h-3 text-neutral-600 opacity-70 group-hover:opacity-100 transition-opacity" fill="currentColor">
                                  <rect x="4" y="0" width="2" height="8" rx="1" /><rect x="0" y="4" width="8" height="2" rx="1" />
                                </svg>
                              </div>
                              <div onMouseDown={e => startResize(e, item.id, 'sw')} className="absolute bottom-0 left-0 w-4 h-4 cursor-sw-resize z-20" />
                              <div onMouseDown={e => startResize(e, item.id, 'ne')} className="absolute top-[36px] right-0 w-4 h-4 cursor-ne-resize z-20" />
                              <div onMouseDown={e => startResize(e, item.id, 'nw')} className="absolute top-[36px] left-0 w-4 h-4 cursor-nw-resize z-20" />
                            </>
                          )}
                        </div>
                      );
                    })}

                    {/* ---- Widget Items (non-chart elements) ---- */}
                    {dashboardWidgets.filter(widget => (widget.tabId || 'default') === activeTabId).map(widget => {
                      const isHeading = widget.itemType === 'heading';
                      const isText = widget.itemType === 'text';
                      const isDivider = widget.itemType === 'divider';
                      const isImage = widget.itemType === 'image';
                      const isFilter = widget.itemType === 'filter';
                      const isCode = widget.itemType === 'code';
                      const isShape = widget.itemType === 'rectangle' || widget.itemType === 'circle';
                      const isEditing = editingWidgetId === widget.id;

                      return (
                        <div
                          key={widget.id}
                          style={{
                            position: 'absolute',
                            left: widget.pos.x,
                            top: widget.pos.y,
                            width: widget.pos.w,
                            height: widget.pos.h,
                            background: widget.bgGradient || (widget.bgColor === 'rgba(30,30,40,0.6)' ? 'var(--color-neutral-900)' : (widget.bgColor === 'rgba(255,255,255,0.1)' ? 'var(--color-neutral-800)' : widget.bgColor)),
                            border: (selectedWidgetId === widget.id || selectedWidgetIds.includes(widget.id))
                              ? '2px solid var(--color-orange-500)'
                              : (widget.borderStyle && widget.borderStyle !== 'none'
                                ? `${widget.borderWidth || 2}px ${widget.borderStyle} ${widget.borderColor === 'rgba(255,255,255,0.1)' ? 'var(--color-neutral-800)' : (widget.borderColor || 'transparent')}`
                                : (widget.borderColor && widget.borderColor !== 'transparent'
                                  ? `2px solid ${widget.borderColor === 'rgba(255,255,255,0.1)' ? 'var(--color-neutral-800)' : widget.borderColor}`
                                  : undefined)),
                            borderRadius: widget.borderRadius,
                            opacity: widget.opacity !== undefined ? widget.opacity : 1,
                            zIndex: widget.zIndex || 1,
                            boxShadow: (selectedWidgetId === widget.id || selectedWidgetIds.includes(widget.id)) ? '0 0 0 4px rgba(249, 115, 22, 0.2)' : (widget.boxShadow === 'sm' ? '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                              : widget.boxShadow === 'md' ? '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                                : widget.boxShadow === 'lg' ? '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
                                  : widget.boxShadow === 'xl' ? '0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
                                    : undefined),
                            backdropFilter: widget.backdropBlur === 'sm' ? 'blur(4px)'
                              : widget.backdropBlur === 'md' ? 'blur(8px)'
                                : widget.backdropBlur === 'lg' ? 'blur(16px)'
                                  : undefined,
                            }}
                            className={`group ${isEditMode ? 'cursor-move' : ''} ${(isHeading || isText || isShape) ? 'overflow-hidden' : ''} ${(selectedWidgetId === widget.id || selectedWidgetIds.includes(widget.id)) ? 'ring-2 ring-orange-500/50' : ''}`}
                            onMouseDown={isEditMode && !isEditing ? (e) => {
                            setSelectedWidgetId(widget.id);
                            setSelectedWidgetIds([widget.id]);
                            setSelectedItemId(null);
                            setSelectedItemIds([]);
                            startWidgetDrag(e, widget.id);
                            } : undefined}
                            >
                          {/* Shape Widget (Rectangle/Circle) Text Rendering */}
                          {isShape && widget.text && (
                            <div
                              className={`w-full h-full flex items-center justify-center select-none overflow-hidden`}
                              style={{
                                padding: widget.padding !== undefined ? `${widget.padding}px` : '12px',
                                textAlign: widget.textAlign || 'center'
                              }}
                            >
                              {isEditing ? (
                                <textarea
                                  autoFocus
                                  value={editingWidgetText}
                                  onChange={e => setEditingWidgetText(e.target.value)}
                                  onBlur={() => {
                                    setDashboardWidgets(prev => prev.map(w => w.id === widget.id ? { ...w, text: editingWidgetText } : w));
                                    setEditingWidgetId(null);
                                  }}
                                  className="bg-transparent w-full h-full outline-none resize-none"
                                  style={{
                                    cursor: 'text',
                                    fontSize: widget.fontSize ? `${widget.fontSize}px` : '1rem',
                                    color: widget.color || 'var(--color-neutral-50)',
                                    textAlign: widget.textAlign || 'center',
                                    fontWeight: widget.fontWeight || '600',
                                    fontStyle: widget.fontStyle || 'normal',
                                    textDecoration: widget.textDecoration || 'none',
                                    fontFamily: widget.fontFamily || 'inherit'
                                  }}
                                  onMouseDown={e => e.stopPropagation()}
                                />
                              ) : (
                                <span
                                  className="whitespace-pre-wrap break-words"
                                  style={{
                                    fontSize: widget.fontSize ? `${widget.fontSize}px` : '1rem',
                                    fontWeight: widget.fontWeight || '600',
                                    color: widget.color || 'var(--color-neutral-50)',
                                    textAlign: widget.textAlign || 'center',
                                    fontStyle: widget.fontStyle || 'normal',
                                    textDecoration: widget.textDecoration || 'none',
                                    fontFamily: widget.fontFamily || 'inherit'
                                  }}
                                  onDoubleClick={isEditMode ? () => { setEditingWidgetId(widget.id); setEditingWidgetText(widget.text || ''); } : undefined}
                                >{widget.text}</span>
                              )}
                            </div>
                          )}

                          {/* Image Widget */}
                          {isImage && widget.src && (
                            <div className="w-full h-full p-1">
                              <img
                                src={widget.src}
                                alt="Dashboard Element"
                                className="w-full h-full select-none pointer-events-none"
                                style={{
                                  objectFit: widget.objectFit || 'contain',
                                  borderRadius: widget.borderRadius ? `${widget.borderRadius - 4}px` : 0
                                }}
                              />
                            </div>
                          )}

                          {/* Heading Widget */}
                          {isHeading && (
                            <div
                              className="w-full h-full flex items-center select-none"
                              style={{
                                justifyContent: widget.textAlign === 'center' ? 'center' : (widget.textAlign === 'right' ? 'flex-end' : 'flex-start'),
                                padding: widget.padding !== undefined ? `${widget.padding}px` : '0px 12px'
                              }}
                            >
                              {isEditing ? (
                                <input
                                  autoFocus
                                  value={editingWidgetText}
                                  onChange={e => setEditingWidgetText(e.target.value)}
                                  onBlur={() => {
                                    setDashboardWidgets(prev => prev.map(w => w.id === widget.id ? { ...w, text: editingWidgetText } : w));
                                    setEditingWidgetId(null);
                                  }}
                                  onKeyDown={e => {
                                    if (e.key === 'Enter' || e.key === 'Escape') {
                                      setDashboardWidgets(prev => prev.map(w => w.id === widget.id ? { ...w, text: editingWidgetText } : w));
                                      setEditingWidgetId(null);
                                    }
                                  }}
                                  className="bg-transparent w-full font-extrabold outline-none border-b border-orange-500/60"
                                  style={{
                                    cursor: 'text',
                                    fontSize: widget.fontSize ? `${widget.fontSize}px` : '1.5rem',
                                    color: widget.color || 'var(--color-neutral-50)',
                                    textAlign: widget.textAlign || 'left',
                                    fontWeight: widget.fontWeight || '800',
                                    fontStyle: widget.fontStyle || 'normal',
                                    textDecoration: widget.textDecoration || 'none',
                                    fontFamily: widget.fontFamily || 'inherit'
                                  }}
                                  onMouseDown={e => e.stopPropagation()}
                                />
                              ) : (
                                <span
                                  className="truncate w-full"
                                  style={{
                                    fontSize: widget.fontSize ? `${widget.fontSize}px` : '1.5rem',
                                    fontWeight: widget.fontWeight || '800',
                                    color: widget.color || 'var(--color-neutral-50)',
                                    textAlign: widget.textAlign || 'left',
                                    fontStyle: widget.fontStyle || 'normal',
                                    textDecoration: widget.textDecoration || 'none',
                                    fontFamily: widget.fontFamily || 'inherit'
                                  }}
                                  onDoubleClick={isEditMode ? () => { setEditingWidgetId(widget.id); setEditingWidgetText(widget.text || ''); } : undefined}
                                >{widget.text}</span>
                              )}
                            </div>
                          )}

                          {/* Text Widget */}
                          {isText && (
                            <div
                              className="w-full h-full flex items-start overflow-hidden select-none"
                              style={{
                                padding: widget.padding !== undefined ? `${widget.padding}px` : '12px'
                              }}
                            >
                              {isEditing ? (
                                <textarea
                                  autoFocus
                                  value={editingWidgetText}
                                  onChange={e => setEditingWidgetText(e.target.value)}
                                  onBlur={() => {
                                    setDashboardWidgets(prev => prev.map(w => w.id === widget.id ? { ...w, text: editingWidgetText } : w));
                                    setEditingWidgetId(null);
                                  }}
                                  className="bg-transparent w-full h-full outline-none resize-none"
                                  style={{
                                    cursor: 'text',
                                    fontSize: widget.fontSize ? `${widget.fontSize}px` : '0.875rem',
                                    color: widget.color || 'var(--color-neutral-300)',
                                    textAlign: widget.textAlign || 'left',
                                    fontWeight: widget.fontWeight || '400',
                                    fontStyle: widget.fontStyle || 'normal',
                                    textDecoration: widget.textDecoration || 'none',
                                    fontFamily: widget.fontFamily || 'inherit'
                                  }}
                                  onMouseDown={e => e.stopPropagation()}
                                />
                              ) : (
                                <p
                                  className="whitespace-pre-wrap w-full"
                                  style={{
                                    fontSize: widget.fontSize ? `${widget.fontSize}px` : '0.875rem',
                                    color: widget.color || 'var(--color-neutral-300)',
                                    textAlign: widget.textAlign || 'left',
                                    fontWeight: widget.fontWeight || '400',
                                    fontStyle: widget.fontStyle || 'normal',
                                    textDecoration: widget.textDecoration || 'none',
                                    fontFamily: widget.fontFamily || 'inherit'
                                  }}
                                  onDoubleClick={isEditMode ? () => { setEditingWidgetId(widget.id); setEditingWidgetText(widget.text || ''); } : undefined}
                                >{widget.text}</p>
                              )}
                            </div>
                          )}

                          {/* Divider Widget */}
                          {isDivider && (
                            <div className="w-full h-full" style={{ background: widget.bgColor }} />
                          )}

                          {/* Filter Widget */}
                          {isFilter && (
                            <div
                              className={`w-full h-full flex select-none ${widget.filterOrientation === 'horizontal' ? 'flex-row items-center justify-between gap-3' : 'flex-col justify-center'}`}
                              style={{
                                padding: widget.padding !== undefined ? `${widget.padding}px` : '8px 12px'
                              }}
                            >
                              <div
                                className="flex items-center"
                                style={{
                                  marginBottom: widget.filterOrientation === 'horizontal' ? '0px' : '6px',
                                  justifyContent: widget.textAlign === 'center' ? 'center' : (widget.textAlign === 'right' ? 'flex-end' : 'space-between')
                                }}
                              >
                                <span
                                  className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider truncate mr-2"
                                  style={{
                                    fontSize: widget.fontSize ? `${widget.fontSize - 4}px` : '10px',
                                    color: widget.color || 'var(--color-neutral-400)',
                                    fontWeight: widget.fontWeight || '700',
                                    fontFamily: widget.fontFamily || 'inherit',
                                    textAlign: widget.textAlign || 'left'
                                  }}
                                >
                                  {widget.text || widget.filterColumn || 'Unconfigured Filter'}
                                </span>
                                {widget.activeValue && (
                                  <button
                                    onClick={() => setDashboardWidgets(prev => prev.map(w => w.id === widget.id ? { ...w, activeValue: '' } : w))}
                                    className="text-[10px] text-orange-500 hover:text-orange-400 font-semibold cursor-pointer"
                                  >
                                    Clear
                                  </button>
                                )}
                              </div>

                              {/* Filter Control Input */}
                              <div
                                className="relative"
                                style={{
                                  width: widget.filterOrientation === 'horizontal' ? (widget.controlWidth || '120px') : '100%',
                                  flexShrink: 0
                                }}
                                onMouseDown={e => e.stopPropagation()}
                              >
                                {(!widget.filterColumn) ? (
                                  <div className="text-[11px] text-neutral-500 italic bg-neutral-950/50 border border-neutral-800 rounded-xl px-3 py-2 text-center">
                                    Click settings icon to configure
                                  </div>
                                ) : widget.filterType === 'dropdown' ? (
                                  <div className="relative custom-dropdown-container w-full">
                                    <button
                                      onClick={() => setActiveDropdownWidgetId(activeDropdownWidgetId === widget.id ? null : widget.id)}
                                      className="w-full flex items-center justify-between bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-50 focus:border-orange-500 focus:outline-none cursor-pointer shadow-inner text-left"
                                      style={{
                                        textAlign: widget.textAlign || 'left',
                                        fontFamily: widget.fontFamily || 'inherit',
                                        fontSize: widget.fontSize ? `${widget.fontSize - 2}px` : '12px',
                                        color: widget.color || 'var(--color-neutral-50)'
                                      }}
                                    >
                                      <span className="truncate flex-1">
                                        {widget.activeValue || 'All'}
                                      </span>
                                      <ChevronDown className="w-3.5 h-3.5 ml-2 text-neutral-400 shrink-0" />
                                    </button>
                                    {activeDropdownWidgetId === widget.id && (
                                      <div
                                        className="absolute top-full left-0 mt-1 bg-neutral-950 border border-neutral-800 rounded-xl shadow-2xl z-[9999] overflow-y-auto overflow-x-auto py-1 custom-scrollbar"
                                        style={{
                                          maxHeight: widget.filterDropdownHeight ? `${widget.filterDropdownHeight}px` : '200px',
                                          width: widget.filterDropdownWidth || '100%',
                                          minWidth: '100%',
                                        }}
                                      >
                                        <button
                                          onClick={() => {
                                            setDashboardWidgets(prev => prev.map(w => w.id === widget.id ? { ...w, activeValue: '' } : w));
                                            setActiveDropdownWidgetId(null);
                                          }}
                                          className={`w-full text-left px-3 py-1.5 text-xs hover:bg-neutral-800 transition-colors ${!widget.activeValue ? 'bg-orange-600/20 text-orange-500 font-semibold' : 'text-neutral-300'
                                            }`}
                                          style={{
                                            textAlign: widget.textAlign || 'left',
                                            fontFamily: widget.fontFamily || 'inherit',
                                            fontSize: widget.fontSize ? `${widget.fontSize - 2}px` : '12px',
                                            whiteSpace: 'nowrap'
                                          }}
                                        >
                                          All
                                        </button>
                                        {getUniqueValuesForColumn(widget.filterColumn).map(val => (
                                          <button
                                            key={val}
                                            onClick={() => {
                                              setDashboardWidgets(prev => prev.map(w => w.id === widget.id ? { ...w, activeValue: val } : w));
                                              setActiveDropdownWidgetId(null);
                                            }}
                                            className={`w-full text-left px-3 py-1.5 text-xs hover:bg-neutral-800 transition-colors ${widget.activeValue === val ? 'bg-orange-600/20 text-orange-500 font-semibold' : 'text-neutral-300'
                                              }`}
                                            style={{
                                              textAlign: widget.textAlign || 'left',
                                              fontFamily: widget.fontFamily || 'inherit',
                                              fontSize: widget.fontSize ? `${widget.fontSize - 2}px` : '12px',
                                              whiteSpace: 'nowrap'
                                            }}
                                          >
                                            {val}
                                          </button>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                ) : widget.filterType === 'like' ? (
                                  <input
                                    type="text"
                                    placeholder="Search..."
                                    value={widget.activeValue || ''}
                                    onChange={e => setDashboardWidgets(prev => prev.map(w => w.id === widget.id ? { ...w, activeValue: e.target.value } : w))}
                                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-50 focus:border-orange-500 focus:outline-none shadow-inner"
                                    style={{
                                      textAlign: widget.textAlign || 'left',
                                      fontFamily: widget.fontFamily || 'inherit',
                                      fontSize: widget.fontSize ? `${widget.fontSize - 2}px` : '12px',
                                      color: widget.color || 'var(--color-neutral-50)'
                                    }}
                                  />
                                ) : widget.filterType === 'date' ? (
                                  widget.dateSubtype === 'year' ? (
                                    <div className="relative custom-dropdown-container w-full">
                                      <button
                                        onClick={() => setActiveDropdownWidgetId(activeDropdownWidgetId === widget.id ? null : widget.id)}
                                        className="w-full flex items-center justify-between bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-50 focus:border-orange-500 focus:outline-none cursor-pointer shadow-inner text-left"
                                        style={{
                                          textAlign: widget.textAlign || 'left',
                                          fontFamily: widget.fontFamily || 'inherit',
                                          fontSize: widget.fontSize ? `${widget.fontSize - 2}px` : '12px',
                                          color: widget.color || 'var(--color-neutral-50)'
                                        }}
                                      >
                                        <span className="truncate flex-1">
                                          {widget.activeValue || 'All Years'}
                                        </span>
                                        <ChevronDown className="w-3.5 h-3.5 ml-2 text-neutral-400 shrink-0" />
                                      </button>
                                      {activeDropdownWidgetId === widget.id && (
                                        <div
                                          className="absolute top-full left-0 mt-1 w-full bg-neutral-950 border border-neutral-800 rounded-xl shadow-2xl z-[9999] overflow-y-auto overflow-x-hidden py-1"
                                          style={{
                                            maxHeight: widget.filterDropdownHeight ? `${widget.filterDropdownHeight}px` : '200px',
                                          }}
                                        >
                                          <button
                                            onClick={() => {
                                              setDashboardWidgets(prev => prev.map(w => w.id === widget.id ? { ...w, activeValue: '' } : w));
                                              setActiveDropdownWidgetId(null);
                                            }}
                                            className={`w-full text-left px-3 py-1.5 text-xs hover:bg-neutral-800 transition-colors ${!widget.activeValue ? 'bg-orange-600/20 text-orange-500 font-semibold' : 'text-neutral-300'
                                              }`}
                                            style={{
                                              textAlign: widget.textAlign || 'left',
                                              fontFamily: widget.fontFamily || 'inherit',
                                              fontSize: widget.fontSize ? `${widget.fontSize - 2}px` : '12px',
                                            }}
                                          >
                                            All Years
                                          </button>
                                          {(() => {
                                            const dateValues = getUniqueValuesForColumn(widget.filterColumn);
                                            const years = new Set<string>();
                                            dateValues.forEach(val => {
                                              const d = new Date(val);
                                              if (!isNaN(d.getTime())) years.add(d.getFullYear().toString());
                                            });
                                            if (years.size === 0) {
                                              const currentYear = new Date().getFullYear();
                                              for (let i = currentYear - 5; i <= currentYear + 5; i++) {
                                                years.add(i.toString());
                                              }
                                            }
                                            return Array.from(years).sort((a, b) => b.localeCompare(a));
                                          })().map(yr => (
                                            <button
                                              key={yr}
                                              onClick={() => {
                                                setDashboardWidgets(prev => prev.map(w => w.id === widget.id ? { ...w, activeValue: yr } : w));
                                                setActiveDropdownWidgetId(null);
                                              }}
                                              className={`w-full text-left px-3 py-1.5 text-xs hover:bg-neutral-800 transition-colors truncate ${widget.activeValue === yr ? 'bg-orange-600/20 text-orange-500 font-semibold' : 'text-neutral-300'
                                                }`}
                                              style={{
                                                textAlign: widget.textAlign || 'left',
                                                fontFamily: widget.fontFamily || 'inherit',
                                                fontSize: widget.fontSize ? `${widget.fontSize - 2}px` : '12px',
                                              }}
                                            >
                                              {yr}
                                            </button>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  ) : widget.dateSubtype === 'month' ? (
                                    <input
                                      type="month"
                                      value={widget.activeValue || ''}
                                      onChange={e => setDashboardWidgets(prev => prev.map(w => w.id === widget.id ? { ...w, activeValue: e.target.value } : w))}
                                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-50 focus:border-orange-500 focus:outline-none shadow-inner"
                                      style={{
                                        textAlign: widget.textAlign || 'left',
                                        fontFamily: widget.fontFamily || 'inherit',
                                        fontSize: widget.fontSize ? `${widget.fontSize - 2}px` : '12px',
                                        color: widget.color || 'var(--color-neutral-50)'
                                      }}
                                    />
                                  ) : (
                                    <input
                                      type="date"
                                      value={widget.activeValue || ''}
                                      onChange={e => setDashboardWidgets(prev => prev.map(w => w.id === widget.id ? { ...w, activeValue: e.target.value } : w))}
                                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-50 focus:border-orange-500 focus:outline-none shadow-inner"
                                      style={{
                                        textAlign: widget.textAlign || 'left',
                                        fontFamily: widget.fontFamily || 'inherit',
                                        fontSize: widget.fontSize ? `${widget.fontSize - 2}px` : '12px',
                                        color: widget.color || 'var(--color-neutral-50)'
                                      }}
                                    />
                                  )
                                ) : null}
                              </div>
                            </div>
                          )}

                          {/* Custom JS Code Widget */}
                          {isCode && (
                            <CodeWidgetRenderer 
                              widget={widget} 
                              onSetFilter={(col, val) => {
                                // Find if there's a filter widget for this column or just use global filter logic
                                // For simplicity, we can update a global-like state if we had one, 
                                // but here we'll update the activeValue of the first filter widget found with this column
                                setDashboardWidgets(prev => prev.map(w => 
                                  (w.itemType === 'filter' && w.filterColumn === col) ? { ...w, activeValue: val } : w
                                ));
                              }}
                              onSwitchTab={(tabId) => handleSelectTab(tabId)}
                              allWidgets={dashboardWidgets}
                            />
                          )}

                          {/* Edit controls in edit mode */}
                          {isEditMode && (
                            <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 z-10">
                              <button
                                onMouseDown={e => e.stopPropagation()}
                                onClick={() => { setStylingWidgetId(widget.id); setShowWidgetStyleModal(true); setShowAddChart(false); setShowTemplateSettings(false); }}
                                className="p-1 bg-neutral-800/80 hover:bg-neutral-700 text-neutral-400 hover:text-orange-500 rounded-lg transition-colors cursor-pointer"
                                title="Element Settings"
                              >
                                <Settings2 className="w-3 h-3" />
                              </button>
                              {(isHeading || isText || isShape) && (
                                <button
                                  onMouseDown={e => e.stopPropagation()}
                                  onClick={() => { setEditingWidgetId(widget.id); setEditingWidgetText(widget.text || ''); }}
                                  className="p-1 bg-neutral-800/80 hover:bg-neutral-700 text-neutral-400 hover:text-orange-500 rounded-lg transition-colors cursor-pointer"
                                  title="Edit Text"
                                >
                                  <Type className="w-3 h-3" />
                                </button>
                              )}
                              <button
                                onMouseDown={e => e.stopPropagation()}
                                onClick={() => handleRemoveWidget(widget.id)}
                                className="p-1 bg-neutral-800/80 hover:bg-neutral-700 text-neutral-400 hover:text-red-400 rounded-lg transition-colors cursor-pointer"
                                title="Remove Element"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          )}

                          {/* Resize handles for widgets in edit mode */}
                          {isEditMode && !isEditing && (
                            <>
                              <div onMouseDown={e => startWidgetResize(e, widget.id, 'e')} className="absolute top-0 right-0 w-2 h-full cursor-ew-resize z-10" />
                              <div onMouseDown={e => startWidgetResize(e, widget.id, 's')} className="absolute bottom-0 left-0 w-full h-2 cursor-ns-resize z-10" />
                              <div onMouseDown={e => startWidgetResize(e, widget.id, 'w')} className="absolute top-0 left-0 w-2 h-full cursor-ew-resize z-10" />
                              <div onMouseDown={e => startWidgetResize(e, widget.id, 'n')} className="absolute top-0 left-0 w-full h-2 cursor-ns-resize z-10" />
                              <div onMouseDown={e => startWidgetResize(e, widget.id, 'se')} className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize z-20 flex items-end justify-end pr-0.5 pb-0.5">
                                <svg viewBox="0 0 8 8" className="w-2.5 h-2.5 text-neutral-600 opacity-70 group-hover:opacity-100" fill="currentColor">
                                  <rect x="4" y="0" width="2" height="8" rx="1" /><rect x="0" y="4" width="8" height="2" rx="1" />
                                </svg>
                              </div>
                              <div onMouseDown={e => startWidgetResize(e, widget.id, 'sw')} className="absolute bottom-0 left-0 w-4 h-4 cursor-sw-resize z-20" />
                              <div onMouseDown={e => startWidgetResize(e, widget.id, 'ne')} className="absolute top-0 right-0 w-4 h-4 cursor-ne-resize z-20" />
                              <div onMouseDown={e => startWidgetResize(e, widget.id, 'nw')} className="absolute top-0 left-0 w-4 h-4 cursor-nw-resize z-20" />
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Bottom Tab Bar */}
              {tabPosition === 'bottom' && !mainFrameId && (
                <div
                  className={`border-t border-neutral-900/60 shrink-0 flex items-center gap-4 px-8 ${
                    tabBarPinned 
                      ? 'sticky bottom-0 z-40 bg-neutral-900/90 backdrop-blur-md' 
                      : 'bg-transparent relative'
                  }`}
                  style={{ 
                    height: (isTabBarCollapsed && tabBarCollapseEnabled) ? 0 : tabBarSize,
                    paddingTop: (isTabBarCollapsed && tabBarCollapseEnabled) ? 0 : undefined,
                    paddingBottom: (isTabBarCollapsed && tabBarCollapseEnabled) ? 0 : undefined,
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    overflow: 'hidden',
                    backgroundColor: tabBarBgColor !== 'transparent' ? tabBarBgColor : undefined,
                    borderColor: tabBarBorderColor !== 'transparent' ? tabBarBorderColor : undefined
                  }}
                >
                  <div className="flex flex-1 items-center justify-between min-w-0" style={{ height: tabBarSize - 24 }}>
                    <div className={`flex flex-1 flex-wrap items-center ${tabAlign === 'center' ? 'justify-center' : tabAlign === 'end' ? 'justify-end' : 'justify-start'}`} style={{ gap: `${tabGap}px` }}>
                      {dashboardTabs.map(tab => renderTabItem(tab, true))}
                      {isEditMode && renderAddTabButton()}
                    </div>
                    {tabBarCollapseEnabled && (
                      <button 
                        onClick={() => setIsTabBarCollapsed(true)}
                        className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-neutral-500 hover:text-neutral-200 bg-neutral-950/20 hover:bg-neutral-800/40 border border-neutral-850 hover:border-neutral-800 rounded-xl transition-all duration-200 cursor-pointer shrink-0 ml-4"
                        style={{ borderRadius: `${tabBorderRadius}px` }}
                        title="Collapse Tab Bar"
                      >
                        <span>Collapse</span> <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Right Tab Bar */}
            {tabPosition === 'right' && !mainFrameId && (
              <div
                className="shrink-0 flex flex-col overflow-y-auto border-l"
                style={{ 
                  width: (isTabBarCollapsed && tabBarCollapseEnabled) ? 0 : tabBarSize,
                  justifyContent: tabAlign === 'center' ? 'center' : tabAlign === 'end' ? 'flex-end' : 'flex-start',
                  paddingLeft: (isTabBarCollapsed && tabBarCollapseEnabled) ? 0 : undefined,
                  paddingRight: (isTabBarCollapsed && tabBarCollapseEnabled) ? 0 : undefined,
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  overflow: 'hidden',
                  backgroundColor: tabBarBgColor !== 'transparent' ? tabBarBgColor : undefined,
                  borderColor: tabBarBorderColor !== 'transparent' ? tabBarBorderColor : 'rgba(23, 23, 23, 0.6)'
                }}
              >
                <div className="flex flex-col p-4 flex-1" style={{ gap: `${tabGap}px`, minWidth: tabBarSize - 32 }}>
                  {dashboardTabs.map(tab => renderTabItem(tab, false))}
                  {isEditMode && renderAddTabButton()}

                  {tabBarCollapseEnabled && (
                    <button 
                      onClick={() => setIsTabBarCollapsed(true)}
                      className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-neutral-500 hover:text-neutral-200 bg-neutral-950/20 hover:bg-neutral-800/40 border border-neutral-850 hover:border-neutral-800 rounded-xl transition-all duration-200 cursor-pointer shrink-0 mt-auto"
                      style={{ borderRadius: `${tabBorderRadius}px` }}
                      title="Collapse Tab Bar"
                    >
                      <span>Collapse</span> <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Tab Settings Drawer */}
          {showTabSettings && (
            <div className="fixed inset-y-0 right-0 w-96 bg-neutral-900 border-l border-neutral-800 shadow-2xl z-30 flex flex-col animate-in slide-in-from-right duration-200">
              <div className="flex justify-between items-center p-6 border-b border-neutral-800 shrink-0">
                <h3 className="font-bold text-lg flex items-center gap-2">
                  <LayoutDashboard className="w-5 h-5 text-orange-500" /> Tab Settings
                </h3>
                <button onClick={() => setShowTabSettings(false)} className="p-1 hover:bg-neutral-800 rounded-lg text-neutral-400 hover:text-neutral-50 cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-auto space-y-6 p-6">
                {/* Master Toggle */}
                <div className="flex items-center justify-between p-4 bg-neutral-950 border border-neutral-800 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-neutral-200">Display Tab Bar</span>
                      <span className="text-[10px] text-neutral-500">Enable or disable tab navigation</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => setTabPosition(tabPosition === 'none' ? 'top' : 'none')}
                    className={`w-12 h-6 rounded-full relative transition-all duration-200 ${tabPosition !== 'none' ? 'bg-orange-600 shadow-[0_0_10px_rgba(234,88,12,0.4)]' : 'bg-neutral-800'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-200 ${tabPosition !== 'none' ? 'left-7' : 'left-1'}`} />
                  </button>
                </div>

                {/* Add New Tab Button */}
                <button
                  onClick={handleAddTab}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-orange-600/20 cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Add New Tab
                </button>

                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Tab Bar Position</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'none', label: 'Hidden' },
                      { id: 'top', label: 'Top' },
                      { id: 'bottom', label: 'Bottom' },
                      { id: 'left', label: 'Left' },
                      { id: 'right', label: 'Right' },
                      { id: 'custom', label: 'Floating' },
                    ].map(pos => (
                      <button
                        key={pos.id}
                        onClick={() => {
                          setTabPosition(pos.id as any);
                          // Adjust size defaults if switching between orientations
                          if ((pos.id === 'top' || pos.id === 'bottom') && (tabPosition === 'left' || tabPosition === 'right' || tabPosition === 'custom')) {
                            setTabBarSize(64);
                          } else if ((pos.id === 'left' || pos.id === 'right') && (tabPosition === 'top' || tabPosition === 'bottom' || tabPosition === 'custom')) {
                            setTabBarSize(200);
                          }
                        }}
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-xl transition-all text-left cursor-pointer border ${tabPosition === pos.id
                          ? 'bg-orange-600/10 border-orange-500/40 text-orange-500 font-bold'
                          : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700 hover:bg-neutral-900'
                          }`}
                      >
                        <span className="text-xs">{pos.label}</span>
                        {tabPosition === pos.id && <Check className="w-3 h-3" />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Size Adjustment (only for non-custom/none) */}
                {tabPosition !== 'custom' && tabPosition !== 'none' && (
                  <div className="space-y-4 pt-4 border-t border-neutral-800">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Bar Size / Width</span>
                      <span className="text-xs font-mono text-orange-500 font-bold bg-orange-500/10 px-2 py-0.5 rounded">{tabBarSize}px</span>
                    </div>
                    <input
                      type="range"
                      min="30"
                      max={tabPosition === 'top' || tabPosition === 'bottom' ? "150" : "500"}
                      value={tabBarSize}
                      onChange={(e) => setTabBarSize(parseInt(e.target.value))}
                      className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-orange-500"
                    />
                  </div>
                )}

                {/* Tab Alignment */}
                {tabPosition !== 'none' && tabPosition !== 'custom' && (
                  <div className="space-y-3 pt-4 border-t border-neutral-800">
                    <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">
                      {tabPosition === 'top' || tabPosition === 'bottom' ? 'Horizontal Alignment' : 'Vertical Alignment'}
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'start', label: tabPosition === 'top' || tabPosition === 'bottom' ? 'Left' : 'Top' },
                        { id: 'center', label: 'Center' },
                        { id: 'end', label: tabPosition === 'top' || tabPosition === 'bottom' ? 'Right' : 'Bottom' },
                      ].map(align => (
                        <button
                          key={align.id}
                          onClick={() => setTabAlign(align.id as any)}
                          className={`flex items-center justify-center px-2 py-2 rounded-xl transition-all cursor-pointer border text-[10px] ${tabAlign === align.id
                            ? 'bg-orange-600/10 border-orange-500/40 text-orange-500 font-bold'
                            : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                            }`}
                        >
                          {align.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Advanced Tab Styling */}
                <div className="space-y-6 pt-4 border-t border-neutral-800">
                  <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block">Tab Item Styling</label>
                  
                  <div className="space-y-3">
                    <label className="text-[10px] text-neutral-400">Layout & Spacing</label>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="flex justify-between text-[9px] text-neutral-500 uppercase">
                          <span>Font Size</span>
                          <span className="text-orange-500">{tabFontSize}px</span>
                        </div>
                        <input type="range" min="8" max="24" value={tabFontSize} onChange={e => setTabFontSize(parseInt(e.target.value))} className="w-full h-1 bg-neutral-800 appearance-none accent-orange-500 rounded" />
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-[9px] text-neutral-500 uppercase">
                          <span>Gap</span>
                          <span className="text-orange-500">{tabGap}px</span>
                        </div>
                        <input type="range" min="0" max="32" value={tabGap} onChange={e => setTabGap(parseInt(e.target.value))} className="w-full h-1 bg-neutral-800 appearance-none accent-orange-500 rounded" />
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-[9px] text-neutral-500 uppercase">
                          <span>Padding X</span>
                          <span className="text-orange-500">{tabPaddingX}px</span>
                        </div>
                        <input type="range" min="4" max="40" value={tabPaddingX} onChange={e => setTabPaddingX(parseInt(e.target.value))} className="w-full h-1 bg-neutral-800 appearance-none accent-orange-500 rounded" />
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-[9px] text-neutral-500 uppercase">
                          <span>Padding Y</span>
                          <span className="text-orange-500">{tabPaddingY}px</span>
                        </div>
                        <input type="range" min="2" max="24" value={tabPaddingY} onChange={e => setTabPaddingY(parseInt(e.target.value))} className="w-full h-1 bg-neutral-800 appearance-none accent-orange-500 rounded" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] text-neutral-400">Typography & Color</label>
                    <div className="flex gap-2 bg-neutral-950 p-1 rounded-xl border border-neutral-800">
                      {(['normal', 'semibold', 'bold'] as const).map(w => (
                        <button
                          key={w}
                          onClick={() => setTabFontWeight(w)}
                          className={`flex-1 py-1 text-[10px] font-bold uppercase rounded-lg transition-all ${tabFontWeight === w ? 'bg-neutral-800 text-orange-500' : 'text-neutral-500 hover:text-neutral-300'}`}
                        >
                          {w}
                        </button>
                      ))}
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-[9px] text-neutral-500 uppercase">
                        <span>Active Color</span>
                        <span className="text-orange-500 font-mono">{tabActiveColor}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <input 
                          type="color" 
                          value={tabActiveColor.startsWith('var') ? '#ea580c' : tabActiveColor} 
                          onChange={e => setTabActiveColor(e.target.value)}
                          className="w-10 h-10 bg-transparent border-none cursor-pointer rounded overflow-hidden"
                        />
                        <div className="flex flex-wrap gap-1.5 flex-1">
                          {['#ea580c', '#3b82f6', '#10b981', '#ef4444', '#f59e0b', '#8b5cf6', '#ec4899'].map(c => (
                            <button 
                              key={c}
                              onClick={() => setTabActiveColor(c)}
                              className="w-5 h-5 rounded-full border border-white/10"
                              style={{ backgroundColor: c }}
                            />
                          ))}
                          <button 
                            onClick={() => setTabActiveColor('var(--color-orange-500)')}
                            className="px-2 py-0.5 rounded text-[8px] bg-neutral-800 text-neutral-400 border border-neutral-700"
                          >
                            Reset
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-[9px] text-neutral-500 uppercase">
                        <span>Background Color (Inactive)</span>
                        <span className="text-orange-500 font-mono">{tabBgColor}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <input 
                          type="color" 
                          value={tabBgColor} 
                          onChange={e => setTabBgColor(e.target.value)}
                          className="w-10 h-10 bg-transparent border-none cursor-pointer rounded overflow-hidden"
                        />
                        <div className="flex flex-wrap gap-1.5 flex-1">
                          {['#ffffff', '#000000', '#f97316', '#3b82f6', '#10b981', '#ef4444'].map(c => (
                            <button 
                              key={c}
                              onClick={() => setTabBgColor(c)}
                              className="w-5 h-5 rounded-full border border-white/10"
                              style={{ backgroundColor: c }}
                            />
                          ))}
                          <button 
                            onClick={() => setTabBgColor('#ffffff')}
                            className="px-2 py-0.5 rounded text-[8px] bg-neutral-800 text-neutral-400 border border-neutral-700"
                          >
                            Reset
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-[9px] text-neutral-500 uppercase">
                        <span>Border Color (Inactive)</span>
                        <span className="text-orange-500 font-mono">{tabBorderColor}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <input 
                          type="color" 
                          value={tabBorderColor} 
                          onChange={e => setTabBorderColor(e.target.value)}
                          className="w-10 h-10 bg-transparent border-none cursor-pointer rounded overflow-hidden"
                        />
                        <div className="flex flex-wrap gap-1.5 flex-1">
                          {['#ffffff', '#000000', '#f97316', '#3b82f6', '#10b981', '#ef4444'].map(c => (
                            <button 
                              key={c}
                              onClick={() => setTabBorderColor(c)}
                              className="w-5 h-5 rounded-full border border-white/10"
                              style={{ backgroundColor: c }}
                            />
                          ))}
                          <button 
                            onClick={() => setTabBorderColor('#ffffff')}
                            className="px-2 py-0.5 rounded text-[8px] bg-neutral-800 text-neutral-400 border border-neutral-700"
                          >
                            Reset
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-[9px] text-neutral-500 uppercase">
                        <span>Tab Bar Background Color</span>
                        <span className="text-orange-500 font-mono">{tabBarBgColor}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <input 
                          type="color" 
                          value={tabBarBgColor === 'transparent' ? '#000000' : tabBarBgColor} 
                          onChange={e => setTabBarBgColor(e.target.value)}
                          className="w-10 h-10 bg-transparent border-none cursor-pointer rounded overflow-hidden"
                        />
                        <div className="flex flex-wrap gap-1.5 flex-1">
                          {['#000000', '#171717', '#262626', '#1f2937', '#ea580c', '#3b82f6'].map(c => (
                            <button 
                              key={c}
                              onClick={() => setTabBarBgColor(c)}
                              className="w-5 h-5 rounded-full border border-white/10"
                              style={{ backgroundColor: c }}
                            />
                          ))}
                          <button 
                            onClick={() => setTabBarBgColor('transparent')}
                            className="px-2 py-0.5 rounded text-[8px] bg-neutral-800 text-neutral-400 border border-neutral-700 cursor-pointer"
                          >
                            Transparent
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-[9px] text-neutral-500 uppercase">
                        <span>Tab Bar Border Color</span>
                        <span className="text-orange-500 font-mono">{tabBarBorderColor}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <input 
                          type="color" 
                          value={tabBarBorderColor === 'transparent' ? '#262626' : tabBarBorderColor} 
                          onChange={e => setTabBarBorderColor(e.target.value)}
                          className="w-10 h-10 bg-transparent border-none cursor-pointer rounded overflow-hidden"
                        />
                        <div className="flex flex-wrap gap-1.5 flex-1">
                          {['#262626', '#171717', '#404040', '#ef4444', '#f97316', '#3b82f6'].map(c => (
                            <button 
                              key={c}
                              onClick={() => setTabBarBorderColor(c)}
                              className="w-5 h-5 rounded-full border border-white/10"
                              style={{ backgroundColor: c }}
                            />
                          ))}
                          <button 
                            onClick={() => setTabBarBorderColor('transparent')}
                            className="px-2 py-0.5 rounded text-[8px] bg-neutral-800 text-neutral-400 border border-neutral-700 cursor-pointer"
                          >
                            Transparent
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Attach to Frame (only for custom) */}
                {tabPosition === 'custom' && (
                  <div className="space-y-4 pt-4 border-t border-neutral-800">
                    <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block">Attach to Frame</label>
                    <select
                      value={tabFrameId || ''}
                      onChange={(e) => setTabFrameId(e.target.value || null)}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-sm text-neutral-200 outline-none focus:border-orange-500/50 transition-colors"
                    >
                      <option value="">Floating (Independent)</option>
                      {dashboardFrames.map(f => (
                        <option key={f.id} value={f.id}>{f.name}</option>
                      ))}
                    </select>

                    {tabFrameId && (
                      <div className="mt-3">
                        <label className="text-[10px] font-bold text-neutral-500 uppercase block mb-2">Attachment Position</label>
                        <div className="grid grid-cols-2 gap-2">
                          {['top', 'bottom', 'left', 'right'].map(p => (
                            <button
                              key={p}
                              onClick={() => setTabFramePosition(p as any)}
                              className={`px-3 py-2 rounded-lg border text-xs capitalize transition-all ${tabFramePosition === p ? 'bg-orange-500/20 border-orange-500/50 text-orange-500' : 'bg-neutral-800 border-neutral-700 text-neutral-400'}`}
                            >
                              {p}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <p className="text-[9px] text-neutral-500 italic mt-2">
                      When attached, the tab bar will stick to the chosen edge of the frame.
                    </p>
                  </div>
                )}

                {/* Style & Radius Settings */}
                <div className="space-y-6 pt-4 border-t border-neutral-800">
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block">Main Export Screen</label>
                    <select
                      value={mainFrameId || ''}
                      onChange={(e) => setMainFrameId(e.target.value || null)}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-sm text-neutral-200 outline-none focus:border-orange-500/50 transition-colors"
                    >
                      <option value="">None (Fit all content)</option>
                      <optgroup label="Screens / Frames">
                        {dashboardFrames.map(f => (
                          <option key={f.id} value={f.id}>{f.name} ({f.pos.w}x{f.pos.h})</option>
                        ))}
                      </optgroup>
                      <optgroup label="Rectangle Widgets">
                        {dashboardWidgets.filter(w => w.itemType === 'rectangle').map(w => {
                          const tab = dashboardTabs.find(t => t.id === (w.tabId || 'default'));
                          return (
                            <option key={w.id} value={w.id}>
                              Widget: {w.text || 'Untitled Rect'} {tab ? "(" + tab.name + ")" : ""}
                            </option>
                          );
                        })}
                      </optgroup>
                    </select>
                    <p className="text-[9px] text-neutral-500 italic">
                      The selected frame or rectangle will be used as the primary viewport for public dashboard links.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Tab Bar Style</label>
                    <div className="flex gap-2 bg-neutral-950 p-1 rounded-xl border border-neutral-800">
                      {['pills', 'underline', 'flat'].map((s: any) => (
                        <button
                          key={s}
                          onClick={() => setTabBarStyle(s)}
                          className={`flex-1 py-1.5 text-[10px] font-bold uppercase rounded-lg transition-all ${tabBarStyle === s ? 'bg-orange-600 text-white shadow-lg' : 'text-neutral-500 hover:text-neutral-300'}`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Border Radius</span>
                      <span className="text-xs font-mono text-orange-500">{tabBorderRadius}px</span>
                    </div>
                    <input
                      type="range" min="0" max="40" value={tabBorderRadius}
                      onChange={e => setTabBorderRadius(parseInt(e.target.value))}
                      className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-orange-500"
                    />
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Opacity</span>
                      <span className="text-xs font-mono text-orange-500">{Math.round(tabOpacity * 100)}%</span>
                    </div>
                    <input
                      type="range" min="0.1" max="1" step="0.1" value={tabOpacity}
                      onChange={e => setTabOpacity(parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-orange-500"
                    />
                  </div>

                  {/* Collapsible Tab Bar Config */}
                  {['top', 'bottom', 'left', 'right'].includes(tabPosition) && (
                    <div className="space-y-4 pt-4 border-t border-neutral-800">
                      <div className="flex items-center justify-between p-4 bg-neutral-950 border border-neutral-800 rounded-2xl">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-neutral-200">Collapsible Tab Bar</span>
                          <span className="text-[10px] text-neutral-500">Allow collapsing the tab bar to save space</span>
                        </div>
                        <button 
                          onClick={() => {
                            setTabBarCollapseEnabled(!tabBarCollapseEnabled);
                            setIsTabBarCollapsed(false);
                          }}
                          className={`w-12 h-6 rounded-full relative transition-all duration-200 ${tabBarCollapseEnabled ? 'bg-orange-600 shadow-[0_0_10px_rgba(234,88,12,0.4)]' : 'bg-neutral-800'}`}
                        >
                          <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-200 ${tabBarCollapseEnabled ? 'left-7' : 'left-1'}`} />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Pinned Tab Bar Config */}
                  {['top', 'bottom'].includes(tabPosition) && (
                    <div className="space-y-4 pt-4 border-t border-neutral-800">
                      <div className="flex items-center justify-between p-4 bg-neutral-950 border border-neutral-800 rounded-2xl">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-neutral-200">Pin Tab Bar</span>
                          <span className="text-[10px] text-neutral-500">Keep tab bar fixed at top/bottom of screen</span>
                        </div>
                        <button 
                          onClick={() => setTabBarPinned(!tabBarPinned)}
                          className={`w-12 h-6 rounded-full relative transition-all duration-200 ${tabBarPinned ? 'bg-orange-600 shadow-[0_0_10px_rgba(234,88,12,0.4)]' : 'bg-neutral-800'}`}
                        >
                          <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-200 ${tabBarPinned ? 'left-7' : 'left-1'}`} />
                        </button>
                      </div>
                    </div>
                  )}

                </div>
              </div>
            </div>
          )}

          {showAddChart && (
            <div ref={addChartRef} className="fixed inset-y-0 right-0 w-96 bg-neutral-900 border-l border-neutral-800 shadow-2xl z-30 flex flex-col animate-in slide-in-from-right duration-200">
              {/* Sidebar Header */}
              <div className="flex justify-between items-center p-4 border-b border-neutral-800 shrink-0">
                <h3 className="font-bold text-base flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-orange-500" />
                  Dashboard Charts
                </h3>
                <button onClick={() => { setShowAddChart(false); setSidebarTab('add'); setSelectedManagedCharts([]); }} className="p-1 hover:bg-neutral-800 rounded-lg text-neutral-400 hover:text-neutral-50 cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* 2-Tab Switcher */}
              <div className="flex border-b border-neutral-800 shrink-0">
                <button
                  onClick={() => { setSidebarTab('add'); setSelectedManagedCharts([]); }}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold transition-all ${sidebarTab === 'add' ? 'border-b-2 border-orange-500 text-orange-400' : 'text-neutral-500 hover:text-neutral-300'}`}
                >
                  <Plus className="w-3.5 h-3.5" /> Add Chart
                </button>
                <button
                  onClick={() => { setSidebarTab('manage'); setSelectedManagedCharts([]); }}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold transition-all ${sidebarTab === 'manage' ? 'border-b-2 border-orange-500 text-orange-400' : 'text-neutral-500 hover:text-neutral-300'}`}
                >
                  <Settings2 className="w-3.5 h-3.5" /> Manage Charts
                </button>
              </div>

              {/* ─── Tab 1: Add Chart ─── */}
              {sidebarTab === 'add' && (
                <div className="flex-1 flex flex-col p-4 min-h-0">
                  {/* Search Bar */}
                  <div className="relative mb-3 shrink-0">
                    <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-neutral-500" />
                    <input
                      type="text"
                      placeholder="Search charts..."
                      value={chartSearchQuery}
                      onChange={e => setChartSearchQuery(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-9 pr-4 py-2 text-xs text-neutral-50 focus:border-orange-500 focus:outline-none transition-colors"
                    />
                  </div>

                  <p className="text-[10px] text-neutral-500 mb-3 shrink-0 flex items-center gap-1">
                    <span className="inline-block text-neutral-600">⠿</span>
                    Drag or click to add · Showing 10 most recent charts
                  </p>

                  <div className="flex-1 overflow-auto space-y-2.5 pr-1">
                    {charts.length === 0 ? (
                      <div className="text-center text-neutral-500 mt-10 text-xs">
                        No charts available. Create one first.
                      </div>
                    ) : (() => {
                      // Sort by created_at DESC and limit to 10 most recent
                      const sorted = [...charts]
                        .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
                        .slice(0, 10)
                        .filter(c => c.name.toLowerCase().includes(chartSearchQuery.toLowerCase()));
                      
                      if (sorted.length === 0) return (
                        <div className="text-center text-neutral-500 mt-10 text-xs italic">No charts match your search.</div>
                      );

                      return sorted.map(chart => (
                        <div
                          key={chart.id}
                          draggable
                          onDragStart={(e) => {
                            setDraggedChart(chart);
                            e.dataTransfer.effectAllowed = 'copy';
                            e.dataTransfer.setData('text/plain', chart.id);
                          }}
                          onDragEnd={() => setDraggedChart(null)}
                          onClick={() => handleAddChartToDashboard(chart)}
                          className="p-3.5 bg-neutral-950 border border-neutral-800 rounded-xl cursor-grab active:cursor-grabbing hover:border-orange-500 hover:bg-orange-500/5 transition-all duration-200 group select-none"
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-neutral-600 text-xs">⠿</span>
                            <h4 className="font-semibold text-orange-400 group-hover:text-orange-300 truncate text-sm">{chart.name}</h4>
                          </div>
                          <p className="text-[10px] text-neutral-500 uppercase tracking-wider font-semibold">{chart.chart_type}</p>
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              )}

              {/* ─── Tab 2: Manage Charts ─── */}
              {sidebarTab === 'manage' && (
                <div className="flex-1 flex flex-col p-4 min-h-0">
                  {/* Actions bar */}
                  <div className="flex items-center justify-between mb-3 shrink-0">
                    <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">
                      {dashboardItems.length} charts in dashboard
                    </span>
                    {selectedManagedCharts.length > 0 && (
                      <button
                        onClick={async () => {
                          // Load all users when opening permission modal
                          if (allSystemUsers.length === 0) {
                            try {
                              const users = await api.permissions.listUsers();
                              setAllSystemUsers(users);
                            } catch { }
                          }
                          setPermissionTargetChartIds(selectedManagedCharts);
                          setShowPermissionModal(true);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white text-[10px] font-bold rounded-lg transition-colors cursor-pointer"
                      >
                        <Shield className="w-3 h-3" />
                        Setting ({selectedManagedCharts.length})
                      </button>
                    )}
                  </div>

                  {/* Select All */}
                  {dashboardItems.length > 0 && (
                    <div className="flex items-center gap-2 mb-2 shrink-0">
                      <input
                        type="checkbox"
                        id="select-all-charts"
                        checked={selectedManagedCharts.length === dashboardItems.length && dashboardItems.length > 0}
                        onChange={e => {
                          if (e.target.checked) {
                            setSelectedManagedCharts(dashboardItems.filter(i => i.chart?.id).map((i: any) => i.chart.id));
                          } else {
                            setSelectedManagedCharts([]);
                          }
                        }}
                        className="w-3.5 h-3.5 accent-orange-500 cursor-pointer"
                      />
                      <label htmlFor="select-all-charts" className="text-[10px] text-neutral-400 cursor-pointer">Select all</label>
                    </div>
                  )}

                  <div className="flex-1 overflow-auto space-y-2 pr-1">
                    {dashboardItems.length === 0 ? (
                      <div className="text-center text-neutral-500 mt-10 text-xs">
                        No charts in dashboard yet. Switch to "Add Chart" tab to add some.
                      </div>
                    ) : (
                      dashboardItems.map((item: any) => {
                        if (!item.chart) return null;
                        const chartId = item.chart.id;
                        const perms = chartPermissions[chartId];
                        const permCount = perms?.length || 0;
                        const isSelected = selectedManagedCharts.includes(chartId);
                        const tabName = dashboardTabs.find(t => t.id === (item.tabId || 'default'))?.name || 'Default';

                        return (
                          <div
                            key={item.id}
                            className={`p-3 bg-neutral-950 border rounded-xl transition-all ${isSelected ? 'border-orange-500 bg-orange-500/5' : 'border-neutral-800 hover:border-neutral-700'}`}
                          >
                            <div className="flex items-start gap-2">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={e => {
                                  if (e.target.checked) {
                                    setSelectedManagedCharts(prev => [...prev, chartId]);
                                  } else {
                                    setSelectedManagedCharts(prev => prev.filter(id => id !== chartId));
                                  }
                                }}
                                className="w-3.5 h-3.5 accent-orange-500 mt-0.5 cursor-pointer shrink-0"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-1">
                                  <span className="text-xs font-semibold text-orange-400 truncate">{item.chart.name}</span>
                                  <button
                                    onClick={async () => {
                                      if (allSystemUsers.length === 0) {
                                        try {
                                          const users = await api.permissions.listUsers();
                                          setAllSystemUsers(users);
                                        } catch { }
                                      }
                                      setPermissionTargetChartIds([chartId]);
                                      setTempChartPermissions(JSON.parse(JSON.stringify(chartPermissions)));
                                      setShowPermissionModal(true);
                                    }}
                                    className="p-1 hover:bg-neutral-800 text-neutral-500 hover:text-orange-500 rounded-lg transition-colors cursor-pointer shrink-0"
                                    title="Manage Permissions"
                                  >
                                    <Settings2 className="w-3 h-3" />
                                  </button>
                                </div>
                                <p className="text-[10px] text-neutral-600 mt-0.5">{item.chart.chart_type} · {tabName}</p>
                                <div className="flex items-center gap-1 mt-1.5">
                                  {permCount === 0 ? (
                                    <span className="flex items-center gap-1 px-1.5 py-0.5 bg-neutral-800 text-neutral-500 text-[9px] rounded font-semibold">
                                      <Lock className="w-2.5 h-2.5" /> Private
                                    </span>
                                  ) : (
                                    <span className="flex items-center gap-1 px-1.5 py-0.5 bg-orange-500/10 text-orange-400 text-[9px] rounded font-semibold">
                                      <Users className="w-2.5 h-2.5" /> {permCount} user{permCount > 1 ? 's' : ''}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Add/Edit Filter Modal */}
          {showAddFilterModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl p-6 relative animate-in scale-in duration-150">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-bold text-lg text-neutral-50">
                    {editingFilter ? "Edit Filter Settings" : "Create Global Filter"}
                  </h3>
                  <button
                    onClick={() => setShowAddFilterModal(false)}
                    className="text-neutral-400 hover:text-neutral-50 transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-neutral-400 block mb-1">Filter Display Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Region, Product Category"
                      value={filterNameInput}
                      onChange={e => setFilterNameInput(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-sm text-neutral-50 focus:border-orange-500 focus:outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-neutral-400 block mb-1">Target Data Column</label>
                    {getAvailableColumns().length > 0 ? (
                      <select
                        value={filterColumnInput}
                        onChange={e => setFilterColumnInput(e.target.value)}
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-sm text-neutral-50 focus:border-orange-500 focus:outline-none transition-colors cursor-pointer"
                      >
                        {getAvailableColumns().map(col => (
                          <option key={col} value={col}>{col}</option>
                        ))}
                      </select>
                    ) : (
                      <div>
                        <input
                          type="text"
                          placeholder="e.g. region"
                          value={filterColumnInput}
                          onChange={e => setFilterColumnInput(e.target.value)}
                          className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-sm text-neutral-50 focus:border-orange-500 focus:outline-none transition-colors"
                        />
                        <p className="text-[10px] text-amber-500 mt-1">No loaded charts found to auto-suggest columns. Manually input column name.</p>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-neutral-400 block mb-1">Matching Operator</label>
                    <select
                      value={filterOperatorInput}
                      onChange={e => setFilterOperatorInput(e.target.value as any)}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-sm text-neutral-50 focus:border-orange-500 focus:outline-none transition-colors cursor-pointer"
                    >
                      <option value="equals">Equals (exact matching)</option>
                      <option value="contains">Contains (substring matching)</option>
                      <option value="greater_than">Greater than or Equal (&gt;=)</option>
                      <option value="less_than">Less than or Equal (&lt;=)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-neutral-400 block mb-1">Default Value (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. East"
                      value={filterDefaultValueInput}
                      onChange={e => setFilterDefaultValueInput(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-sm text-neutral-50 focus:border-orange-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-8">
                  <button
                    onClick={() => setShowAddFilterModal(false)}
                    className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-semibold text-sm cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveFilter}
                    className="px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold text-sm cursor-pointer"
                  >
                    {editingFilter ? "Apply Changes" : "Create Filter"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==========================================
          CHART BUILDER SUB-VIEW (Create & Edit)
          ========================================== */}
      {(view === "create-chart" || view === "edit-chart") && (
        <div className="flex-1 flex flex-col">
          <div className="h-20 border-b border-neutral-800 bg-neutral-900/60 flex items-center justify-between px-8 sticky top-0 z-20 backdrop-blur-md">
            <div className="flex items-center gap-4">
              <button
                onClick={() => { setView("list"); setEditingChartId(null); }}
                className="p-2 hover:bg-neutral-800 rounded-xl text-neutral-400 hover:text-white transition-colors cursor-pointer"
                title="Back to Trực quan hóa"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-xl font-bold flex items-center gap-3 text-orange-400">
                  <LineChart className="text-orange-400" />
                  {editingChartId ? "Edit Chart" : "Chart Builder"}
                </h1>
                <p className="text-xs text-neutral-400 mt-0.5">Configure and style chart visual settings.</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <input
                type="text"
                placeholder="Chart Name"
                value={chartName}
                onChange={e => setChartName(e.target.value)}
                className="bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2 text-sm focus:border-orange-500 outline-none w-60 text-orange-400"
              />
              <button
                onClick={handleSaveChart}
                className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-5 py-2.5 rounded-xl font-bold transition-colors cursor-pointer"
              >
                <Save className="w-4 h-4" />
                {editingChartId ? "Update Chart" : "Save Chart"}
              </button>
            </div>
          </div>

          <div className="flex-1 p-8 flex gap-6 overflow-hidden min-h-0">
            {/* Left Config & Code Panel */}
            <div className="w-[450px] bg-neutral-900 border border-neutral-800 rounded-2xl flex flex-col overflow-hidden shrink-0 shadow-lg h-[600px]">
              {/* Tab Switcher */}
              <div className="flex border-b border-neutral-850 p-2 gap-1.5 shrink-0 bg-neutral-900/50">
                <button
                  type="button"
                  onClick={() => setChartConfigTab("schema")}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${chartConfigTab === "schema"
                    ? "bg-orange-500/10 border border-orange-500/30 text-orange-400"
                    : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-850/50"
                    }`}
                >
                  Dataset
                </button>
                <button
                  type="button"
                  onClick={() => setChartConfigTab("code")}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${chartConfigTab === "code"
                    ? "bg-orange-500/10 border border-orange-500/30 text-orange-400"
                    : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-850/50"
                    }`}
                >
                  Edit Chart
                </button>
              </div>

              {/* Tab Content */}
              <div className="flex-1 overflow-y-auto p-5 flex flex-col min-h-0">
                {chartConfigTab === "schema" ? (
                  // Dataset Tab
                  <div className="space-y-4 flex-1 flex flex-col min-h-0">
                    {/* Source Dataset Card */}
                    <div className="bg-neutral-950 border border-neutral-850 rounded-xl p-4 shrink-0">
                      <h3 className="font-bold mb-2 text-neutral-400 text-xs uppercase tracking-wider">Source Dataset</h3>
                      <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-lg text-sm text-neutral-50 font-semibold flex items-center gap-2">
                        <Database className="w-4 h-4 text-orange-500" />
                        {datasets.find(ds => ds.id === selectedDatasetId)?.name || "Unknown Dataset"}
                      </div>
                      <button
                        type="button"
                        onClick={() => handlePreviewDataset(selectedDatasetId)}
                        className="w-full mt-3 flex items-center justify-center gap-2 bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 hover:border-neutral-700 text-xs font-semibold text-neutral-300 hover:text-white py-2 px-3 rounded-lg transition-all"
                      >
                        <Eye className="w-3.5 h-3.5 text-orange-500" />
                        Preview Raw Data
                      </button>
                    </div>

                    {/* Dataset Statistics */}
                    <div className="grid grid-cols-2 gap-4 shrink-0">
                      <div className="bg-neutral-950 border border-neutral-850 rounded-xl p-4 flex flex-col justify-center">
                        <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">Total Rows</span>
                        <span className="text-xl font-bold text-orange-400 font-mono">
                          {datasetPreview?.rows?.length || 0}
                        </span>
                      </div>
                      <div className="bg-neutral-950 border border-neutral-850 rounded-xl p-4 flex flex-col justify-center">
                        <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">Total Columns</span>
                        <span className="text-xl font-bold text-orange-400 font-mono">
                          {datasetPreview?.columns?.length || 0}
                        </span>
                      </div>
                    </div>

                    {/* Column Schema List */}
                    <div className="flex-1 flex flex-col min-h-0 bg-neutral-950 border border-neutral-850 rounded-xl overflow-hidden">
                      <div className="w-full flex items-center justify-between p-4 border-b border-neutral-850/50 bg-neutral-950">
                        <h3 className="font-bold text-neutral-300 text-xs uppercase tracking-wider flex items-center gap-2">
                          <Layers className="w-3.5 h-3.5 text-orange-500" />
                          Columns / Field Schema
                        </h3>
                        <button
                          type="button"
                          onClick={() => {
                            const cols = datasetPreview?.columns?.map((c: any) => c.name || c) || [];
                            const text = `[${cols.join(', ')}]`;
                            navigator.clipboard.writeText(text).then(() => {
                              Sonner.toast.success("Copied all fields as list [a, b, c]");
                            });
                          }}
                          className="px-2 py-1 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded text-[10px] font-bold text-orange-400 transition-colors cursor-pointer"
                        >
                          Copy All
                        </button>
                      </div>

                      <div className="flex-1 overflow-y-auto p-4 space-y-2 pr-1">
                        {datasetPreview && datasetPreview.columns ? (
                          datasetPreview.columns.map((col: any) => (
                            <div key={col.name} className="flex items-center justify-between p-2.5 border-b border-neutral-850/50 last:border-0 hover:bg-neutral-900/30 rounded transition-colors">
                              <span
                                className="text-xs text-neutral-300 font-mono font-semibold cursor-pointer hover:text-orange-400 transition-colors"
                                onClick={() => {
                                  navigator.clipboard.writeText(col.name).then(() => {
                                    Sonner.toast.success(`Copied field: ${col.name}`);
                                  });
                                }}
                                title="Click to copy field name"
                              >
                                {col.name}
                              </span>
                              <span className="text-[9px] text-neutral-500 uppercase tracking-wider px-1.5 py-0.5 bg-neutral-900 border border-neutral-850 rounded font-bold">{col.type}</span>
                            </div>
                          ))
                        ) : (
                          <div className="text-center text-neutral-600 text-xs py-10">No schema columns found.</div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  // ECharts Code Editor Tab
                  <div className="flex-1 flex flex-col min-h-0 gap-4">
                    <div className="flex-1 flex flex-col min-h-0">
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-bold text-neutral-450 uppercase tracking-wider">ECharts Javascript Code</label>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setShowMaximizeCodeModal(true)}
                            className="p-1 hover:bg-neutral-850 rounded-lg text-neutral-400 hover:text-white transition-colors"
                            title="Maximize Editor"
                          >
                            <Maximize2 className="w-3.5 h-3.5 text-orange-400 hover:scale-110 transition-transform" />
                          </button>
                          <span className="text-[10px] text-orange-550 font-mono font-semibold">parameter: data[]</span>
                        </div>
                      </div>
                      <div className="w-full flex-1 flex bg-neutral-950 border border-neutral-850 rounded-xl overflow-hidden shadow-inner focus-within:border-orange-500/50">
                        <Editor
                          height="100%"
                          defaultLanguage="javascript"
                          theme="vs-dark"
                          value={echartsCode}
                          onChange={(value) => setEchartsCode(value || '')}
                          options={{
                            minimap: { enabled: false },
                            fontSize: 12,
                            padding: { top: 16 },
                            scrollBeyondLastLine: false,
                          }}
                        />
                      </div>
                    </div>

                    {/* Console & Action Controls */}
                    <div className="shrink-0 space-y-3.5">
                      <div className="flex flex-col gap-2">
                        <button
                          type="button"
                          onClick={() => setShowChartPreview(false)}
                          className="w-full flex items-center justify-center gap-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold text-xs py-2 px-4 rounded-xl transition-all cursor-pointer border border-neutral-700"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-orange-500" /> Generate Prompt
                        </button>
                        <button
                          type="button"
                          onClick={handleRunCode}
                          disabled={!datasetPreview}
                          className="w-full flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white font-bold text-sm py-2.5 px-4 rounded-xl transition-all shadow-lg shadow-orange-600/15 cursor-pointer"
                        >
                          <Play className="w-4 h-4" /> Run Code
                        </button>
                      </div>

                      {/* Bug Status / Logs Console */}
                      <div className="bg-neutral-950 border border-neutral-850 rounded-xl p-3.5 flex flex-col max-h-[140px] overflow-y-auto">
                        <div className="flex items-center justify-between mb-2 shrink-0 border-b border-neutral-850 pb-1.5">
                          <span className="text-[10px] font-bold text-neutral-450 uppercase tracking-wider">Console Status</span>
                          {evalError ? (
                            <span className="px-2 py-0.5 bg-rose-500/10 border border-rose-500/25 text-rose-400 text-[9px] rounded font-bold uppercase tracking-wider flex items-center gap-1 animate-pulse">
                              Bug Detected
                            </span>
                          ) : evalSuccess ? (
                            <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-[9px] rounded font-bold uppercase tracking-wider flex items-center gap-1">
                              Success
                            </span>
                          ) : (
                            <span className="text-[9px] text-neutral-600 font-semibold italic">Code not executed</span>
                          )}
                        </div>
                        <div className="flex-1 font-mono text-[11px] min-h-[40px] leading-relaxed">
                          {evalError ? (
                            <div className="text-rose-450 whitespace-pre-wrap">{evalError}</div>
                          ) : evalSuccess ? (
                            <div className="text-emerald-400">Chart compiled successfully! The live preview is updated.</div>
                          ) : (
                            <div className="text-neutral-600 italic">Click "Run Code" to compile and see the chart preview.</div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Main Preview Panel / AI Prompt Generator */}
            <div className="flex-1 bg-neutral-900 border border-neutral-800 rounded-2xl p-6 flex flex-col shadow-lg h-[600px]">
              {showChartPreview ? (
                // CHART PREVIEW MODE
                <>
                  {/* Header */}
                  <div className="flex justify-between items-center mb-4 shrink-0">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-orange-500 to-pink-600 flex items-center justify-center">
                        <BarChart3 className="w-3.5 h-3.5 text-white" />
                      </div>
                      <h3 className="font-bold text-neutral-200 text-sm">Chart Preview</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          try {
                            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(datasetPreview?.rows || [], null, 2));
                            const link = document.createElement('a');
                            link.download = `${chartName || 'chart'}_data.json`;
                            link.href = dataStr;
                            link.click();
                          } catch (e) { console.error(e); }
                        }}
                        disabled={!datasetPreview?.rows}
                        className="flex items-center gap-1 px-2.5 py-1.5 bg-neutral-950 border border-neutral-800 hover:bg-neutral-800 text-xs font-semibold text-neutral-400 hover:text-white rounded-lg transition-colors cursor-pointer disabled:opacity-40 select-none"
                        title="Export JSON Data"
                      >
                        <Database className="w-3.5 h-3.5 text-orange-500" />
                        Export JSON
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 bg-neutral-950 border border-neutral-850 rounded-xl p-4 overflow-hidden relative shadow-inner">
                    {evalSuccess && datasetPreview && datasetPreview.rows ? (
                      <div className="absolute inset-0 p-4">
                        <EChartRenderer ref={previewChartRef} config={currentChartConfig} data={datasetPreview.rows} />
                      </div>
                    ) : (
                      <div className="flex flex-col h-full overflow-auto items-center justify-center">
                        <div className="text-center text-neutral-600">
                          <Play className="w-12 h-12 mb-4 mx-auto opacity-20" />
                          <p className="text-sm">Run code to see the chart preview</p>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                // AI PROMPT GENERATOR MODE (RESTORED)
                <>
                  {/* Header */}
                  <div className="flex justify-between items-center mb-4 shrink-0">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-orange-500 to-pink-600 flex items-center justify-center">
                        <Sparkles className="w-3.5 h-3.5 text-white" />
                      </div>
                      <h3 className="font-bold text-neutral-200 text-sm">AI Prompt Generator</h3>
                      <span className="text-[10px] bg-orange-500/10 border border-orange-500/20 text-orange-400 px-2 py-0.5 rounded-full font-semibold">Gemini · ChatGPT</span>
                    </div>
                  </div>

                  {/* Description label */}
                  <p className="text-[11px] text-neutral-500 mb-4 shrink-0">Điền thông tin bên dưới để tạo prompt. Copy và dán vào <span className="text-orange-400 font-semibold">Gemini</span> hoặc <span className="text-green-400 font-semibold">ChatGPT</span> để nhận ECharts code.</p>

                  {/* Input Fields */}
                  <div className="flex flex-col gap-3 mb-4 shrink-0">
                    <div>
                      <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block mb-1">Mô tả chart bạn muốn vẽ</label>
                      <input
                        type="text"
                        placeholder="vd: biểu đồ cột thể hiện doanh thu theo tháng"
                        value={aiPromptChartDesc}
                        onChange={e => setAiPromptChartDesc(e.target.value)}
                        className="w-full bg-neutral-950 border border-neutral-800 focus:border-orange-500 rounded-xl px-3 py-2 text-xs text-neutral-200 focus:outline-none transition-colors"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block mb-1">Trường dữ liệu bạn muốn hiển thị</label>
                      <input
                        type="text"
                        placeholder="vd: trục X là date, trục Y là close_price"
                        value={aiPromptFieldDesc}
                        onChange={e => setAiPromptFieldDesc(e.target.value)}
                        className="w-full bg-neutral-950 border border-neutral-800 focus:border-orange-500 rounded-xl px-3 py-2 text-xs text-neutral-200 focus:outline-none transition-colors"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block mb-1">Lưu ý thiết kế (màu sắc, font, style...)</label>
                      <input
                        type="text"
                        placeholder="vd: dark theme, màu cam, không cần legend"
                        value={aiPromptDesignNote}
                        onChange={e => setAiPromptDesignNote(e.target.value)}
                        className="w-full bg-neutral-950 border border-neutral-800 focus:border-orange-500 rounded-xl px-3 py-2 text-xs text-neutral-200 focus:outline-none transition-colors"
                      />
                    </div>
                  </div>

                  {/* Generated Prompt Display */}
                  <div className="flex-1 flex flex-col min-h-0">
                    <div className="flex justify-between items-center mb-2 shrink-0">
                      <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Prompt được tạo</label>
                      <button
                        type="button"
                        onClick={() => {
                          const cols = datasetPreview?.columns?.map((c: any) => c.name || c).join(', ') || '(chưa load dataset)';
                          const prompt = [
                            `Tôi đang cấu hình Custom ECharts trong hệ thống Trực quan hóa. Hãy viết một đoạn mã JavaScript HOÀN CHỈNH để vẽ chart ${aiPromptChartDesc || 'Donut chart'} sử dụng các trường dữ liệu sau: ${cols}.`,
                            ``,
                            `DỮ LIỆU ĐẦU VÀO:`,
                            `Hệ thống sẽ cung cấp một biến cục bộ tên là 'data'. Biến 'data' này là một mảng các Object (Array of Objects), trong đó mỗi Object đại diện cho một bản ghi từ SQL. Ví dụ: [{ "truong_1": 10, "truong_2": "A" }, ...]`,
                            ``,
                            `YÊU CẦU VỀ CODE:`,
                            `1. KHÔNG sử dụng 'fetch' hay gọi API bên ngoài. Dữ liệu đã có sẵn trong biến 'data'.`,
                            `2. Hãy sử dụng hàm '.map()' trên biến 'data' để trích xuất các mảng cần thiết cho xAxis.data, yAxis.data hoặc series.data. Ví dụ: const labels = data.map(item => item.name);`,
                            `3. Yêu cầu hiển thị dữ liệu chi tiết: ${aiPromptFieldDesc || 'Hiển thị đầy đủ thông tin các trường lên Tooltip và Label'}.`,
                            `4. Lưu ý về thiết kế: ${aiPromptDesignNote || 'Thiết kế hiện đại, màu sắc hài hòa, có hiệu ứng dark mode, bo góc nhẹ'}.`,
                            `5. Biểu đồ phải có Tooltip trực quan (trigger: 'axis' hoặc 'item').`,
                            `6. BẮT BUỘC đoạn mã phải kết thúc bằng lệnh "return option;" (trong đó 'option' là đối tượng cấu hình ECharts). KHÔNG giải thích, CHỈ trả về đoạn code JavaScript.`,
                          ].join('\n');
                          navigator.clipboard.writeText(prompt).then(() => {
                            setAiPromptCopied(true);
                            setTimeout(() => setAiPromptCopied(false), 2000);
                            Sonner.toast.success("AI Prompt copied!");
                          });
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shadow-md shadow-orange-600/20"
                      >
                        {aiPromptCopied ? (
                          <><Check className="w-3.5 h-3.5" /> Đã copy!</>
                        ) : (
                          <><Copy className="w-3.5 h-3.5" /> Copy Prompt</>
                        )}
                      </button>
                    </div>
                    <div className="flex-1 bg-neutral-950 border border-neutral-800 rounded-xl p-4 overflow-auto shadow-inner relative">
                      <p className="text-xs leading-relaxed font-mono text-neutral-300 whitespace-pre-wrap select-all">
                        <span className="text-neutral-500">Tôi muốn vẽ biểu đồ </span>
                        <span className="text-orange-400 font-semibold">{aiPromptChartDesc || <span className="italic text-neutral-600">(mô tả loại chart)</span>}</span>
                        <span className="text-neutral-500"> sử dụng biến </span>
                        <span className="text-orange-400 font-semibold">data</span>
                        <span className="text-neutral-500"> là mảng các record chứa các cột: </span>
                        <span className="text-sky-400 font-semibold">
                          {datasetPreview?.columns?.length > 0
                            ? datasetPreview.columns.map((c: any) => c.name || c).join(', ')
                            : <span className="italic text-neutral-600">(chưa có dataset)</span>
                          }
                        </span>
                        <span className="text-neutral-500">. Chi tiết hiển thị: </span>
                        <span className="text-emerald-400 font-semibold">{aiPromptFieldDesc || <span className="italic text-neutral-600">(trường dữ liệu nào ở đâu)</span>}</span>
                        <span className="text-neutral-500">. Thiết kế: </span>
                        <span className="text-pink-400 font-semibold">{aiPromptDesignNote || <span className="italic text-neutral-600">(màu sắc, style...)</span>}</span>
                        <span className="text-neutral-500">. Bắt buộc kết thúc bằng lệnh </span>
                        <span className="text-orange-400 font-semibold">return option;</span>
                      </p>

                      {/* AI Links */}
                      <div className="mt-4 pt-3 border-t border-neutral-800/60 flex items-center gap-3">
                        <span className="text-[10px] text-neutral-600 font-semibold">Mở với:</span>
                        <a
                          href={`https://gemini.google.com/`}
                          target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-600/10 border border-blue-500/20 hover:bg-blue-600/20 text-blue-400 text-[10px] font-bold rounded-lg transition-colors"
                        >
                          Gemini
                        </a>
                        <a
                          href={`https://chat.openai.com/`}
                          target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-2.5 py-1 bg-green-600/10 border border-green-500/20 hover:bg-green-600/20 text-green-400 text-[10px] font-bold rounded-lg transition-colors"
                        >
                          ChatGPT
                        </a>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          MODALS
          ========================================== */}

      {/* ─── No Permission Tab Popup ─── */}
      {showNoPermTabPopup && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setShowNoPermTabPopup(false)}>
          <div className="w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl p-6 relative animate-in scale-in duration-150 text-center" onClick={e => e.stopPropagation()}>
            <div className="flex justify-center mb-4">
              <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                <ShieldX className="w-7 h-7 text-red-400" />
              </div>
            </div>
            <h3 className="font-bold text-lg text-neutral-50 mb-2">No Permission</h3>
            <p className="text-sm text-neutral-400 mb-4">
              You don't have access to <span className="text-orange-400 font-semibold">"{noPermTabName}"</span> tab. Contact your dashboard admin to request access.
            </p>
            <button
              onClick={() => setShowNoPermTabPopup(false)}
              className="px-6 py-2.5 bg-orange-600 hover:bg-orange-700 text-white text-sm font-bold rounded-xl transition-all cursor-pointer"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {/* ─── Chart Permission Modal ─── */}
      {showPermissionModal && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl flex flex-col max-h-[85vh] animate-in scale-in duration-150">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-5 border-b border-neutral-800 shrink-0">
              <div>
                <h3 className="font-bold text-lg text-neutral-50 flex items-center gap-2">
                  <Shield className="text-orange-500 w-5 h-5" />
                  Chart Permissions
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  {permissionTargetChartIds.length === 1
                    ? `Setting access for: ${dashboardItems.find(i => i.chart?.id === permissionTargetChartIds[0])?.chart?.name || permissionTargetChartIds[0]}`
                    : `Setting access for ${permissionTargetChartIds.length} charts`
                  }
                </p>
              </div>
              <button
                onClick={() => { setShowPermissionModal(false); setPermissionUserSearch(''); }}
                className="p-1.5 hover:bg-neutral-800 rounded-xl text-neutral-400 hover:text-neutral-50 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Info Banner */}
            <div className="mx-5 mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-2 shrink-0">
              <Lock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-300">
                <span className="font-bold">Private by default.</span> Charts with no users assigned are only visible to <span className="font-semibold">admins</span>. Add users below to grant view access.
              </p>
            </div>

            {/* Search Users */}
            <div className="px-5 pt-4 shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-neutral-500" />
                <input
                  type="text"
                  placeholder="Search users by name or email..."
                  value={permissionUserSearch}
                  onChange={e => setPermissionUserSearch(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-9 pr-4 py-2 text-sm text-neutral-50 focus:border-orange-500 focus:outline-none transition-colors"
                />
              </div>
            </div>

            {/* Selected Users Chips */}
            {(() => {
              const allPermitted = permissionTargetChartIds.flatMap(cid => tempChartPermissions[cid] || []);
              const uniquePermittedIds = [...new Set(allPermitted)];
              const selectedUsers = allSystemUsers.filter(u => uniquePermittedIds.includes(u.id));

              if (selectedUsers.length === 0) return null;

              return (
                <div className="px-5 pt-3 shrink-0 flex flex-wrap gap-2 max-h-[80px] overflow-y-auto custom-scrollbar">
                  {selectedUsers.map(u => (
                    <div 
                      key={u.id}
                      className="flex items-center gap-1.5 px-2 py-1 bg-orange-500/20 border border-orange-500/30 rounded-lg text-orange-400 text-[10px] font-bold animate-in zoom-in duration-150"
                    >
                      <span className="truncate max-w-[100px]">{u.full_name || u.email}</span>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setTempChartPermissions(prev => {
                            const next = { ...prev };
                            permissionTargetChartIds.forEach(cid => {
                              next[cid] = (next[cid] || []).filter(uid => uid !== u.id);
                            });
                            return next;
                          });
                        }}
                        className="p-0.5 hover:bg-orange-500/30 rounded transition-colors cursor-pointer"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  ))}
                </div>
              );
            })()}

            {/* Current Permissions Summary */}
            <div className="px-5 pt-3 shrink-0">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">
                  Grant access to users
                </span>
                {(() => {
                  // Get union of all user_ids across target charts for initial selection
                  const allPermitted = permissionTargetChartIds.flatMap(cid => chartPermissions[cid] || []);
                  const uniquePermitted = [...new Set(allPermitted)];
                  return uniquePermitted.length > 0 ? (
                    <span className="text-[10px] text-orange-400 font-semibold">{uniquePermitted.length} user{uniquePermitted.length > 1 ? 's' : ''} with access</span>
                  ) : null;
                })()}
              </div>
            </div>

            {/* Users List */}
            <div className="flex-1 overflow-auto px-5 pb-2 space-y-2 min-h-0">
              {allSystemUsers
                .filter(u => {
                  const q = permissionUserSearch.toLowerCase();
                  return !q || (u.email || '').toLowerCase().includes(q) || (u.full_name || '').toLowerCase().includes(q);
                })
                .map(u => {
                  // For single chart: check if user is in that chart's permissions
                  // For multi-chart: check if user is in ALL selected charts
                  const isGranted = permissionTargetChartIds.every(cid => (tempChartPermissions[cid] || []).includes(u.id));
                  const isPartial = !isGranted && permissionTargetChartIds.some(cid => (tempChartPermissions[cid] || []).includes(u.id));

                  return (
                    <div
                      key={u.id}
                      onClick={() => {
                        // Toggle permission for this user across all target charts
                        setTempChartPermissions(prev => {
                          const next = { ...prev };
                          if (isGranted) {
                            // Remove from all target charts
                            permissionTargetChartIds.forEach(cid => {
                              next[cid] = (next[cid] || []).filter(uid => uid !== u.id);
                            });
                          } else {
                            // Add to all target charts
                            permissionTargetChartIds.forEach(cid => {
                              next[cid] = [...new Set([...(next[cid] || []), u.id])];
                            });
                          }
                          return next;
                        });
                      }}
                      className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border ${isGranted ? 'bg-orange-500/10 border-orange-500/30' : isPartial ? 'bg-amber-500/5 border-amber-500/20' : 'border-neutral-800 hover:border-neutral-700 hover:bg-neutral-800/50'}`}
                    >
                      {/* Avatar */}
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${isGranted ? 'bg-orange-500 text-white' : 'bg-neutral-800 text-neutral-400'}`}>
                        {(u.full_name || u.email || '?')[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-neutral-200 truncate">{u.full_name || u.email}</p>
                        <p className="text-[10px] text-neutral-500 truncate">{u.email} · {u.role || 'user'}</p>
                      </div>
                      <div className="shrink-0">
                        {isGranted ? (
                          <ShieldCheck className="w-4 h-4 text-orange-400" />
                        ) : isPartial ? (
                          <Shield className="w-4 h-4 text-amber-400 opacity-50" />
                        ) : (
                          <ShieldX className="w-4 h-4 text-neutral-600" />
                        )}
                      </div>
                    </div>
                  );
                })
              }
              {allSystemUsers.filter(u => {
                const q = permissionUserSearch.toLowerCase();
                return !q || (u.email || '').toLowerCase().includes(q) || (u.full_name || '').toLowerCase().includes(q);
              }).length === 0 && (
                <div className="text-center text-neutral-500 text-xs py-8">No users found matching "{permissionUserSearch}"</div>
              )}
            </div>

            {/* Footer */}
            <div className="p-5 border-t border-neutral-800 flex justify-between items-center shrink-0">
              <button
                onClick={() => {
                  // Clear all permissions for target charts in temp state
                  setTempChartPermissions(prev => {
                    const next = { ...prev };
                    permissionTargetChartIds.forEach(cid => { next[cid] = []; });
                    return next;
                  });
                }}
                className="px-4 py-2 text-neutral-500 hover:text-red-400 text-sm font-semibold transition-colors cursor-pointer"
              >
                Clear All
              </button>
              <div className="flex gap-3">
                <button
                  onClick={() => { setShowPermissionModal(false); setPermissionUserSearch(''); }}
                  className="px-4 py-2 border border-neutral-700 text-neutral-300 text-sm font-semibold rounded-xl hover:bg-neutral-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  disabled={savingPermissions}
                  onClick={async () => {
                    setSavingPermissions(true);
                    try {
                      const finalPerms = tempChartPermissions;
                      // Save permissions to backend
                      if (permissionTargetChartIds.length === 1) {
                        const chartId = permissionTargetChartIds[0];
                        await api.permissions.setChartPermissions(
                          chartId,
                          finalPerms[chartId] || []
                        );
                      } else {
                        // For batch: we need to handle this carefully.
                        // The UI toggles them all, so we just send the updated perms for each chart.
                        // Actually, api.permissions.batchSetPermissions might expect a single list for ALL charts.
                        // Let's see how batchSetPermissions is implemented or just loop.
                        for (const chartId of permissionTargetChartIds) {
                          await api.permissions.setChartPermissions(chartId, finalPerms[chartId] || []);
                        }
                      }
                      
                      // Update main state
                      setChartPermissions(finalPerms);
                      
                      Sonner.toast.success('Permissions saved successfully');
                      setShowPermissionModal(false);
                      setPermissionUserSearch('');
                    } catch (err) {
                      Sonner.toast.error('Failed to save permissions');
                    } finally {
                      setSavingPermissions(false);
                    }
                  }}
                  className="px-6 py-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-all cursor-pointer shadow-lg shadow-orange-600/20"
                >
                  {savingPermissions ? 'Saving...' : 'Save Permissions'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Dashboard Modal */}
      {showCreateDashModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl p-6 relative animate-in scale-in duration-150">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-xl text-neutral-50 flex items-center gap-2">
                <LayoutDashboard className="text-orange-500" />
                New Dashboard
              </h3>
              <button
                onClick={() => setShowCreateDashModal(false)}
                className="text-neutral-400 hover:text-neutral-200 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-neutral-400 block mb-1">Name</label>
                <input
                  type="text"
                  placeholder="e.g. Sales KPI, User Engagement"
                  value={newDashName}
                  onChange={e => setNewDashName(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-sm text-orange-400 focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-400 block mb-1">Description (Optional)</label>
                <textarea
                  placeholder="Briefly describe what this dashboard visualizes..."
                  value={newDashDesc}
                  onChange={e => setNewDashDesc(e.target.value)}
                  rows={3}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-sm text-neutral-250 focus:border-orange-500 focus:outline-none resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-8">
              <button
                onClick={() => setShowCreateDashModal(false)}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-semibold text-sm cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateDashboard}
                className="px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold text-sm cursor-pointer"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dataset Preview Modal */}
      {showPreviewDatasetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-4xl bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl p-6 relative max-h-[85vh] flex flex-col animate-in scale-in duration-150">
            <div className="flex justify-between items-center mb-5 shrink-0">
              <h3 className="font-bold text-lg text-neutral-50 flex items-center gap-2">
                <Table2 className="text-orange-500" />
                Dataset Data Preview
              </h3>
              <button
                onClick={() => setShowPreviewDatasetModal(false)}
                className="text-neutral-400 hover:text-neutral-200 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 bg-neutral-950 border border-neutral-850 rounded-xl overflow-auto p-4 min-h-0 shadow-inner">
              {previewLoading ? (
                <div className="h-full flex items-center justify-center py-20">
                  <div className="w-8 h-8 border-2 border-neutral-800 border-t-orange-500 rounded-full animate-spin"></div>
                </div>
              ) : previewDatasetData?.error ? (
                <div className="text-red-400 text-sm text-center py-10 font-medium">
                  {previewDatasetData.error}
                </div>
              ) : previewDatasetData ? (
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-neutral-800 text-neutral-450">
                      {previewDatasetData.columns.map((c: any) => (
                        <th key={c.name} className="pb-3 font-semibold px-3 whitespace-nowrap uppercase text-xs tracking-wider">{c.name}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewDatasetData.rows.map((row: any, idx: number) => (
                      <tr key={idx} className="border-b border-neutral-900 last:border-0 hover:bg-neutral-900/30">
                        {previewDatasetData.columns.map((c: any) => (
                          <td key={c.name} className="py-2.5 px-3 text-neutral-350 whitespace-nowrap font-mono text-xs">{row[c.name]?.toString() || "-"}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="h-full flex items-center justify-center text-neutral-600 italic">
                  No preview data loaded.
                </div>
              )}
            </div>

            <div className="flex justify-end mt-5 shrink-0">
              <button
                onClick={() => setShowPreviewDatasetModal(false)}
                className="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold text-sm cursor-pointer shadow"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Select Dataset for New Chart Modal */}
      {showSelectDatasetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl p-6 relative animate-in scale-in duration-150 flex flex-col max-h-[80vh]">
            <div className="flex justify-between items-center mb-4 shrink-0">
              <h3 className="font-bold text-xl text-neutral-50 flex items-center gap-2">
                <Table2 className="text-orange-500" />
                Select Dataset
              </h3>
              <button
                onClick={() => setShowSelectDatasetModal(false)}
                className="text-neutral-400 hover:text-neutral-200 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-neutral-400 mb-4 shrink-0">Choose a dataset from the list below to build your chart visualization.</p>

            {/* Search Input */}
            <div className="relative mb-4 shrink-0">
              <Search className="absolute left-3 top-3 w-4 h-4 text-neutral-500" />
              <input
                type="text"
                placeholder="Search datasets by name..."
                value={datasetSearchQuery}
                onChange={e => setDatasetSearchQuery(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-neutral-50 focus:border-orange-500 focus:outline-none transition-colors"
              />
            </div>

            {/* Datasets List */}
            <div className="flex-1 overflow-y-auto space-y-2.5 min-h-0 pr-1 select-none">
              {datasets.filter(ds => ds.name.toLowerCase().includes(datasetSearchQuery.toLowerCase())).length === 0 ? (
                <div className="text-center text-neutral-550 py-10 text-sm">
                  {datasets.length === 0 ? (
                    <div>
                      <p>No datasets connected yet.</p>
                      <button
                        onClick={() => {
                          setShowSelectDatasetModal(false);
                          router.push("/data-sources");
                        }}
                        className="mt-4 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-xl text-xs font-semibold transition-colors"
                      >
                        Go to Kho truy vấn
                      </button>
                    </div>
                  ) : (
                    "No datasets match your search query."
                  )}
                </div>
              ) : (
                datasets
                  .filter(ds => ds.name.toLowerCase().includes(datasetSearchQuery.toLowerCase()))
                  .map(ds => (
                    <div
                      key={ds.id}
                      onClick={() => handleSelectDatasetForNewChart(ds.id)}
                      className="p-4 bg-neutral-950 border border-neutral-850 hover:border-orange-500/60 hover:bg-orange-500/5 rounded-xl cursor-pointer transition-all duration-200 group flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-neutral-900 border border-neutral-800 rounded-lg text-orange-500 group-hover:bg-orange-600 group-hover:text-white transition-all">
                          <FileSpreadsheet className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-orange-400 group-hover:text-orange-300 text-sm">{ds.name}</h4>
                          <span className="text-[10px] text-neutral-500 font-medium">
                            {ds.columns_schema?.length || 0} fields mapped
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-neutral-600 group-hover:text-orange-500 group-hover:translate-x-0.5 transition-all" />
                    </div>
                  ))
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6 shrink-0 border-t border-neutral-800/60 pt-4">
              <button
                onClick={() => setShowSelectDatasetModal(false)}
                className="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold text-sm cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Maximize Code Modal */}
      {showMaximizeCodeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-[90vw] h-[85vh] bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl p-6 relative flex flex-col animate-in scale-in duration-150">
            <div className="flex justify-between items-center mb-4 shrink-0">
              <h3 className="font-bold text-xl text-neutral-50 flex items-center gap-2">
                <Maximize2 className="text-orange-400 w-5 h-5" />
                Fullscreen ECharts Code Editor
              </h3>
              <button
                onClick={() => setShowMaximizeCodeModal(false)}
                className="text-neutral-400 hover:text-neutral-200 transition-colors p-1.5 hover:bg-neutral-800 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 flex gap-6 overflow-hidden min-h-0">
              {/* Left Large Code Editor */}
              <div className="flex-1 flex bg-neutral-950 border border-neutral-850 rounded-xl overflow-hidden shadow-inner focus-within:border-orange-500/50">
                <Editor
                  height="100%"
                  defaultLanguage="javascript"
                  theme="vs-dark"
                  value={echartsCode}
                  onChange={(value) => setEchartsCode(value || '')}
                  options={{
                    minimap: { enabled: true },
                    fontSize: 13,
                    padding: { top: 16 },
                    scrollBeyondLastLine: false,
                  }}
                />
              </div>

              {/* Right Live Preview / Console Panel */}
              <div className="w-[400px] flex flex-col gap-4 shrink-0 min-h-0">
                <div className="flex-1 bg-neutral-950 border border-neutral-850 rounded-xl p-4 overflow-hidden relative shadow-inner">
                  {evalSuccess && datasetPreview && datasetPreview.rows ? (
                    <div className="absolute inset-0 p-4">
                      <EChartRenderer config={currentChartConfig} data={datasetPreview.rows} />
                    </div>
                  ) : (
                    <div className="flex flex-col h-full p-2 overflow-auto">
                      <h4 className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-4">AI Instruction Prompt</h4>
                      <div className="flex-1 bg-neutral-900/50 border border-neutral-800 rounded-xl p-5 font-mono text-[11px] text-orange-400/90 leading-relaxed whitespace-pre-wrap select-all">
                        {`Yêu cầu AI viết code ECharts cho hệ thống này:
1. Sử dụng biến 'data' (mảng các Object) làm nguồn dữ liệu.
2. Dùng 'data.map(item => item.ten_cot)' để lấy dữ liệu cho các trục.
3. Luôn kết thúc bằng lệnh 'return option;'.
4. Các cột hiện có: ${datasetPreview?.columns?.map((c: any) => c.name || c).join(', ') || '...loading'}`}
                      </div>
                      <div className="mt-4 p-4 bg-orange-500/5 border border-orange-500/10 rounded-xl">
                        <p className="text-xs text-neutral-400 italic">
                          Click "Run Code" to compile and see the chart preview.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Controls & Console */}
                <div className="shrink-0 space-y-3">
                  <button
                    type="button"
                    onClick={handleRunCode}
                    disabled={!datasetPreview}
                    className="w-full flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white font-bold text-sm py-2.5 px-4 rounded-xl transition-all shadow-lg shadow-orange-600/15 cursor-pointer"
                  >
                    <Plus className="w-4 h-4 rotate-45" /> Run Code
                  </button>

                  <div className="bg-neutral-950 border border-neutral-850 rounded-xl p-4 flex flex-col max-h-[160px] overflow-y-auto">
                    <div className="flex items-center justify-between mb-2 shrink-0 border-b border-neutral-850 pb-1.5">
                      <span className="text-[10px] font-bold text-neutral-450 uppercase tracking-wider">Console Status</span>
                      {evalError ? (
                        <span className="px-2 py-0.5 bg-rose-500/10 border border-rose-500/25 text-rose-400 text-[9px] rounded font-bold uppercase tracking-wider animate-pulse">
                          Bug Detected
                        </span>
                      ) : evalSuccess ? (
                        <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-[9px] rounded font-bold uppercase tracking-wider">
                          Success
                        </span>
                      ) : (
                        <span className="text-[9px] text-neutral-600 font-semibold italic">Code not executed</span>
                      )}
                    </div>
                    <div className="flex-1 font-mono text-[11px] min-h-[40px] leading-relaxed">
                      {evalError ? (
                        <div className="text-rose-450 whitespace-pre-wrap">{evalError}</div>
                      ) : evalSuccess ? (
                        <div className="text-emerald-400">Chart compiled successfully! Live preview is active.</div>
                      ) : (
                        <div className="text-neutral-600 italic">Click "Run Code" to compile and test.</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-4 shrink-0 border-t border-neutral-800/60 pt-4">
              <button
                onClick={() => setShowMaximizeCodeModal(false)}
                className="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold text-sm cursor-pointer"
              >
                Close Editor
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fullsize Preview Modal */}
      {showFullsizePreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-[90vw] h-[85vh] bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl p-6 relative flex flex-col animate-in scale-in duration-150">
            <div className="flex justify-between items-center mb-4 shrink-0">
              <h3 className="font-bold text-xl text-neutral-50 flex items-center gap-2">
                <BarChart3 className="text-orange-400 w-5 h-5" />
                {chartName || "Untitled Chart"} (Fullsize Preview)
              </h3>
              <div className="flex items-center gap-2">
                {/* Export PNG */}
                <button
                  type="button"
                  onClick={() => handleExportChart('png', true)}
                  disabled={!datasetPreview?.rows}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-950 border border-neutral-850 hover:bg-neutral-800 text-xs font-semibold text-neutral-300 hover:text-white rounded-lg transition-colors cursor-pointer disabled:opacity-50 select-none hover:border-orange-500/40"
                  title="Export PNG Image"
                >
                  <Download className="w-3.5 h-3.5 text-orange-400" />
                  PNG
                </button>

                {/* Export JPEG */}
                <button
                  type="button"
                  onClick={() => handleExportChart('jpeg', true)}
                  disabled={!datasetPreview?.rows}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-950 border border-neutral-850 hover:bg-neutral-800 text-xs font-semibold text-neutral-300 hover:text-white rounded-lg transition-colors cursor-pointer disabled:opacity-50 select-none hover:border-orange-500/40"
                  title="Export JPEG Image"
                >
                  <Download className="w-3.5 h-3.5 text-orange-400" />
                  JPEG
                </button>

                {/* Export JSON Data */}
                <button
                  type="button"
                  onClick={() => {
                    try {
                      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(datasetPreview.rows, null, 2));
                      const link = document.createElement('a');
                      link.download = `${chartName || 'chart'}_data.json`;
                      link.href = dataStr;
                      link.click();
                    } catch (e) {
                      console.error(e);
                    }
                  }}
                  disabled={!datasetPreview?.rows}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-950 border border-neutral-850 hover:bg-neutral-800 text-xs font-semibold text-neutral-300 hover:text-white rounded-lg transition-colors cursor-pointer disabled:opacity-50 select-none hover:border-orange-500/40"
                  title="Export JSON Data"
                >
                  <Database className="w-3.5 h-3.5 text-orange-500" />
                  JSON
                </button>

                <div className="w-px h-6 bg-neutral-850 mx-1"></div>

                <button
                  onClick={() => setShowFullsizePreview(false)}
                  className="text-neutral-400 hover:text-neutral-200 transition-colors p-1.5 hover:bg-neutral-800 rounded-xl"
                  title="Close Fullsize Preview"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 bg-neutral-950 border border-neutral-800 rounded-xl p-6 overflow-hidden relative shadow-inner">
              {evalSuccess && datasetPreview && datasetPreview.rows ? (
                <div className="absolute inset-0 p-6">
                  <EChartRenderer ref={fullsizeChartRef} config={currentChartConfig} data={datasetPreview.rows} />
                </div>
              ) : (
                <div className="max-w-3xl mx-auto flex flex-col h-full justify-center overflow-auto">
                  <h4 className="text-[12px] font-bold text-neutral-500 uppercase tracking-wider mb-6 text-center">AI Instruction Prompt</h4>
                  <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-10 font-mono text-xl text-orange-400 leading-relaxed whitespace-pre-wrap select-all shadow-2xl">
                    {`trong edit chart phần hiển thị các cột của dataset thay vì để là collapse hay expand thay bằng nút copy toàn bộ tên trường đưa vào một list dạng [a,b,c] nhé. và khi ấn vào trường nào thì có thể thực hiện copy name của trường đó`}
                  </div>
                  <p className="mt-8 text-sm text-neutral-500 text-center italic">
                    Run the code in the editor to see the chart visualization here.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Direct ECharts Editor Modal from Dashboard */}
      {editDashboardChartItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-[90vw] h-[85vh] bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl p-6 relative flex flex-col animate-in scale-in duration-150">
            <div className="flex justify-between items-center mb-4 shrink-0">
              <h3 className="font-bold text-xl text-neutral-50 flex items-center gap-2">
                <PenTool className="text-orange-400 w-5 h-5" />
                Edit Code for: {editDashboardChartItem.chart.name}
              </h3>
              <button
                onClick={() => setEditDashboardChartItem(null)}
                className="text-neutral-400 hover:text-neutral-200 transition-colors p-1.5 hover:bg-neutral-800 rounded-xl cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 flex gap-6 overflow-hidden min-h-0">
              {/* Left Code Editor */}
              <div className="flex-1 flex bg-neutral-950 border border-neutral-850 rounded-xl overflow-hidden shadow-inner focus-within:border-orange-500/50">
                <Editor
                  height="100%"
                  defaultLanguage="javascript"
                  theme="vs-dark"
                  value={editDashboardChartCode}
                  onChange={(value) => setEditDashboardChartCode(value || '')}
                  options={{
                    minimap: { enabled: true },
                    fontSize: 13,
                    padding: { top: 16 },
                    scrollBeyondLastLine: false,
                  }}
                />
              </div>

              {/* Right Live Preview / Console Panel */}
              <div className="w-[400px] flex flex-col gap-4 shrink-0 min-h-0">
                <div className="flex-1 bg-neutral-950 border border-neutral-850 rounded-xl p-4 overflow-hidden relative shadow-inner">
                  {editDashboardChartItem.data ? (
                    <div className="absolute inset-0 p-4">
                      <EChartRenderer
                        config={{
                          chartType: "custom",
                          encodings: {},
                          echartsOption: editDashboardChartEvaluatedOption
                        }}
                        data={getFilteredData(editDashboardChartItem)}
                      />
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-neutral-600">
                      No data available for preview.
                    </div>
                  )}
                </div>

                {/* Controls & Console */}
                <div className="shrink-0 space-y-3">
                  <button
                    type="button"
                    onClick={handleRunDirectChartCode}
                    className="w-full flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 text-white font-bold text-sm py-2.5 px-4 rounded-xl transition-all shadow-lg shadow-orange-600/15 cursor-pointer"
                  >
                    Run Code
                  </button>

                  <div className="bg-neutral-950 border border-neutral-850 rounded-xl p-4 flex flex-col max-h-[160px] overflow-y-auto">
                    <div className="flex items-center justify-between mb-2 shrink-0 border-b border-neutral-850 pb-1.5">
                      <span className="text-[10px] font-bold text-neutral-450 uppercase tracking-wider">Console Status</span>
                      {editDashboardChartEvalError ? (
                        <span className="px-2 py-0.5 bg-rose-500/10 border border-rose-500/25 text-rose-400 text-[9px] rounded font-bold uppercase tracking-wider animate-pulse">
                          Bug Detected
                        </span>
                      ) : editDashboardChartEvalSuccess ? (
                        <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-[9px] rounded font-bold uppercase tracking-wider">
                          Success
                        </span>
                      ) : (
                        <span className="text-[9px] text-neutral-600 font-semibold italic">Code not executed</span>
                      )}
                    </div>
                    <div className="flex-1 font-mono text-[11px] min-h-[40px] leading-relaxed">
                      {editDashboardChartEvalError ? (
                        <div className="text-rose-450 whitespace-pre-wrap">{editDashboardChartEvalError}</div>
                      ) : editDashboardChartEvalSuccess ? (
                        <div className="text-emerald-400">Chart compiled successfully! Live preview is active.</div>
                      ) : (
                        <div className="text-neutral-600 italic">Click "Run Code" to compile and test.</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-4 shrink-0 border-t border-neutral-800/60 pt-4">
              <button
                onClick={() => setEditDashboardChartItem(null)}
                className="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold text-sm cursor-pointer"
              >
                Close Editor
              </button>
              <button
                onClick={handleSaveDirectChartCode}
                className="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold text-sm cursor-pointer"
              >
                Save & Run
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Dashboard Template Settings Modal */}
      {showTemplateSettings && selectedDashboard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div ref={templateSettingsRef} className="w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden animate-in scale-in duration-150 flex flex-col">
            <div className="flex justify-between items-center p-5 border-b border-neutral-800 bg-neutral-900/50">
              <div>
                <h3 className="font-bold text-lg text-neutral-50 flex items-center gap-2">
                  <Palette className="text-pink-400 w-5 h-5" />
                  Dashboard Template Editor
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">Customize global styles for this dashboard</p>
              </div>
              <button
                onClick={() => setShowTemplateSettings(false)}
                className="text-neutral-400 hover:text-neutral-200 transition-colors p-1.5 hover:bg-neutral-800 rounded-xl cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar flex-1">
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-neutral-800 pb-2">
                  <LayoutDashboard className="w-4 h-4 text-neutral-500" />
                  <span className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Dashboard Canvas</span>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Canvas Background Color</label>
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-xl border border-neutral-800 overflow-hidden shrink-0 shadow-inner">
                      <input
                        type="color"
                        value={selectedDashboard.theme_config?.canvasBg || '#000000'}
                        onChange={e => setSelectedDashboard((prev: any) => ({ ...prev, theme_config: { ...prev.theme_config, canvasBg: e.target.value } }))}
                        className="w-[150%] h-[150%] -translate-x-[15%] -translate-y-[15%] cursor-pointer border-0 p-0"
                      />
                    </div>
                    <div className="flex-1 flex gap-1">
                      <input
                        type="text"
                        value={selectedDashboard.theme_config?.canvasBg || ''}
                        onChange={e => setSelectedDashboard((prev: any) => ({ ...prev, theme_config: { ...prev.theme_config, canvasBg: e.target.value } }))}
                        placeholder="Hex or rgba"
                        className="flex-1 bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2 text-sm text-neutral-50 focus:outline-none focus:border-orange-500 font-mono shadow-inner"
                      />
                      <button
                        onClick={() => setSelectedDashboard((prev: any) => ({ ...prev, theme_config: { ...prev.theme_config, canvasBg: 'transparent' } }))}
                        className="px-3 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-xs font-semibold text-neutral-300"
                      >
                        Transparent
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Layout Mode Selector */}
              <div className="space-y-2 pt-2">
                <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Layout Mode</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => { setLayoutMode('slide'); setZoom(1); setPan({ x: 0, y: 0 }); }}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all cursor-pointer ${layoutMode === 'slide'
                      ? 'border-orange-500 bg-orange-500/10 shadow-lg shadow-orange-500/10'
                      : 'border-neutral-800 bg-neutral-950 hover:border-neutral-700'
                      }`}
                  >
                    <div className="w-10 h-7 border border-neutral-600 rounded-md flex flex-col">
                      <div className="flex-1 border-b border-neutral-700" />
                      <div className="flex-1" />
                    </div>
                    <span className={`text-xs font-bold ${layoutMode === 'slide' ? 'text-orange-400' : 'text-neutral-500'}`}>Slide</span>
                    <span className="text-[9px] text-neutral-600 text-center leading-tight">Scroll-based layout</span>
                  </button>
                  <button
                    onClick={() => setLayoutMode('whiteboard')}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all cursor-pointer ${layoutMode === 'whiteboard'
                      ? 'border-orange-500 bg-orange-500/10 shadow-lg shadow-orange-500/10'
                      : 'border-neutral-800 bg-neutral-950 hover:border-neutral-700'
                      }`}
                  >
                    <div className="w-10 h-7 border border-neutral-600 rounded-md relative overflow-hidden">
                      <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.15) 0.5px, transparent 0.5px)', backgroundSize: '4px 4px' }} />
                    </div>
                    <span className={`text-xs font-bold ${layoutMode === 'whiteboard' ? 'text-orange-400' : 'text-neutral-500'}`}>Whiteboard</span>
                    <span className="text-[9px] text-neutral-600 text-center leading-tight">Infinite canvas, zoom & pan</span>
                  </button>
                </div>
              </div>

              <div className="space-y-4 pt-2">
                <div className="flex items-center gap-2 border-b border-neutral-800 pb-2">
                  <BarChart3 className="w-4 h-4 text-neutral-500" />
                  <span className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Global Chart Styling</span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Chart Background</label>
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-xl border border-neutral-800 overflow-hidden shrink-0 shadow-inner">
                        <input
                          type="color"
                          value={selectedDashboard.theme_config?.chartBg || '#171717'}
                          onChange={e => setSelectedDashboard((prev: any) => ({ ...prev, theme_config: { ...prev.theme_config, chartBg: e.target.value } }))}
                          className="w-[150%] h-[150%] -translate-x-[15%] -translate-y-[15%] cursor-pointer border-0 p-0"
                        />
                      </div>
                      <input
                        type="text"
                        value={selectedDashboard.theme_config?.chartBg || ''}
                        onChange={e => setSelectedDashboard((prev: any) => ({ ...prev, theme_config: { ...prev.theme_config, chartBg: e.target.value } }))}
                        placeholder="e.g. #171717"
                        className="flex-1 w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-50 focus:outline-none focus:border-orange-500 font-mono shadow-inner"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Chart Border Color</label>
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-xl border border-neutral-800 overflow-hidden shrink-0 shadow-inner">
                        <input
                          type="color"
                          value={selectedDashboard.theme_config?.chartBorderColor || '#262626'}
                          onChange={e => setSelectedDashboard((prev: any) => ({ ...prev, theme_config: { ...prev.theme_config, chartBorderColor: e.target.value } }))}
                          className="w-[150%] h-[150%] -translate-x-[15%] -translate-y-[15%] cursor-pointer border-0 p-0"
                        />
                      </div>
                      <input
                        type="text"
                        value={selectedDashboard.theme_config?.chartBorderColor || ''}
                        onChange={e => setSelectedDashboard((prev: any) => ({ ...prev, theme_config: { ...prev.theme_config, chartBorderColor: e.target.value } }))}
                        placeholder="e.g. #262626"
                        className="flex-1 w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-50 focus:outline-none focus:border-orange-500 font-mono shadow-inner"
                      />
                    </div>
                  </div>

                  <div className="space-y-2 col-span-2">
                    <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Chart Corner Radius (px)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      placeholder="e.g. 16"
                      value={selectedDashboard.theme_config?.chartBorderRadius !== undefined ? selectedDashboard.theme_config.chartBorderRadius : ''}
                      onChange={e => setSelectedDashboard((prev: any) => ({ ...prev, theme_config: { ...prev.theme_config, chartBorderRadius: e.target.value ? parseInt(e.target.value) : undefined } }))}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2 text-sm text-neutral-50 focus:outline-none focus:border-orange-500 transition-colors shadow-inner"
                    />
                  </div>

                  <div className="space-y-2 col-span-2">
                    <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Box Shadow (CSS)</label>
                    <input
                      type="text"
                      placeholder="e.g. 0 10px 15px -3px rgba(0, 0, 0, 0.5)"
                      value={selectedDashboard.theme_config?.chartShadow || ''}
                      onChange={e => setSelectedDashboard((prev: any) => ({ ...prev, theme_config: { ...prev.theme_config, chartShadow: e.target.value } }))}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2 text-sm text-neutral-50 focus:outline-none focus:border-orange-500 transition-colors font-mono shadow-inner"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="p-5 border-t border-neutral-800 bg-neutral-900/50 flex justify-end gap-3 flex-shrink-0">
              <button
                onClick={() => setShowTemplateSettings(false)}
                className="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-orange-600/20 cursor-pointer"
              >
                Close (Auto-saved locally)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Widget Style Editor Sidebar */}
      {showWidgetStyleModal && stylingWidgetId && (
        <div className="fixed inset-y-0 right-0 w-96 bg-neutral-900 border-l border-neutral-800 shadow-2xl z-35 flex flex-col animate-in slide-in-from-right duration-200 overflow-hidden">
          {(() => {
            const widget = dashboardWidgets.find(w => w.id === stylingWidgetId);
            if (!widget) return null;

            const isHeading = widget.itemType === 'heading';
            const isText = widget.itemType === 'text';
            const isShape = widget.itemType === 'rectangle' || widget.itemType === 'circle';
            const isImage = widget.itemType === 'image';
            const isFilter = widget.itemType === 'filter';
            const isCode = widget.itemType === 'code';

            return (
              <>
                <div className="flex justify-between items-center p-4 px-5 border-b border-neutral-800 bg-neutral-900/50 flex-shrink-0">
                  <div>
                    <h3 className="font-bold text-lg text-neutral-50 flex items-center gap-2">
                      <Settings2 className="text-orange-500 w-5 h-5" />
                      Element Styling
                    </h3>
                    <p className="text-xs text-neutral-500 mt-0.5">Customize aesthetics and layout</p>
                  </div>
                  <button
                    onClick={() => setShowWidgetStyleModal(false)}
                    className="text-neutral-400 hover:text-neutral-200 transition-colors p-1.5 hover:bg-neutral-800 rounded-xl cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex-1 p-5 space-y-5 overflow-y-auto custom-scrollbar">

                  {/* Code Settings */}
                  {isCode && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 border-b border-neutral-800 pb-2">
                        <PenTool className="w-4 h-4 text-neutral-500" />
                        <span className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Custom JS Logic</span>
                      </div>
                      
                      <div className="bg-orange-500/5 border border-orange-500/10 rounded-xl p-3">
                        <p className="text-[10px] text-orange-400 leading-relaxed">
                          Write JavaScript to add interactivity. Use <code className="bg-orange-500/10 px-1 rounded">document.getElementById('widget-&#123;&#123;id&#125;&#125;')</code> to target this element's container.
                        </p>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">JavaScript Code</label>
                          <button 
                            onClick={() => {
                              const defaultCode = `// 1. Access the container element\nelement.innerHTML = '<div style="padding: 20px; color: #f97316; font-weight: bold; text-align: center; border: 2px dashed #f97316; border-radius: 12px; cursor: pointer;">Click me to set filter!</div>';\n\n// 2. Use the Bridge API to interact with the FE\nelement.onclick = () => {\n  // Example: Set a filter for 'Region' to 'North'\n  // setFilter('Region', 'North');\n  \n  notify('Interactive action triggered!', 'success');\n};\n\n// Available in context: { element, id, setFilter, switchTab, getWidget, notify }`;
                              setDashboardWidgets(prev => prev.map(w => w.id === widget.id ? { ...w, code: defaultCode } : w));
                            }}
                            className="text-[10px] text-orange-500 hover:underline font-bold"
                          >
                            Reset Template
                          </button>
                        </div>
                        <div className="h-64 rounded-xl border border-neutral-800 overflow-hidden shadow-inner">
                          <Editor
                            theme="vs-dark"
                            language="javascript"
                            value={widget.code || ""}
                            onChange={(val) => setDashboardWidgets(prev => prev.map(w => w.id === widget.id ? { ...w, code: val } : w))}
                            options={{
                              minimap: { enabled: false },
                              fontSize: 12,
                              scrollBeyondLastLine: false,
                              lineNumbers: "on",
                              padding: { top: 10, bottom: 10 },
                              tabSize: 2,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Filter Settings */}
                  {isFilter && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 border-b border-neutral-800 pb-2">
                        <Filter className="w-4 h-4 text-neutral-500" />
                        <span className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Filter Settings</span>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Target Data Column</label>
                        {getAvailableColumnsWithDataset().length > 0 ? (
                          <select
                            value={widget.filterColumn || ''}
                            onChange={e => setDashboardWidgets(prev => prev.map(w => w.id === widget.id ? { ...w, filterColumn: e.target.value, activeValue: '' } : w))}
                            className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2 text-sm text-neutral-50 focus:outline-none focus:border-orange-500 transition-colors shadow-inner cursor-pointer"
                          >
                            <option value="">-- Select Column --</option>
                            {getAvailableColumnsWithDataset().map(col => (
                              <option key={col.column} value={col.column}>{col.column} ({col.datasets})</option>
                            ))}
                          </select>
                        ) : (
                          <div className="text-[11px] text-amber-500 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
                            No charts with valid dataset columns found on this dashboard. Add some charts first to configure.
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Filter Type</label>
                        <select
                          value={widget.filterType || 'dropdown'}
                          onChange={e => setDashboardWidgets(prev => prev.map(w => w.id === widget.id ? { ...w, filterType: e.target.value as any, activeValue: '' } : w))}
                          className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2 text-sm text-neutral-50 focus:outline-none focus:border-orange-500 transition-colors shadow-inner cursor-pointer"
                        >
                          <option value="dropdown">Dropdown List (Exact Match)</option>
                          <option value="like">Text Input (Contains / Like)</option>
                          <option value="date">Date / Time Picker</option>
                        </select>
                      </div>

                      {widget.filterType === 'date' && (
                        <div className="space-y-2">
                          <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Date Granularity</label>
                          <select
                            value={widget.dateSubtype || 'date'}
                            onChange={e => setDashboardWidgets(prev => prev.map(w => w.id === widget.id ? { ...w, dateSubtype: e.target.value as any, activeValue: '' } : w))}
                            className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2 text-sm text-neutral-50 focus:outline-none focus:border-orange-500 transition-colors shadow-inner cursor-pointer"
                          >
                            <option value="date">Full Date (Day / Month / Year)</option>
                            <option value="month">Month & Year</option>
                            <option value="year">Year Only</option>
                          </select>
                        </div>
                      )}

                      <div className="space-y-2">
                        <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Filter Title (Optional)</label>
                        <input
                          type="text"
                          placeholder="e.g. Region Select"
                          value={widget.text || ''}
                          onChange={e => setDashboardWidgets(prev => prev.map(w => w.id === widget.id ? { ...w, text: e.target.value } : w))}
                          className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2 text-sm text-neutral-50 focus:outline-none focus:border-orange-500 transition-colors shadow-inner"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Orientation</label>
                          <select
                            value={widget.filterOrientation || 'vertical'}
                            onChange={e => setDashboardWidgets(prev => prev.map(w => w.id === widget.id ? { ...w, filterOrientation: e.target.value as any } : w))}
                            className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2 text-sm text-neutral-50 focus:outline-none focus:border-orange-500 transition-colors shadow-inner cursor-pointer"
                          >
                            <option value="vertical">Vertical</option>
                            <option value="horizontal">Horizontal</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Control Width</label>
                          <input
                            type="text"
                            placeholder="e.g. 100%, 150px"
                            value={widget.controlWidth || ''}
                            onChange={e => setDashboardWidgets(prev => prev.map(w => w.id === widget.id ? { ...w, controlWidth: e.target.value } : w))}
                            className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2 text-sm text-neutral-50 focus:outline-none focus:border-orange-500 transition-colors shadow-inner"
                          />
                        </div>
                      </div>

                      {(widget.filterType === 'dropdown' || (widget.filterType === 'date' && widget.dateSubtype === 'year')) && (
                        <div className="space-y-4 mt-4 border-t border-neutral-800 pt-4">
                          <div className="space-y-2">
                            <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Dropdown Max Height ({widget.filterDropdownHeight !== undefined ? widget.filterDropdownHeight : 200}px)</label>
                            <input
                              type="range"
                              min="80"
                              max="500"
                              step="10"
                              value={widget.filterDropdownHeight !== undefined ? widget.filterDropdownHeight : 200}
                              onChange={e => setDashboardWidgets(prev => prev.map(w => w.id === widget.id ? { ...w, filterDropdownHeight: parseInt(e.target.value) } : w))}
                              className="w-full accent-orange-500 h-1.5 bg-neutral-800 rounded-lg cursor-pointer mt-2"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Dropdown List Width</label>
                            <input
                              type="text"
                              placeholder="e.g. 100%, 200px, max-content"
                              value={widget.filterDropdownWidth || ''}
                              onChange={e => setDashboardWidgets(prev => prev.map(w => w.id === widget.id ? { ...w, filterDropdownWidth: e.target.value } : w))}
                              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2 text-sm text-neutral-50 focus:outline-none focus:border-orange-500 transition-colors shadow-inner"
                            />
                            <p className="text-[9px] text-neutral-500 mt-1 italic">Use 'max-content' to automatically fit long values.</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Filter Settings */}
                  {isFilter && (
                    <div className="space-y-4">
                      {/* ... existing filter settings ... */}
                    </div>
                  )}

                  {/* Shape Text Settings */}
                  {isShape && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 border-b border-neutral-800 pb-2">
                        <Type className="w-4 h-4 text-neutral-500" />
                        <span className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Shape Label</span>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Label Text</label>
                        <textarea
                          placeholder="e.g. Total Revenue"
                          value={widget.text || ''}
                          onChange={e => setDashboardWidgets(prev => prev.map(w => w.id === widget.id ? { ...w, text: e.target.value } : w))}
                          className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2 text-sm text-neutral-50 focus:outline-none focus:border-orange-500 transition-colors shadow-inner min-h-[60px]"
                        />
                      </div>
                    </div>
                  )}

                  {/* Image Settings */}
                  {isImage && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 border-b border-neutral-800 pb-2">
                        <ImageIcon className="w-4 h-4 text-neutral-500" />
                        <span className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Image Settings</span>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Object Fit</label>
                          <div className="flex bg-neutral-950 border border-neutral-800 rounded-xl p-1 shadow-inner">
                            {(['cover', 'contain', 'fill'] as const).map(fit => (
                              <button
                                key={fit}
                                onClick={() => setDashboardWidgets(prev => prev.map(w => w.id === widget.id ? { ...w, objectFit: fit } : w))}
                                className={`flex-1 py-1.5 text-[10px] rounded-lg capitalize transition-all ${widget.objectFit === fit ? 'bg-orange-600 text-white shadow-lg' : 'text-neutral-500 hover:text-neutral-300'}`}
                              >
                                {fit}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Change Image</label>
                          <button
                            onClick={() => widgetImageInputRef.current?.click()}
                            className="w-full bg-neutral-800 hover:bg-neutral-700 text-neutral-50 py-2 rounded-xl text-xs font-semibold transition-all border border-neutral-700 flex items-center justify-center gap-2"
                          >
                            <ImageIcon className="w-3.5 h-3.5" /> Replace
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Container Styling (for all widgets) */}
                  <div className="space-y-4 pt-2">
                    <div className="flex items-center gap-2 border-b border-neutral-800 pb-2">
                      <Square className="w-4 h-4 text-neutral-500" />
                      <span className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Container & Border</span>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Background Color</label>
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-xl border border-neutral-800 overflow-hidden shrink-0 shadow-inner">
                          <input
                            type="color"
                            value={widget.bgColor?.startsWith('var') || widget.bgColor === 'transparent' ? '#171717' : (widget.bgColor || '#171717')}
                            onChange={e => setDashboardWidgets(prev => prev.map(w => w.id === widget.id ? { ...w, bgColor: e.target.value } : w))}
                            className="w-[150%] h-[150%] -translate-x-[15%] -translate-y-[15%] cursor-pointer border-0 p-0"
                          />
                        </div>
                        <div className="flex-1 flex gap-1">
                          <input
                            type="text"
                            value={widget.bgColor || ''}
                            onChange={e => setDashboardWidgets(prev => prev.map(w => w.id === widget.id ? { ...w, bgColor: e.target.value } : w))}
                            placeholder="Hex or rgba"
                            className="flex-1 bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-[11px] text-neutral-50 focus:outline-none focus:border-orange-500 font-mono shadow-inner"
                          />
                          <button
                            onClick={() => setDashboardWidgets(prev => prev.map(w => w.id === widget.id ? { ...w, bgColor: 'transparent', bgGradient: undefined } : w))}
                            className="px-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-[10px] text-neutral-400"
                          >
                            Transp.
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Background Gradient Presets</label>
                      <div className="grid grid-cols-5 gap-2">
                        {[
                          { name: 'Sunset', value: 'linear-gradient(135deg, #f97316 0%, #ec4899 100%)' },
                          { name: 'Waves', value: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)' },
                          { name: 'Neon', value: 'linear-gradient(135deg, #10b981 0%, #6366f1 100%)' },
                          { name: 'Midnight', value: 'linear-gradient(135deg, #3b82f6 0%, #1e1b4b 100%)' },
                          { name: 'Forest', value: 'linear-gradient(135deg, #10b981 0%, #064e3b 100%)' },
                        ].map(grad => (
                          <button
                            key={grad.name}
                            onClick={() => setDashboardWidgets(prev => prev.map(w => w.id === widget.id ? { ...w, bgGradient: grad.value, bgColor: 'transparent' } : w))}
                            className={`h-8 rounded-lg transition-all border ${widget.bgGradient === grad.value ? 'border-white scale-105 shadow-md shadow-orange-500/20' : 'border-neutral-800 hover:border-neutral-600'}`}
                            style={{ background: grad.value }}
                            title={grad.name}
                          />
                        ))}
                      </div>
                      {widget.bgGradient && (
                        <button
                          onClick={() => setDashboardWidgets(prev => prev.map(w => w.id === widget.id ? { ...w, bgGradient: undefined, bgColor: '#171717' } : w))}
                          className="text-[10px] text-orange-500 hover:text-orange-400 font-semibold cursor-pointer transition-colors block mt-1"
                        >
                          Clear Gradient Background
                        </button>
                      )}
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Opacity ({Math.round((widget.opacity || 1) * 100)}%)</label>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={widget.opacity !== undefined ? widget.opacity : 1}
                        onChange={e => setDashboardWidgets(prev => prev.map(w => w.id === widget.id ? { ...w, opacity: parseFloat(e.target.value) } : w))}
                        className="w-full accent-orange-500 h-1.5 bg-neutral-800 rounded-lg cursor-pointer mt-1"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Border Style</label>
                        <select
                          value={widget.borderStyle || 'solid'}
                          onChange={e => setDashboardWidgets(prev => prev.map(w => w.id === widget.id ? { ...w, borderStyle: e.target.value as any } : w))}
                          className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2 text-sm text-neutral-50 focus:outline-none focus:border-orange-500 transition-colors shadow-inner"
                        >
                          <option value="solid">Solid</option>
                          <option value="dashed">Dashed</option>
                          <option value="dotted">Dotted</option>
                          <option value="none">None</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Border Width (px)</label>
                        <input
                          type="number"
                          min="0"
                          max="20"
                          value={widget.borderWidth !== undefined ? widget.borderWidth : 2}
                          onChange={e => setDashboardWidgets(prev => prev.map(w => w.id === widget.id ? { ...w, borderWidth: parseInt(e.target.value) || 0 } : w))}
                          className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2 text-sm text-neutral-50 focus:outline-none focus:border-orange-500 transition-colors shadow-inner"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Border Color</label>
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-xl border border-neutral-800 overflow-hidden shrink-0 shadow-inner">
                          <input
                            type="color"
                            value={widget.borderColor?.startsWith('var') || widget.borderColor === 'transparent' ? '#3b82f6' : (widget.borderColor || '#3b82f6')}
                            onChange={e => setDashboardWidgets(prev => prev.map(w => w.id === widget.id ? { ...w, borderColor: e.target.value } : w))}
                            className="w-[150%] h-[150%] -translate-x-[15%] -translate-y-[15%] cursor-pointer border-0 p-0"
                          />
                        </div>
                        <input
                          type="text"
                          value={widget.borderColor || ''}
                          onChange={e => setDashboardWidgets(prev => prev.map(w => w.id === widget.id ? { ...w, borderColor: e.target.value } : w))}
                          placeholder="Hex or rgba"
                          className="flex-1 bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2 text-[11px] text-neutral-50 focus:outline-none focus:border-orange-500 font-mono shadow-inner"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Corner Radius (px)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={widget.borderRadius !== undefined ? widget.borderRadius : 0}
                        onChange={e => setDashboardWidgets(prev => prev.map(w => w.id === widget.id ? { ...w, borderRadius: parseInt(e.target.value) || 0 } : w))}
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2 text-sm text-neutral-50 focus:outline-none focus:border-orange-500 transition-colors shadow-inner"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Box Shadow</label>
                        <select
                          value={widget.boxShadow || 'none'}
                          onChange={e => setDashboardWidgets(prev => prev.map(w => w.id === widget.id ? { ...w, boxShadow: e.target.value as any } : w))}
                          className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2 text-sm text-neutral-50 focus:outline-none focus:border-orange-500 transition-colors shadow-inner cursor-pointer"
                        >
                          <option value="none">None</option>
                          <option value="sm">Small</option>
                          <option value="md">Medium</option>
                          <option value="lg">Large</option>
                          <option value="xl">Extra Large</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Backdrop Blur</label>
                        <select
                          value={widget.backdropBlur || 'none'}
                          onChange={e => setDashboardWidgets(prev => prev.map(w => w.id === widget.id ? { ...w, backdropBlur: e.target.value as any } : w))}
                          className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2 text-sm text-neutral-50 focus:outline-none focus:border-orange-500 transition-colors shadow-inner cursor-pointer"
                        >
                          <option value="none">None</option>
                          <option value="sm">Light (4px)</option>
                          <option value="md">Medium (8px)</option>
                          <option value="lg">Strong (16px)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Layering (New Feature) */}
                  <div className="space-y-4 pt-2">
                    <div className="flex items-center gap-2 border-b border-neutral-800 pb-2">
                      <Layers className="w-4 h-4 text-neutral-500" />
                      <span className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Layering & Depth</span>
                    </div>
                    <div className="flex gap-4">
                      <button
                        onClick={() => {
                          const maxZ = Math.max(0, ...dashboardWidgets.map(w => w.zIndex || 0), ...dashboardItems.map(i => i.zIndex || 0));
                          setDashboardWidgets(prev => prev.map(w => w.id === widget.id ? { ...w, zIndex: maxZ + 1 } : w));
                        }}
                        className="flex-1 flex items-center justify-center gap-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-50 py-2.5 rounded-xl text-xs font-semibold transition-all border border-neutral-700"
                      >
                        <Maximize2 className="w-3.5 h-3.5" /> Bring to Front
                      </button>
                      <button
                        onClick={() => {
                          const minZ = Math.min(0, ...dashboardWidgets.map(w => w.zIndex || 0), ...dashboardItems.map(i => i.zIndex || 0));
                          setDashboardWidgets(prev => prev.map(w => w.id === widget.id ? { ...w, zIndex: minZ - 1 } : w));
                        }}
                        className="flex-1 flex items-center justify-center gap-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-50 py-2.5 rounded-xl text-xs font-semibold transition-all border border-neutral-700"
                      >
                        <Minimize2 className="w-3.5 h-3.5" /> Send to Back
                      </button>
                    </div>
                    <p className="text-[10px] text-neutral-500 italic">Current Z-Index: {widget.zIndex || 1}</p>
                  </div>

                  {/* Tab Location */}
                  {dashboardTabs.length > 1 && (
                    <div className="space-y-4 pt-2">
                      <div className="flex items-center gap-2 border-b border-neutral-800 pb-2">
                        <LayoutDashboard className="w-4 h-4 text-neutral-500" />
                        <span className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Tab Location</span>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Move to Tab</label>
                        <select
                          value={widget.tabId || 'default'}
                          onChange={e => setDashboardWidgets(prev => prev.map(w => w.id === widget.id ? { ...w, tabId: e.target.value } : w))}
                          className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2 text-sm text-neutral-50 focus:outline-none focus:border-orange-500 transition-colors shadow-inner cursor-pointer"
                        >
                          {dashboardTabs.map(t => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                  {/* Text Styling (for Heading, Text, Filter, and Shapes) */}
                  {(isHeading || isText || isFilter || isShape) && (
                    <div className="space-y-4 pt-2">
                      <div className="flex items-center gap-2 border-b border-neutral-800 pb-2">
                        <Type className="w-4 h-4 text-neutral-500" />
                        <span className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Typography</span>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Font Size (px)</label>
                          <input
                            type="number"
                            value={widget.fontSize || (isHeading ? 24 : 14)}
                            onChange={e => setDashboardWidgets(prev => prev.map(w => w.id === widget.id ? { ...w, fontSize: parseInt(e.target.value) || 12 } : w))}
                            className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2 text-sm text-neutral-50 focus:outline-none focus:border-orange-500 transition-colors shadow-inner"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Text Align</label>
                          <div className="flex bg-neutral-950 border border-neutral-800 rounded-xl p-1">
                            {(['left', 'center', 'right'] as const).map(align => (
                              <button
                                key={align}
                                onClick={() => setDashboardWidgets(prev => prev.map(w => w.id === widget.id ? { ...w, textAlign: align } : w))}
                                className={`flex-1 py-1.5 text-xs rounded-lg capitalize transition-all ${widget.textAlign === align ? 'bg-orange-600 text-white shadow-lg' : 'text-neutral-500 hover:text-neutral-300'}`}
                              >
                                {align}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Font Weight</label>
                        <select
                          value={widget.fontWeight || (isHeading ? '800' : '400')}
                          onChange={e => setDashboardWidgets(prev => prev.map(w => w.id === widget.id ? { ...w, fontWeight: e.target.value } : w))}
                          className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2 text-sm text-neutral-50 focus:outline-none focus:border-orange-500 transition-colors shadow-inner"
                        >
                          <option value="300">Light</option>
                          <option value="400">Regular</option>
                          <option value="500">Medium</option>
                          <option value="600">Semi-bold</option>
                          <option value="700">Bold</option>
                          <option value="800">Extra-bold</option>
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Font Family</label>
                        <select
                          value={widget.fontFamily || 'inherit'}
                          onChange={e => setDashboardWidgets(prev => prev.map(w => w.id === widget.id ? { ...w, fontFamily: e.target.value } : w))}
                          className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2 text-sm text-neutral-50 focus:outline-none focus:border-orange-500 transition-colors shadow-inner cursor-pointer"
                        >
                          <option value="inherit">Default System</option>
                          <option value="'Inter', sans-serif">Inter</option>
                          <option value="'Outfit', sans-serif">Outfit</option>
                          <option value="Georgia, serif">Georgia</option>
                          <option value="'Courier New', monospace">Courier New</option>
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Font Style & Decor</label>
                          <div className="flex bg-neutral-950 border border-neutral-800 rounded-xl p-1 shadow-inner gap-1">
                            <button
                              onClick={() => setDashboardWidgets(prev => prev.map(w => w.id === widget.id ? { ...w, fontStyle: w.fontStyle === 'italic' ? 'normal' : 'italic' } : w))}
                              className={`flex-1 py-1.5 text-xs rounded-lg font-semibold italic transition-all ${widget.fontStyle === 'italic' ? 'bg-orange-600 text-white shadow-lg' : 'text-neutral-500 hover:text-neutral-300'}`}
                              title="Italic"
                            >
                              I
                            </button>
                            <button
                              onClick={() => setDashboardWidgets(prev => prev.map(w => w.id === widget.id ? { ...w, textDecoration: w.textDecoration === 'underline' ? 'none' : 'underline' } : w))}
                              className={`flex-1 py-1.5 text-xs rounded-lg font-semibold underline transition-all ${widget.textDecoration === 'underline' ? 'bg-orange-600 text-white shadow-lg' : 'text-neutral-500 hover:text-neutral-300'}`}
                              title="Underline"
                            >
                              U
                            </button>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Padding ({widget.padding !== undefined ? widget.padding : (isHeading ? 0 : 12)}px)</label>
                          <input
                            type="range"
                            min="0"
                            max="48"
                            step="2"
                            value={widget.padding !== undefined ? widget.padding : (isHeading ? 0 : 12)}
                            onChange={e => setDashboardWidgets(prev => prev.map(w => w.id === widget.id ? { ...w, padding: parseInt(e.target.value) } : w))}
                            className="w-full accent-orange-500 h-1.5 bg-neutral-800 rounded-lg cursor-pointer mt-2"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Text Color</label>
                        <div className="flex items-center gap-2">
                          <div className="w-10 h-10 rounded-xl border border-neutral-800 overflow-hidden shrink-0 shadow-inner">
                            <input
                              type="color"
                              value={widget.color?.startsWith('var') ? '#ffffff' : (widget.color || '#ffffff')}
                              onChange={e => setDashboardWidgets(prev => prev.map(w => w.id === widget.id ? { ...w, color: e.target.value } : w))}
                              className="w-[150%] h-[150%] -translate-x-[15%] -translate-y-[15%] cursor-pointer border-0 p-0"
                            />
                          </div>
                          <input
                            type="text"
                            value={widget.color || ''}
                            onChange={e => setDashboardWidgets(prev => prev.map(w => w.id === widget.id ? { ...w, color: e.target.value } : w))}
                            placeholder="#ffffff"
                            className="flex-1 bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2 text-sm text-neutral-50 focus:outline-none focus:border-orange-500 font-mono shadow-inner"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-4 px-5 border-t border-neutral-800 bg-neutral-900/50 flex justify-end shrink-0">
                  <button
                    onClick={() => setShowWidgetStyleModal(false)}
                    className="px-8 py-2.5 bg-orange-600 hover:bg-orange-700 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-orange-600/20 cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              </>
            );
          })()}
        </div>
      )}

      {/* Frame Style Editor Sidebar */}
      {showFrameStyleModal && stylingFrameId && (
        <div className="fixed inset-y-0 right-0 w-96 bg-neutral-900 border-l border-neutral-800 shadow-2xl z-35 flex flex-col animate-in slide-in-from-right duration-200 overflow-hidden">
          {(() => {
            const frame = dashboardFrames.find(f => f.id === stylingFrameId);
            if (!frame) return null;

            return (
              <>
                <div className="flex justify-between items-center p-4 px-5 border-b border-neutral-800 bg-neutral-900/50 flex-shrink-0">
                  <div>
                    <h3 className="font-bold text-lg text-neutral-50 flex items-center gap-2">
                      <Settings2 className="text-orange-500 w-5 h-5" />
                      Frame Settings
                    </h3>
                    <p className="text-xs text-neutral-500 mt-0.5">Customize layout and appearance</p>
                  </div>
                  <button
                    onClick={() => setShowFrameStyleModal(false)}
                    className="text-neutral-400 hover:text-neutral-200 transition-colors p-1.5 hover:bg-neutral-800 rounded-xl cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex-1 p-5 space-y-6 overflow-y-auto custom-scrollbar">
                  {/* Basic Info */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Frame Name</label>
                      <input
                        type="text"
                        value={frame.name}
                        onChange={e => setDashboardFrames(prev => prev.map(f => f.id === frame.id ? { ...f, name: e.target.value } : f))}
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2 text-sm text-neutral-50 focus:outline-none focus:border-orange-500 transition-colors shadow-inner"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Width (px)</label>
                        <input
                          type="number"
                          value={frame.pos.w}
                          onChange={e => setDashboardFrames(prev => prev.map(f => f.id === frame.id ? { ...f, pos: { ...f.pos, w: parseInt(e.target.value) || 0 } } : f))}
                          className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2 text-sm text-neutral-50 focus:outline-none focus:border-orange-500 transition-colors shadow-inner font-mono"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Height (px)</label>
                        <input
                          type="number"
                          value={frame.pos.h}
                          onChange={e => setDashboardFrames(prev => prev.map(f => f.id === frame.id ? { ...f, pos: { ...f.pos, h: parseInt(e.target.value) || 0 } } : f))}
                          className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2 text-sm text-neutral-50 focus:outline-none focus:border-orange-500 transition-colors shadow-inner font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Appearance */}
                  <div className="space-y-4 border-t border-neutral-800 pt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Palette className="w-4 h-4 text-neutral-500" />
                      <span className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Appearance</span>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Background Color</label>
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-xl border border-neutral-800 overflow-hidden shrink-0 shadow-inner">
                          <input
                            type="color"
                            value={frame.bgColor?.startsWith('rgba') ? '#171717' : (frame.bgColor || '#171717')}
                            onChange={e => setDashboardFrames(prev => prev.map(f => f.id === frame.id ? { ...f, bgColor: e.target.value } : f))}
                            className="w-[150%] h-[150%] -translate-x-[15%] -translate-y-[15%] cursor-pointer border-0 p-0"
                          />
                        </div>
                        <input
                          type="text"
                          value={frame.bgColor || ''}
                          onChange={e => setDashboardFrames(prev => prev.map(f => f.id === frame.id ? { ...f, bgColor: e.target.value } : f))}
                          placeholder="Hex or rgba"
                          className="flex-1 bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2 text-sm text-neutral-50 focus:outline-none focus:border-orange-500 font-mono shadow-inner"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Background Image</label>
                      <input
                        type="file"
                        ref={frameImageInputRef}
                        onChange={handleFrameImageUpload}
                        accept="image/*"
                        className="hidden"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => frameImageInputRef.current?.click()}
                          className="flex-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-50 py-2 rounded-xl text-xs font-semibold transition-all border border-neutral-700 flex items-center justify-center gap-2"
                        >
                          <ImageIcon className="w-3.5 h-3.5" /> Upload Image
                        </button>
                        {frame.bgImage && (
                          <button
                            onClick={() => setDashboardFrames(prev => prev.map(f => f.id === frame.id ? { ...f, bgImage: undefined } : f))}
                            className="p-2 bg-neutral-800 hover:bg-red-900/20 text-red-500 rounded-xl border border-neutral-700 transition-all"
                            title="Remove Image"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Opacity ({Math.round((frame.opacity !== undefined ? frame.opacity : 1) * 100)}%)</label>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={frame.opacity !== undefined ? frame.opacity : 1}
                        onChange={e => setDashboardFrames(prev => prev.map(f => f.id === frame.id ? { ...f, opacity: parseFloat(e.target.value) } : f))}
                        className="w-full accent-orange-500 h-1.5 bg-neutral-800 rounded-lg cursor-pointer mt-1"
                      />
                    </div>
                  </div>

                  {/* Border & Shadow */}
                  <div className="space-y-4 border-t border-neutral-800 pt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Square className="w-4 h-4 text-neutral-500" />
                      <span className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Border & Shadow</span>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Border Style</label>
                        <select
                          value={frame.borderStyle || 'solid'}
                          onChange={e => setDashboardFrames(prev => prev.map(f => f.id === frame.id ? { ...f, borderStyle: e.target.value as any } : f))}
                          className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2 text-sm text-neutral-50 focus:outline-none focus:border-orange-500 transition-colors shadow-inner"
                        >
                          <option value="solid">Solid</option>
                          <option value="dashed">Dashed</option>
                          <option value="dotted">Dotted</option>
                          <option value="none">None</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Border Width</label>
                        <input
                          type="number"
                          min="0"
                          max="20"
                          value={frame.borderWidth !== undefined ? frame.borderWidth : 2}
                          onChange={e => setDashboardFrames(prev => prev.map(f => f.id === frame.id ? { ...f, borderWidth: parseInt(e.target.value) || 0 } : f))}
                          className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2 text-sm text-neutral-50 focus:outline-none focus:border-orange-500 transition-colors shadow-inner"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Border Color</label>
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-xl border border-neutral-800 overflow-hidden shrink-0 shadow-inner">
                          <input
                            type="color"
                            value={frame.borderColor || '#404040'}
                            onChange={e => setDashboardFrames(prev => prev.map(f => f.id === frame.id ? { ...f, borderColor: e.target.value } : f))}
                            className="w-[150%] h-[150%] -translate-x-[15%] -translate-y-[15%] cursor-pointer border-0 p-0"
                          />
                        </div>
                        <input
                          type="text"
                          value={frame.borderColor || ''}
                          onChange={e => setDashboardFrames(prev => prev.map(f => f.id === frame.id ? { ...f, borderColor: e.target.value } : f))}
                          placeholder="#404040"
                          className="flex-1 bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2 text-sm text-neutral-50 focus:outline-none focus:border-orange-500 font-mono shadow-inner"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Corner Radius (px)</label>
                      <input
                        type="number"
                        min="0"
                        max="200"
                        value={frame.borderRadius !== undefined ? frame.borderRadius : 0}
                        onChange={e => setDashboardFrames(prev => prev.map(f => f.id === frame.id ? { ...f, borderRadius: parseInt(e.target.value) || 0 } : f))}
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2 text-sm text-neutral-50 focus:outline-none focus:border-orange-500 transition-colors shadow-inner"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Box Shadow (CSS)</label>
                      <input
                        type="text"
                        placeholder="e.g. 0 10px 15px rgba(0,0,0,0.5)"
                        value={frame.boxShadow || ''}
                        onChange={e => setDashboardFrames(prev => prev.map(f => f.id === frame.id ? { ...f, boxShadow: e.target.value } : f))}
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2 text-sm text-neutral-50 focus:outline-none focus:border-orange-500 transition-colors font-mono shadow-inner"
                      />
                    </div>
                  </div>
                </div>

                <div className="p-4 px-5 border-t border-neutral-800 bg-neutral-900/50 flex justify-end shrink-0">
                  <button
                    onClick={() => setShowFrameStyleModal(false)}
                    className="px-8 py-2.5 bg-orange-600 hover:bg-orange-700 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-orange-600/20 cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              </>
            );
          })()}
        </div>
      )}
      {showIframePreview && (() => {
        const frame = mainFrameId 
          ? (dashboardFrames.find(f => f.id === mainFrameId) || dashboardWidgets.find(w => w.id === mainFrameId)) 
          : null;
        const frameW = frame?.pos.w || 1280;
        const frameH = frame?.pos.h || 720;
        const frameName = (frame as any)?.name || (frame as any)?.text || 'Dashboard Preview';
        
        // Simple heuristic for scaling to fit 95% of viewport
        // In a real app, we might use a resize observer or state
        const winW = typeof window !== 'undefined' ? window.innerWidth : 1920;
        const winH = typeof window !== 'undefined' ? window.innerHeight : 1080;
        const scale = Math.min((winW * 0.95) / frameW, (winH * 0.9) / frameH);

        return (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
            <div className="absolute top-6 right-6 z-[10002] flex items-center gap-4">
              <div className="flex flex-col items-end">
                <span className="text-xs font-bold text-neutral-200 uppercase tracking-widest">{frameName}</span>
              </div>

              <button
                onClick={() => {
                  const url = `${window.location.origin}/hub?preview=true&disable_header=true&dashboardId=${selectedDashboard.id}${mainFrameId ? `&mainFrameId=${mainFrameId}` : ''}&tabId=${activeTabId}&layoutMode=${layoutMode}`;
                  const iframeCode = `<iframe src="${url}" width="${frameW}" height="${frameH}" style="border:none; width:100%; max-width:${frameW}px; aspect-ratio:${frameW}/${frameH};" frameborder="0" allowfullscreen scrolling="no"></iframe>`;
                  navigator.clipboard.writeText(iframeCode).then(() => {
                    Sonner.toast.success("Iframe code copied to clipboard!");
                  });
                }}
                className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-xl transition-all cursor-pointer shadow-lg shadow-emerald-600/20 border border-emerald-500/30 active:scale-95"
              >
                <Copy className="w-4 h-4" /> Copy Iframe Code
              </button>

              <button
                onClick={() => setShowIframePreview(false)}
                className="p-2.5 bg-neutral-800 hover:bg-red-600 text-neutral-200 rounded-full transition-all shadow-xl cursor-pointer border border-neutral-700 hover:border-red-500"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Vertical centered button on the right edge to open in new tab */}
            <div className="absolute right-0 top-1/2 -translate-y-1/2 z-[10002] flex flex-col items-center">
              <button
                onClick={() => {
                  const url = `/hub?preview=true&disable_header=true&dashboardId=${selectedDashboard.id}${mainFrameId ? `&mainFrameId=${mainFrameId}` : ''}&tabId=${activeTabId}&layoutMode=${layoutMode}`;
                  window.open(url, '_blank');
                }}
                className="group flex items-center justify-center w-12 h-12 bg-neutral-800 hover:bg-orange-600 text-neutral-300 hover:text-white rounded-l-2xl shadow-2xl transition-all border border-r-0 border-neutral-700 hover:border-orange-500 active:scale-95"
                title="Open in new tab (Full Screen)"
              >
                <Forward className="w-6 h-6 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>

            <div
              style={{
                width: frameW,
                height: frameH,
                minWidth: frameW,
                minHeight: frameH,
                transform: `scale(${scale})`,
                transformOrigin: 'center center',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                backgroundColor: frame?.bgColor || selectedDashboard?.theme_config?.canvasBg || '#f8f9fa'
              }}
              className="rounded-lg overflow-hidden border border-neutral-800 relative shadow-2xl shrink-0"
            >
              <iframe
                src={`/hub?preview=true&disable_header=true&dashboardId=${selectedDashboard.id}${mainFrameId ? `&mainFrameId=${mainFrameId}` : ''}&tabId=${activeTabId}&layoutMode=${layoutMode}`}
                className="w-full h-full border-none"
                title="Dashboard Preview"
              />
            </div>
          </div>
        );
      })()}
    </div>
  );
}
