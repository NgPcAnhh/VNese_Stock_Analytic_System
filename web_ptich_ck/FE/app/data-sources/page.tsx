"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api-client";
import * as XLSX from "xlsx";
import { 
  Database, 
  Plus, 
  RefreshCw, 
  Trash2, 
  Edit, 
  X, 
  Table2, 
  Play, 
  Save, 
  Columns, 
  Eye,
  Check,
  FileSpreadsheet,
  Upload,
  Search,
  Copy,
  ChevronLeft,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  Folder,
  FolderPlus,
  Move
} from "lucide-react";
import * as Sonner from "sonner";

const WORKSPACE_ID = "00000000-0000-0000-0000-000000000000";

export default function DataSourcesPage() {
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      Sonner.toast.success(`Copied "${text}" to clipboard`);
    }).catch(err => {
      console.error('Failed to copy: ', err);
      Sonner.toast.error('Failed to copy to clipboard');
    });
  };

  // Tabs & Views state
  const searchParams = useSearchParams();
  const isPreviewMode = searchParams.get("preview") === "true";
  const urlTab = searchParams.get("tab") as "connections" | "sql-editor" | "datasets" | null;
  const [activeTab, setActiveTab] = useState<"connections" | "sql-editor" | "datasets">(
    urlTab === "connections" || urlTab === "sql-editor" || urlTab === "datasets" 
      ? urlTab 
      : "sql-editor"
  );

  // Sync tab selection from query params
  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "connections" || tab === "sql-editor" || tab === "datasets") {
      setActiveTab(tab);
    }
  }, [searchParams]);

  // Search State
  const [connectionSearch, setConnectionSearch] = useState("");
  const [datasetSearch, setDatasetSearch] = useState("");

  // Connections (Data Sources) State
  const [dataSources, setDataSources] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [testResult, setTestResult] = useState<{success: boolean, msg: string}|null>(null);
  const [formData, setFormData] = useState({
    name: "",
    type: "postgres",
    host: "",
    port: 5432,
    database_name: "",
    username: "",
    password: ""
  });
  const [editingId, setEditingId] = useState<string | null>(null);

  // Datasets List State
  const [datasets, setDatasets] = useState<any[]>([]);
  const [datasetsLoading, setDatasetsLoading] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewDatasetData, setPreviewDatasetData] = useState<{columns: any[], rows: any[], error?: string}|null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [copiedQueryIndex, setCopiedQueryIndex] = useState<number | null>(null);
  const [editingDatasetId, setEditingDatasetId] = useState<string | null>(null);
  const [editingQueryId, setEditingQueryId] = useState<string | null>(null);

  // Datasets Pagination State
  const [datasetsPage, setDatasetsPage] = useState(1);
  const DATASETS_PAGE_SIZE = 10;

  // Folders & Directory State
  const [folders, setFolders] = useState<any[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [movingDataset, setMovingDataset] = useState<any | null>(null);
  const [targetFolderId, setTargetFolderId] = useState<string>("");

  // Reset datasets page when search query changes
  useEffect(() => {
    setDatasetsPage(1);
  }, [datasetSearch]);

  // Excel Import State (UI only)
  const excelWorkbookRef = useRef<XLSX.WorkBook | null>(null);
  const [showExcelImportModal, setShowExcelImportModal] = useState(false);
  const [excelFileName, setExcelFileName] = useState("");
  const [excelDataSourceId, setExcelDataSourceId] = useState("");
  const [excelDatasetName, setExcelDatasetName] = useState("");
  const [excelTableName, setExcelTableName] = useState("");
  const [excelSheets, setExcelSheets] = useState<string[]>([]);
  const [excelSelectedSheet, setExcelSelectedSheet] = useState("");
  const [excelColumns, setExcelColumns] = useState<string[]>([]);
  const [excelSelectedColumns, setExcelSelectedColumns] = useState<string[]>([]);
  const [excelRows, setExcelRows] = useState<Record<string, any>[]>([]);
  const [excelError, setExcelError] = useState("");
  const [excelLoading, setExcelLoading] = useState(false);
  const [excelImporting, setExcelImporting] = useState(false);
  const [excelImportFormat, setExcelImportFormat] = useState<"excel" | "csv">("excel");

  // SQL Editor & Explorer State (when creating dataset)
  const [selectedSourceId, setSelectedSourceId] = useState<string>("");
  const [datasetName, setDatasetName] = useState("");
  const [sql, setSql] = useState("SELECT * FROM your_table LIMIT 10");
  const [previewData, setPreviewData] = useState<any>(null);
  const [queryLoading, setQueryLoading] = useState(false);
  const [queryError, setQueryError] = useState("");
  const [limit, setLimit] = useState<number>(100);
  const [previewZoom, setPreviewZoom] = useState(100);
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 100;

  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [previewSortConfig, setPreviewSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleToggleComment = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const value = textarea.value;

    const lines = value.split('\n');
    let currentPos = 0;
    const lineInfo = lines.map(line => {
      const lineStart = currentPos;
      const lineEnd = currentPos + line.length;
      currentPos += line.length + 1;
      return { line, lineStart, lineEnd };
    });

    const affectedIndices: number[] = [];
    lineInfo.forEach((info, idx) => {
      if (start === end) {
        if (start >= info.lineStart && start <= info.lineEnd) {
          affectedIndices.push(idx);
        }
      } else {
        if (Math.max(start, info.lineStart) < Math.min(end, info.lineEnd)) {
          affectedIndices.push(idx);
        }
      }
    });

    if (affectedIndices.length === 0) return;

    const allCommented = affectedIndices.every(idx => {
      const line = lines[idx].trim();
      return line.length === 0 || line.startsWith('--');
    });

    const newLines = [...lines];
    affectedIndices.forEach(idx => {
      const line = lines[idx];
      if (allCommented) {
        newLines[idx] = line.replace(/^(\s*)--\s?/, '$1');
      } else {
        newLines[idx] = `-- ${line}`;
      }
    });

    const newValue = newLines.join('\n');
    setSql(newValue);
  };

  // Explorer Resizing State
  const [sidebarWidth, setSidebarWidth] = useState(280);
  const [isResizing, setIsResizing] = useState(false);

  const [dbMetadata, setDbMetadata] = useState<any>(null);
  const [databases, setDatabases] = useState<string[]>([]);
  const [selectedDatabase, setSelectedDatabase] = useState("");
  const [selectedSchema, setSelectedSchema] = useState("");
  const [selectedTable, setSelectedTable] = useState("");
  const [connectionError, setConnectionError] = useState("");

  // Load Data Sources on Mount
  useEffect(() => {
    loadDataSources();
  }, []);

  // Load Datasets when Datasets Tab is active or when toggled
  useEffect(() => {
    if (activeTab === "datasets") {
      loadDatasets();
    }
  }, [activeTab]);

  const loadDataSources = async () => {
    setLoading(true);
    try {
      const data = await api.dataSources.list(WORKSPACE_ID);
      setDataSources(data);
      if (data.length > 0) setSelectedSourceId(data[0].id);
    } catch (error) {
      console.error("Failed to load data sources", error);
    }
    setLoading(false);
  };

  const loadDatasets = async () => {
    setDatasetsLoading(true);
    try {
      const data = await api.datasets.list(WORKSPACE_ID);
      setDatasets(data);
      const foldersData = await api.folders.list(WORKSPACE_ID);
      setFolders(foldersData);
    } catch (error) {
      console.error("Failed to load datasets and folders", error);
    }
    setDatasetsLoading(false);
  };

  // Connection handlers
  const handleTestConnection = async () => {
    setTestResult(null);
    try {
      const res = await api.dataSources.testConnection({ ...formData, workspace_id: WORKSPACE_ID });
      if (res.success) {
        setTestResult({ success: true, msg: "Connection successful!" });
      } else {
        setTestResult({ success: false, msg: res.message || "Connection failed" });
      }
    } catch (error: any) {
      setTestResult({ success: false, msg: error.response?.data?.detail || "Connection failed" });
    }
  };

  const handleEdit = (ds: any) => {
    setEditingId(ds.id);
    setFormData({
      name: ds.name || "",
      type: ds.type || "postgres",
      host: ds.host || "",
      port: ds.port || 5432,
      database_name: ds.database_name || "",
      username: ds.username || "",
      password: ""
    });
    setTestResult(null);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this connection?")) return;
    try {
      await api.dataSources.delete(id);
      loadDataSources();
    } catch (error) {
      console.error("Failed to delete data source", error);
      alert("Failed to delete data source");
    }
  };

  const handleSave = async () => {
    try {
      if (editingId) {
        const updateData: any = { ...formData };
        if (!updateData.password) {
          delete updateData.password;
        }
        await api.dataSources.update(editingId, updateData);
      } else {
        await api.dataSources.create({ ...formData, workspace_id: WORKSPACE_ID });
      }
      setShowModal(false);
      loadDataSources();
      setFormData({ name: "", type: "postgres", host: "", port: 5432, database_name: "", username: "", password: "" });
      setTestResult(null);
      setEditingId(null);
    } catch (error) {
      console.error("Failed to save data source", error);
      alert("Failed to save data source");
    }
  };

  // Dataset List Handlers
  const handleDeleteDataset = async (id: string) => {
    if (!confirm("Are you sure you want to delete this dataset?")) return;
    try {
      await api.datasets.delete(id);
      loadDatasets();
    } catch (error) {
      console.error("Failed to delete dataset", error);
      alert("Failed to delete dataset");
    }
  };

  const handlePreviewDataset = async (id: string) => {
    setPreviewLoading(true);
    setPreviewDatasetData(null);
    setShowPreviewModal(true);
    try {
      const res = await api.datasets.preview(id);
      setPreviewDatasetData(res);
    } catch (error: any) {
      setPreviewDatasetData({
        columns: [],
        rows: [],
        error: error.response?.data?.detail || "Failed to load preview data"
      });
    }
    setPreviewLoading(false);
  };

  const handleEditDataset = async (dataset: any) => {
    try {
      // Find the query associated with this dataset
      // We need to fetch all queries first or have query details in dataset
      const queries = await api.queries.list(WORKSPACE_ID);
      const query = queries.find((q: any) => q.id === dataset.query_id);
      
      if (!query) {
        alert("Associated query not found");
        return;
      }

      setEditingDatasetId(dataset.id);
      setEditingQueryId(query.id);
      setDatasetName(dataset.name);
      setSql(query.sql_text);
      setSelectedSourceId(dataset.data_source_id);
      setSelectedDatabase(query.database_name || "");
      setSelectedSchema(query.schema_name || "");
      
      setActiveTab("sql-editor");
      // Optionally run preview automatically
      // handlePreview();
    } catch (error) {
      console.error("Failed to prepare dataset for editing", error);
      alert("Failed to prepare dataset for editing");
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    try {
      await api.folders.create({
        name: newFolderName.trim(),
        workspace_id: WORKSPACE_ID,
        parent_id: currentFolderId
      });
      setNewFolderName("");
      setShowCreateFolderModal(false);
      loadDatasets();
      Sonner.toast.success("Folder created successfully");
    } catch (err) {
      console.error("Failed to create folder", err);
      Sonner.toast.error("Failed to create folder");
    }
  };

  const handleDeleteFolder = async (folderId: string) => {
    if (!confirm("Are you sure you want to delete this folder? All datasets inside it will be moved to the 'general' folder.")) return;
    try {
      await api.folders.delete(folderId);
      loadDatasets();
      Sonner.toast.success("Folder deleted");
    } catch (err) {
      console.error("Failed to delete folder", err);
      Sonner.toast.error("Failed to delete folder");
    }
  };

  const handleMoveDataset = async () => {
    if (!movingDataset) return;
    try {
      const destFolderId = targetFolderId === "root" ? null : targetFolderId;
      await api.datasets.update(movingDataset.id, {
        folder_id: destFolderId
      });
      setMovingDataset(null);
      loadDatasets();
      Sonner.toast.success(`Dataset moved successfully`);
    } catch (err: any) {
      console.error("Failed to move dataset", err);
      Sonner.toast.error(err.response?.data?.detail || "Failed to move dataset");
    }
  };

  const getIndentedFolders = (parentId: string | null = null, depth = 0): any[] => {
    const result: any[] = [];
    folders.filter(f => f.parent_id === parentId).forEach(f => {
      result.push({ ...f, label: "\u00a0\u00a0".repeat(depth) + f.name });
      result.push(...getIndentedFolders(f.id, depth + 1));
    });
    return result;
  };
  
  // Auto-edit dataset if datasetId is passed in search params
  useEffect(() => {
    const datasetId = searchParams.get("datasetId");
    if (datasetId) {
      (async () => {
        try {
          const datasetsList = await api.datasets.list(WORKSPACE_ID);
          const dataset = datasetsList.find((d: any) => d.id === datasetId);
          if (dataset) {
            handleEditDataset(dataset);
          }
        } catch (error) {
          console.error("Failed to auto-load dataset for editing from query params", error);
        }
      })();
    }
  }, [searchParams]);

  const resetExcelImportState = () => {
    setExcelFileName("");
    setExcelDataSourceId(selectedSourceId || dataSources[0]?.id || "");
    setExcelDatasetName("");
    setExcelTableName("");
    setExcelSheets([]);
    setExcelSelectedSheet("");
    setExcelColumns([]);
    setExcelSelectedColumns([]);
    setExcelRows([]);
    setExcelError("");
    setExcelImporting(false);
    excelWorkbookRef.current = null;
  };

  const toSqlIdentifier = (value: string) =>
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || "dataset";

  const inferExcelColumnType = (column: string) => {
    const values = excelRows
      .map((row) => row[column])
      .filter((value) => value !== null && value !== undefined && `${value}`.trim() !== "");

    if (values.length > 0 && values.every((value) => !Number.isNaN(Number(`${value}`.replace(/,/g, ""))))) {
      return "number";
    }

    return "string";
  };

  const parseWorkbookSheet = (workbook: XLSX.WorkBook, sheetName: string) => {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) {
      setExcelError("Sheet not found.");
      setExcelColumns([]);
      setExcelSelectedColumns([]);
      setExcelRows([]);
      return;
    }

    const rawRows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, defval: "" });
    if (rawRows.length === 0) {
      setExcelError("Sheet is empty.");
      setExcelColumns([]);
      setExcelSelectedColumns([]);
      setExcelRows([]);
      return;
    }

    const headerRow = rawRows[0] as any[];
    const columns = headerRow.map((value, index) => {
      const label = `${value ?? ""}`.trim();
      return label.length > 0 ? label : `Column ${index + 1}`;
    });
    const rows = rawRows.slice(1).map((row: any[]) => {
      const rowObj: Record<string, any> = {};
      columns.forEach((col, idx) => {
        rowObj[col] = row?.[idx] ?? "";
      });
      return rowObj;
    });

    setExcelColumns(columns);
    setExcelSelectedColumns(columns);
    setExcelRows(rows);
    setExcelError("");
  };

  const handleExcelFileChange = async (file: File | null) => {
    if (!file) {
      resetExcelImportState();
      return;
    }

    setExcelLoading(true);
    setExcelError("");
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      excelWorkbookRef.current = workbook;
      setExcelFileName(file.name);

      const baseName = file.name.replace(/\.[^.]+$/, "");
      setExcelDatasetName(baseName);
      setExcelTableName(toSqlIdentifier(baseName));

      const sheetNames = workbook.SheetNames || [];
      setExcelSheets(sheetNames);
      const initialSheet = sheetNames[0] || "";
      setExcelSelectedSheet(initialSheet);

      if (initialSheet) {
        parseWorkbookSheet(workbook, initialSheet);
      } else {
        setExcelError("Workbook has no sheets.");
        setExcelColumns([]);
        setExcelSelectedColumns([]);
        setExcelRows([]);
      }
    } catch (error) {
      console.error("Failed to parse Excel file", error);
      setExcelError("Failed to read Excel file.");
      setExcelColumns([]);
      setExcelSelectedColumns([]);
      setExcelRows([]);
    } finally {
      setExcelLoading(false);
    }
  };

  const handleExcelSheetChange = (sheetName: string) => {
    setExcelSelectedSheet(sheetName);
    const workbook = excelWorkbookRef.current;
    if (workbook) {
      parseWorkbookSheet(workbook, sheetName);
    }
  };

  const toggleExcelColumn = (column: string) => {
    setExcelSelectedColumns((prev) => (
      prev.includes(column) ? prev.filter((c) => c !== column) : [...prev, column]
    ));
  };

  const openExcelImportModal = () => {
    const postgresSource = dataSources.find(ds => ds.type === "postgres");
    if (!postgresSource) {
      alert("Bạn cần kết nối ít nhất một CSDL PostgreSQL để làm nơi lưu trữ dữ liệu Excel/CSV.");
      return;
    }

    setShowExcelImportModal(true);
    resetExcelImportState();
    // Auto-select the first available postgres source
    setExcelDataSourceId(postgresSource.id);
  };

  const handleImportExcel = async () => {
    const dataSourceId = excelDataSourceId || selectedSourceId || dataSources[0]?.id || "";
    const datasetNameValue = excelDatasetName.trim();
    const tableNameValue = excelTableName.trim();

    if (!dataSourceId) {
      alert("Please select a data source first.");
      return;
    }

    if (!datasetNameValue || !tableNameValue) {
      alert("Please provide both dataset name and table name.");
      return;
    }

    if (excelSelectedColumns.length === 0 || excelRows.length === 0) {
      alert("Please select at least one column and load a sheet with data.");
      return;
    }

    setExcelImporting(true);
    try {
      const columns = excelSelectedColumns.map((column) => ({
        name: column,
        type: inferExcelColumnType(column),
      }));

      const rows = excelRows.map((row) => {
        const filteredRow: Record<string, any> = {};
        excelSelectedColumns.forEach((column) => {
          filteredRow[column] = row[column] ?? "";
        });
        return filteredRow;
      });

      await api.datasets.importExcel({
        workspace_id: WORKSPACE_ID,
        data_source_id: dataSourceId,
        dataset_name: datasetNameValue,
        table_name: tableNameValue,
        columns,
        rows,
      });

      closeExcelImportModal();
      await loadDatasets();
      setActiveTab("datasets");
      alert("Excel imported successfully!");
    } catch (error: any) {
      console.error("Failed to import Excel dataset", error);
      alert(error.response?.data?.detail || "Failed to import Excel dataset");
    } finally {
      setExcelImporting(false);
    }
  };

  const closeExcelImportModal = () => {
    setShowExcelImportModal(false);
    resetExcelImportState();
  };

  // SQL Explorer Resizing Mouse Handler
  const startResizing = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const explorerEl = document.getElementById("database-explorer");
      if (explorerEl) {
        const rect = explorerEl.getBoundingClientRect();
        const newWidth = Math.max(200, Math.min(600, e.clientX - rect.left));
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing]);

  // SQL Editor Effects & Handlers
  useEffect(() => {
    if (activeTab === "sql-editor" && selectedSourceId) {
      loadDatabases(selectedSourceId);
    }
  }, [activeTab, selectedSourceId]);

  const loadDatabases = async (id: string) => {
    setConnectionError("");
    try {
      const data = await api.dataSources.getDatabases(id);
      setDatabases(data.databases || []);
      if (data.databases && data.databases.length > 0) {
        const defaultDb = data.databases.includes("postgres") ? "postgres" : data.databases[0];
        setSelectedDatabase(defaultDb);
      } else {
        setSelectedDatabase("");
      }
    } catch (err: any) {
      console.error(err);
      setDatabases([]);
      setSelectedDatabase("");
      setConnectionError(err.response?.data?.detail || "Failed to load databases");
    }
  };

  useEffect(() => {
    if (activeTab === "sql-editor" && selectedSourceId && selectedDatabase) {
      loadMetadata(selectedSourceId, selectedDatabase);
    }
  }, [activeTab, selectedSourceId, selectedDatabase]);

  const loadMetadata = async (id: string, db: string) => {
    setConnectionError("");
    try {
      setDbMetadata(null);
      const data = await api.dataSources.getMetadata(id, db);
      setDbMetadata(data);
      if (data && data.schemas && data.schemas.length > 0) {
        setSelectedSchema(data.schemas[0].name);
      } else {
        setSelectedSchema("");
      }
    } catch (err: any) {
      console.error(err);
      setDbMetadata(null);
      setConnectionError(err.response?.data?.detail || "Failed to load metadata");
    }
  };

  useEffect(() => {
    if (activeTab === "sql-editor" && selectedSchema && dbMetadata) {
      const schema = dbMetadata.schemas.find((s: any) => s.name === selectedSchema);
      if (schema && schema.tables && schema.tables.length > 0) {
        setSelectedTable(schema.tables[0].name);
      } else {
        setSelectedTable("");
      }
    } else {
      setSelectedTable("");
    }
  }, [activeTab, selectedSchema, dbMetadata]);

  const handlePreview = async (overrideSql?: string) => {
    if (!selectedSourceId) return;
    const sqlToRun = overrideSql || sql;
    if (!sqlToRun) return;

    setQueryLoading(true);
    setQueryError("");
    setPreviewData(null);
    setCurrentPage(1);
    try {
      const res = await api.queries.preview({
        data_source_id: selectedSourceId,
        sql_text: sqlToRun,
        database: selectedDatabase,
        schema_name: selectedSchema,
        limit: limit
      });
      if (res.error) {
        setQueryError(res.error);
      } else {
        setPreviewData({ columns: res.columns, rows: res.rows });
      }
    } catch (err: any) {
      setQueryError(err.response?.data?.detail || "Failed to execute query");
    }
    setQueryLoading(false);
  };

  const handleSaveDataset = async () => {
    if (!selectedSourceId || !datasetName || !previewData) {
      Sonner.toast.warning("Vui lòng nhập tên, chọn nguồn kết nối, và thực hiện truy vấn thành công trước.");
      return;
    }
    try {
      if (editingDatasetId && editingQueryId) {
        // 1. Update query
        await api.queries.update(editingQueryId, {
          name: `${datasetName} Query`,
          sql_text: sql,
          data_source_id: selectedSourceId,
          database_name: selectedDatabase,
          schema_name: selectedSchema
        });

        // 2. Update dataset
        await api.datasets.update(editingDatasetId, {
          name: datasetName,
          columns_schema: previewData.columns,
          data_source_id: selectedSourceId
        });
        
        Sonner.toast.success("Cập nhật dataset thành công!");
      } else {
        // 1. Create query
        const query = await api.queries.create({
          workspace_id: WORKSPACE_ID,
          data_source_id: selectedSourceId,
          name: `${datasetName} Query`,
          sql_text: sql,
          database_name: selectedDatabase,
          schema_name: selectedSchema
        });

        // 2. Create dataset
        await api.datasets.create({
          workspace_id: WORKSPACE_ID,
          query_id: query.id,
          data_source_id: selectedSourceId,
          name: datasetName,
          columns_schema: previewData.columns
        });
        
        Sonner.toast.success("Lưu dataset thành công!");
      }
      
      setDatasetName("");
      setSql("SELECT * FROM your_table LIMIT 10");
      setPreviewData(null);
      setEditingDatasetId(null);
      setEditingQueryId(null);
      setActiveTab("datasets");
      loadDatasets();
    } catch (err: any) {
      console.error(err);
      const msg = err.response?.data?.detail || "Không thể lưu dataset";
      Sonner.toast.error(msg);
    }
  };

  // Rendering Helper for Connections Grid
  const renderConnectionsTab = () => {
    const filteredConnections = dataSources.filter(ds => 
      ds.name.toLowerCase().includes(connectionSearch.toLowerCase()) ||
      ds.host.toLowerCase().includes(connectionSearch.toLowerCase()) ||
      ds.database_name.toLowerCase().includes(connectionSearch.toLowerCase())
    );

    return (
      <div>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div className="flex-1 w-full max-w-md relative">
            <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search connections by name, host, or database..." 
              value={connectionSearch}
              onChange={(e) => setConnectionSearch(e.target.value)}
            className="w-full bg-neutral-900 border border-neutral-800 rounded-lg pl-10 pr-4 py-2 text-sm text-neutral-300 outline-none focus:border-orange-500 transition-colors"
          />
        </div>
        <button 
          onClick={() => {
            setEditingId(null);
            setFormData({ name: "", type: "postgres", host: "", port: 5432, database_name: "", username: "", password: "" });
            setTestResult(null);
            setShowModal(true);
          }}
          className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm shadow-md whitespace-nowrap"
        >
          <Plus className="w-4 h-4" /> Add Connection
        </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-full flex justify-center py-12">
              <RefreshCw className="w-8 h-8 animate-spin text-orange-500" />
            </div>
          ) : filteredConnections.length === 0 ? (
            <div className="col-span-full text-center py-12 border border-dashed border-neutral-800 rounded-2xl bg-neutral-900/20">
              <Database className="w-12 h-12 text-neutral-600 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-neutral-300">
                {connectionSearch ? "No matching connections" : "No connections yet"}
              </h3>
              <p className="text-neutral-500 mt-2">
                {connectionSearch ? "Try adjusting your search term." : "Add a PostgreSQL database to get started."}
              </p>
            </div>
          ) : (
            filteredConnections.map((ds) => (
              <div key={ds.id} className="p-6 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-neutral-700 transition-colors shadow-sm relative group">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded bg-orange-500/10 flex items-center justify-center text-orange-500">
                      <Database className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-base">{ds.name}</h3>
                      <span className="text-[10px] px-1.5 py-0.5 bg-neutral-800 text-neutral-400 rounded uppercase tracking-wider">{ds.type}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => handleEdit(ds)} 
                      className="p-1.5 hover:bg-neutral-800 rounded text-neutral-400 hover:text-neutral-50 transition-colors"
                      title="Edit"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={() => handleDelete(ds.id)} 
                      className="p-1.5 hover:bg-neutral-800 rounded text-neutral-400 hover:text-red-400 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className="text-xs text-neutral-400 space-y-2 mt-6 border-t border-neutral-800/60 pt-4">
                  <p className="flex justify-between"><span className="text-neutral-500">Host:</span> <span>{ds.host}:{ds.port}</span></p>
                  <p className="flex justify-between"><span className="text-neutral-500">Database:</span> <span>{ds.database_name}</span></p>
                  <p className="flex justify-between"><span className="text-neutral-500">User:</span> <span>{ds.username}</span></p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  // Rendering Helper for Datasets List View
  const renderDatasetsTab = () => {
    const isSearching = datasetSearch.trim().length > 0;

    const filteredDatasets = datasets.filter(ds => {
      const source = dataSources.find(s => s.id === ds.data_source_id);
      return ds.name.toLowerCase().includes(datasetSearch.toLowerCase()) ||
             (source?.name || "").toLowerCase().includes(datasetSearch.toLowerCase());
    });

    const currentSubfolders = folders.filter(f => f.parent_id === currentFolderId);
    const currentDatasets = datasets.filter(ds => {
      if (currentFolderId === null) {
        return ds.folder_id === null || ds.folder_id === undefined;
      }
      return ds.folder_id === currentFolderId;
    });

    const activeDatasets = isSearching ? filteredDatasets : currentDatasets;
    const totalDatasets = activeDatasets.length;
    const totalDatasetsPages = Math.ceil(totalDatasets / DATASETS_PAGE_SIZE);
    
    // Bounds-safe current page determination
    const currentDatasetsPage = Math.max(1, Math.min(datasetsPage, totalDatasetsPages || 1));
    const paginatedDatasets = activeDatasets.slice(
      (currentDatasetsPage - 1) * DATASETS_PAGE_SIZE,
      currentDatasetsPage * DATASETS_PAGE_SIZE
    );

    // Get folder breadcrumbs path
    const getFolderBreadcrumbs = (folderId: string | null): any[] => {
      const path: any[] = [];
      let currId = folderId;
      const visited = new Set();
      while (currId && !visited.has(currId)) {
        visited.add(currId);
        const folder = folders.find(f => f.id === currId);
        if (!folder) break;
        path.unshift(folder);
        currId = folder.parent_id;
      }
      return path;
    };

    const crumbs = getFolderBreadcrumbs(currentFolderId);

    return (
      <div>
        {/* Search and Action Bar */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div className="flex-1 w-full max-w-md relative">
            <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Tìm kiếm dataset theo tên hoặc nguồn..." 
              value={datasetSearch}
              onChange={(e) => setDatasetSearch(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-800 rounded-lg pl-10 pr-4 py-2 text-sm text-neutral-300 outline-none focus:border-orange-500 transition-colors"
            />
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <button
              onClick={() => {
                setNewFolderName("");
                setShowCreateFolderModal(true);
              }}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 px-4 py-2 rounded-lg font-medium transition-colors text-sm shadow-md cursor-pointer"
            >
              <FolderPlus className="w-4 h-4 text-orange-500" /> Thư mục mới
            </button>
            <button
              onClick={openExcelImportModal}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm shadow-md cursor-pointer"
            >
              <Upload className="w-4 h-4" /> Import Excel
            </button>
            <button 
              onClick={() => {
                if (dataSources.length === 0) {
                  Sonner.toast.warning("Vui lòng kết nối cơ sở dữ liệu trước.");
                  return;
                }
                setEditingDatasetId(null);
                setEditingQueryId(null);
                setDatasetName("");
                setSql("SELECT * FROM your_table LIMIT 10");
                setPreviewData(null);
                setActiveTab("sql-editor");
              }}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm shadow-md cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Tạo Dataset
            </button>
          </div>
        </div>

        {/* Breadcrumbs (only if not searching) */}
        {!isSearching && (
          <div className="flex items-center gap-1.5 text-xs text-neutral-400 mb-6 bg-neutral-900/30 px-3 py-2 rounded-lg border border-neutral-800/50 w-fit">
            <span 
              className="hover:text-orange-500 cursor-pointer transition-colors font-medium" 
              onClick={() => setCurrentFolderId(null)}
            >
              Root
            </span>
            {crumbs.map((crumb) => (
              <span key={crumb.id} className="flex items-center gap-1.5">
                <ChevronRight className="w-3 h-3 text-neutral-600" />
                <span 
                  className="hover:text-orange-500 cursor-pointer transition-colors font-medium last:text-neutral-200 last:pointer-events-none"
                  onClick={() => setCurrentFolderId(crumb.id)}
                >
                  {crumb.name}
                </span>
              </span>
            ))}
          </div>
        )}

        {datasetsLoading ? (
          <div className="flex justify-center py-12">
            <RefreshCw className="w-8 h-8 animate-spin text-orange-500" />
          </div>
        ) : (
          <div>
            {/* 1. Folders Grid (only when not searching) */}
            {!isSearching && currentSubfolders.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6 select-none">
                {currentSubfolders.map((folder) => {
                  const subCount = folders.filter(f => f.parent_id === folder.id).length;
                  const dsCount = datasets.filter(d => d.folder_id === folder.id).length;
                  return (
                    <div 
                      key={folder.id} 
                      className="group relative flex items-center justify-between p-4 bg-neutral-900 border border-neutral-800 rounded-xl hover:border-orange-500/50 hover:bg-neutral-850/20 transition-all cursor-pointer"
                      onClick={() => {
                        setCurrentFolderId(folder.id);
                        setDatasetsPage(1);
                      }}
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <Folder className="w-8 h-8 text-orange-500 shrink-0" />
                        <div className="overflow-hidden font-sans">
                          <h4 className="font-medium text-neutral-200 group-hover:text-orange-500 transition-colors truncate">{folder.name}</h4>
                          <p className="text-[11px] text-neutral-500 truncate mt-0.5">
                            {subCount > 0 ? `${subCount} thư mục` : ""}
                            {subCount > 0 && dsCount > 0 ? ", " : ""}
                            {dsCount > 0 ? `${dsCount} dataset` : ""}
                            {subCount === 0 && dsCount === 0 ? "Trống" : ""}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteFolder(folder.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 bg-neutral-800 hover:bg-red-950/30 text-neutral-400 hover:text-red-400 p-1.5 rounded transition-all cursor-pointer ml-2"
                        title="Xóa thư mục"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 2. Datasets Table or Empty State */}
            {activeDatasets.length === 0 ? (
              // Empty State
              (!isSearching && currentSubfolders.length > 0) ? null : (
                <div className="text-center py-12 border border-dashed border-neutral-800 rounded-2xl bg-neutral-900/20">
                  <Table2 className="w-12 h-12 text-neutral-600 mx-auto mb-4" />
                  <h3 className="text-xl font-medium text-neutral-300">
                    {isSearching ? "Không tìm thấy dataset nào khớp" : "Thư mục này trống"}
                  </h3>
                  <p className="text-neutral-500 mt-2 text-sm">
                    {isSearching ? "Hãy thử tìm kiếm với từ khóa khác." : "Hãy tạo thêm thư mục con hoặc thêm dataset mới vào thư mục này."}
                  </p>
                </div>
              )
            ) : (
              // Datasets Table
              <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-neutral-800 text-neutral-400 bg-neutral-900/50">
                      <th className="py-3 px-4 font-medium">Tên Dataset</th>
                      <th className="py-3 px-4 font-medium">Nguồn dữ liệu</th>
                      {isSearching && <th className="py-3 px-4 font-medium">Thư mục</th>}
                      <th className="py-3 px-4 font-medium">Cột dữ liệu</th>
                      <th className="py-3 px-4 font-medium">Ngày tạo</th>
                      <th className="py-3 px-4 font-medium text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedDatasets.map((dataset) => {
                      const source = dataSources.find(ds => ds.id === dataset.data_source_id);
                      return (
                        <tr key={dataset.id} className="border-b border-neutral-800/50 last:border-0 hover:bg-neutral-850/10">
                          <td className="py-3.5 px-4 font-medium text-neutral-50">{dataset.name}</td>
                          <td className="py-3.5 px-4 text-neutral-400">{source?.name || "Unknown Source"}</td>
                          {isSearching && (
                            <td className="py-3.5 px-4 text-neutral-400 font-mono text-xs">
                              {dataset.folder_path || "general"}
                            </td>
                          )}
                          <td className="py-3.5 px-4 text-neutral-400">
                            <span className="bg-neutral-850 border border-neutral-800 px-2 py-0.5 rounded text-xs text-neutral-300">
                              {dataset.columns_schema?.length || 0} cột
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-neutral-550 text-xs">
                            {new Date(dataset.created_at).toLocaleDateString()}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex justify-end gap-2">
                              <button 
                                onClick={() => handlePreviewDataset(dataset.id)}
                                className="flex items-center gap-1 bg-orange-600 hover:bg-orange-700 text-white px-2.5 py-1 rounded transition-colors text-xs shadow-sm cursor-pointer"
                                title="Xem trước dữ liệu"
                              >
                                <Eye className="w-3.5 h-3.5" /> Xem
                              </button>
                              <button 
                                onClick={() => handleEditDataset(dataset)}
                                className="flex items-center gap-1 bg-orange-600 hover:bg-orange-700 text-white px-2.5 py-1 rounded transition-colors text-xs shadow-sm cursor-pointer"
                                title="Sửa truy vấn"
                              >
                                <Edit className="w-3.5 h-3.5" /> Sửa
                              </button>
                              <button 
                                onClick={() => {
                                  setMovingDataset(dataset);
                                  setTargetFolderId(dataset.folder_id || "root");
                                }}
                                className="flex items-center gap-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 px-2.5 py-1 rounded transition-colors text-xs shadow-sm cursor-pointer"
                                title="Di chuyển thư mục"
                              >
                                <Move className="w-3.5 h-3.5 text-orange-500" /> Di chuyển
                              </button>
                              <button 
                                onClick={() => handleDeleteDataset(dataset.id)}
                                className="bg-neutral-800 hover:bg-red-950/30 text-neutral-400 hover:text-red-400 p-1.5 rounded transition-colors cursor-pointer"
                                title="Xóa dataset"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Pagination Controls */}
                {totalDatasetsPages > 1 && (
                  <div className="flex flex-col sm:flex-row justify-between items-center px-6 py-4 border-t border-neutral-800 bg-neutral-900/50 gap-4 select-none">
                    <span className="text-xs text-neutral-550 font-medium">
                      Hiển thị <span className="text-neutral-300">{(currentDatasetsPage - 1) * DATASETS_PAGE_SIZE + 1}</span> - <span className="text-neutral-300">{Math.min(currentDatasetsPage * DATASETS_PAGE_SIZE, totalDatasets)}</span> trong số <span className="text-neutral-300">{totalDatasets}</span> dataset
                    </span>
                    
                    <div className="flex items-center gap-3 bg-neutral-955 border border-neutral-800 rounded-lg px-2 py-1">
                      <button
                        onClick={() => setDatasetsPage(prev => Math.max(1, prev - 1))}
                        disabled={currentDatasetsPage === 1}
                        className="p-1 hover:bg-neutral-800 disabled:opacity-30 disabled:hover:bg-transparent rounded text-neutral-450 hover:text-orange-500 transition-all cursor-pointer"
                      >
                        <ChevronLeft className="w-4.5 h-4.5" />
                      </button>
                      <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-tighter whitespace-nowrap">
                        Trang <span className="text-orange-500">{currentDatasetsPage}</span> / {totalDatasetsPages}
                      </span>
                      <button
                        onClick={() => setDatasetsPage(prev => Math.min(totalDatasetsPages, prev + 1))}
                        disabled={currentDatasetsPage === totalDatasetsPages}
                        className="p-1 hover:bg-neutral-800 disabled:opacity-30 disabled:hover:bg-transparent rounded text-neutral-455 hover:text-orange-500 transition-all cursor-pointer"
                      >
                        <ChevronRight className="w-4.5 h-4.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // Rendering Helper for Query Editor & Database Explorer
  const renderQueryEditor = () => {
    const handleSort = (key: string) => {
      let direction: 'asc' | 'desc' = 'asc';
      if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
        direction = 'desc';
      }
      setSortConfig({ key, direction });
    };

    const getSortedRows = () => {
      if (!previewData || !previewData.rows) return [];
      const rows = [...previewData.rows];
      if (sortConfig) {
        rows.sort((a, b) => {
          const aValue = a[sortConfig.key];
          const bValue = b[sortConfig.key];

          if (aValue === bValue) return 0;
          if (aValue === null || aValue === undefined) return 1;
          if (bValue === null || bValue === undefined) return -1;

          const comparison = aValue < bValue ? -1 : 1;
          return sortConfig.direction === 'asc' ? comparison : -comparison;
        });
      }
      return rows;
    };

    // Pagination logic
    const sortedRows = getSortedRows();
    const totalRows = sortedRows.length;
    const totalPages = Math.ceil(totalRows / PAGE_SIZE);
    const paginatedRows = sortedRows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

    return (
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex gap-4 flex-1 min-h-0 select-none relative" style={isPreviewMode ? { height: "100%" } : { height: "calc(100vh - 240px)" }}>
          {/* Database Explorer Panel */}
          <div 
            id="database-explorer"
            style={{ width: `${sidebarWidth}px` }}
            className="bg-neutral-900 border border-neutral-800 rounded-xl flex flex-col overflow-hidden shrink-0"
          >
            <div className="p-4 border-b border-neutral-800 bg-neutral-900/50">
              <h3 className="font-semibold text-neutral-300 mb-4">Database Explorer</h3>
              
              {connectionError && (
                <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-xs text-rose-400 font-medium">
                  {connectionError}
                </div>
              )}
              
              <div className="space-y-3">
                {/* Data Source */}
                <div>
                  <label className="text-[10px] text-neutral-500 font-medium mb-1 block uppercase tracking-wider">Data Source</label>
                  <select 
                    value={selectedSourceId}
                    onChange={e => setSelectedSourceId(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 text-neutral-300 text-sm rounded p-2 outline-none focus:border-orange-500"
                  >
                    {dataSources.map(ds => (
                      <option key={ds.id} value={ds.id}>{ds.name}</option>
                    ))}
                  </select>
                </div>
                
                {/* Database */}
                <div>
                  <label className="text-[10px] text-neutral-500 font-medium mb-1 block uppercase tracking-wider">Database</label>
                  <select 
                    value={selectedDatabase}
                    onChange={e => setSelectedDatabase(e.target.value)}
                    disabled={databases.length === 0}
                    className="w-full bg-neutral-950 border border-neutral-800 text-neutral-300 text-sm rounded p-2 outline-none focus:border-orange-500 disabled:opacity-50"
                  >
                    {databases.map(db => (
                      <option key={db} value={db}>{db}</option>
                    ))}
                  </select>
                </div>

                {/* Schema */}
                <div>
                  <label className="text-[10px] text-neutral-500 font-medium mb-1 block uppercase tracking-wider">Schema</label>
                  <select 
                    value={selectedSchema}
                    onChange={e => setSelectedSchema(e.target.value)}
                    disabled={!dbMetadata || !dbMetadata.schemas || dbMetadata.schemas.length === 0}
                    className="w-full bg-neutral-950 border border-neutral-800 text-neutral-300 text-sm rounded p-2 outline-none focus:border-orange-500 disabled:opacity-50"
                  >
                    {dbMetadata?.schemas?.map((s: any) => (
                      <option key={s.name} value={s.name}>{s.name}</option>
                    ))}
                  </select>
                </div>

                {/* Table */}
                <div>
                  <label className="text-[10px] text-neutral-500 font-medium mb-1 block uppercase tracking-wider">Table</label>
                  <select 
                    value={selectedTable}
                    onChange={e => setSelectedTable(e.target.value)}
                    disabled={!selectedSchema || !dbMetadata}
                    className="w-full bg-neutral-950 border border-neutral-800 text-neutral-300 text-sm rounded p-2 outline-none focus:border-orange-500 disabled:opacity-50"
                  >
                    {dbMetadata?.schemas?.find((s: any) => s.name === selectedSchema)?.tables?.map((t: any) => (
                      <option key={t.name} value={t.name}>{t.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            
            <div className="flex-1 min-h-0 overflow-y-auto p-4 select-none bg-neutral-950">
              <h4 className="text-xs text-neutral-500 font-medium mb-3 uppercase tracking-wider flex items-center gap-2">
                <Columns className="w-3.5 h-3.5" /> Columns
              </h4>
              {!dbMetadata ? (
                <p className="text-neutral-600 text-center mt-10 text-sm animate-pulse">Loading...</p>
              ) : selectedTable ? (
                <div className="space-y-1">
                  {dbMetadata.schemas
                    .find((s: any) => s.name === selectedSchema)
                    ?.tables.find((t: any) => t.name === selectedTable)
                    ?.columns.map((col: any) => (
                      <div key={col.name} className="flex items-center justify-between py-1.5 border-b border-neutral-800/50 last:border-0">
                        <span 
                          className="text-sm text-neutral-300 font-mono cursor-pointer hover:text-orange-400 transition-colors"
                          onClick={() => copyToClipboard(col.name)}
                          title="Click to copy column name"
                        >
                          {col.name}
                        </span>
                        <span className="text-[10px] text-neutral-500 uppercase tracking-wider px-1.5 py-0.5 bg-neutral-900 rounded">{col.type}</span>
                      </div>
                  ))}
                </div>
              ) : (
                <p className="text-neutral-600 text-center mt-10 text-sm">No table selected</p>
              )}
            </div>
          </div>

          {/* Draggable Divider */}
          <div 
            onMouseDown={startResizing}
            className="w-1 bg-neutral-850 hover:bg-orange-500/50 cursor-col-resize transition-all shrink-0 self-stretch rounded-full"
            title="Drag to resize Database Explorer"
          />
          
          {/* SQL Editor & Results Preview */}
          <div className="flex-1 flex flex-col gap-6 min-w-0 min-h-0">
            {/* SQL Editor */}
            <div className="h-[300px] shrink-0 bg-neutral-900 border border-neutral-800 rounded-xl p-4 flex flex-col">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-semibold text-neutral-300">SQL Editor</h3>
                <div className="flex items-center gap-3">
                  {/* Preview Limit input */}
                  <div className="flex items-center gap-1.5 bg-neutral-950 border border-neutral-800 rounded px-2 py-1 group/limit relative" title="Số lượng bản ghi tối đa để xem trước. Không ảnh hưởng đến dữ liệu khi lưu Dataset.">
                    <span className="text-[10px] text-neutral-500 font-medium uppercase tracking-wider whitespace-nowrap">Preview Limit:</span>
                    <input 
                      type="number" 
                      min={1}
                      max={100000}
                      value={limit}
                      onChange={e => {
                        const val = parseInt(e.target.value);
                        setLimit(isNaN(val) ? 100 : Math.min(100000, Math.max(1, val)));
                      }}
                      className="w-16 bg-transparent text-sm text-neutral-300 outline-none font-mono text-center"
                    />
                  </div>

                  <input 
                    type="text" 
                    placeholder="Dataset Name" 
                    value={datasetName}
                    onChange={e => setDatasetName(e.target.value)}
                    className="bg-neutral-950 border border-neutral-800 rounded px-3 py-1 text-sm focus:border-orange-500 outline-none text-neutral-300"
                  />
                  <button 
                    onClick={() => {
                      const textarea = textareaRef.current;
                      const textToRun = (textarea && textarea.selectionStart !== textarea.selectionEnd) 
                        ? textarea.value.substring(textarea.selectionStart, textarea.selectionEnd)
                        : sql;
                      handlePreview(textToRun);
                    }}
                    disabled={queryLoading || !selectedSourceId}
                    className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 disabled:bg-neutral-850 disabled:opacity-50 text-white px-3 py-1.5 rounded text-sm font-medium transition-colors"
                  >
                    <Play className="w-4 h-4 text-white" /> {queryLoading ? "Running..." : "Run Query"}
                  </button>
                  <button 
                    onClick={handleSaveDataset}
                    disabled={!previewData || !datasetName}
                    className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 disabled:bg-neutral-850 disabled:opacity-50 text-white px-3 py-1.5 rounded text-sm font-medium transition-colors"
                  >
                    <Save className="w-4 h-4" /> Save Dataset
                  </button>
                </div>
              </div>
              <textarea
                ref={textareaRef}
                className="w-full flex-1 bg-neutral-950 border border-neutral-800 rounded p-4 font-mono text-sm text-neutral-300 focus:outline-none focus:border-orange-500 resize-none"
                value={sql}
                onChange={(e) => setSql(e.target.value)}
                onKeyDown={(e) => {
                  if (e.ctrlKey && e.key === 'Enter') {
                    e.preventDefault();
                    if (!queryLoading && selectedSourceId) {
                      const textarea = textareaRef.current;
                      const textToRun = (textarea && textarea.selectionStart !== textarea.selectionEnd) 
                        ? textarea.value.substring(textarea.selectionStart, textarea.selectionEnd)
                        : sql;
                      handlePreview(textToRun);
                    }
                  }
                  if (e.ctrlKey && e.key === '/') {
                    e.preventDefault();
                    handleToggleComment();
                  }
                }}
              />
            </div>
            
            {/* Results Preview */}
            <div className="flex-1 min-w-0 min-h-0 bg-neutral-900 border border-neutral-800 rounded-xl p-4 flex flex-col overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-neutral-300">Results Preview</h3>
                <div className="flex items-center gap-6">
                  {/* Pagination Controls */}
                  {totalPages > 1 && (
                    <div className="flex items-center gap-3 bg-neutral-950 border border-neutral-800 rounded-lg px-2 py-1">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="p-1 hover:bg-neutral-800 disabled:opacity-30 disabled:hover:bg-transparent rounded text-neutral-400 hover:text-orange-500 transition-all"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-tighter whitespace-nowrap">
                        Page <span className="text-orange-500">{currentPage}</span> / {totalPages}
                        <span className="ml-2 text-neutral-600">({totalRows} rows)</span>
                      </span>
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        className="p-1 hover:bg-neutral-800 disabled:opacity-30 disabled:hover:bg-transparent rounded text-neutral-400 hover:text-orange-500 transition-all"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-neutral-500 font-medium uppercase tracking-wider">Zoom</span>
                    <button
                      type="button"
                      onClick={() => setPreviewZoom((prev) => Math.max(60, prev - 10))}
                      className="px-2 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded text-xs transition-colors"
                      title="Zoom out"
                    >
                      -
                    </button>
                    <span className="text-xs text-neutral-300 w-10 text-center font-mono">{previewZoom}%</span>
                    <button
                      type="button"
                      onClick={() => setPreviewZoom((prev) => Math.min(140, prev + 10))}
                      className="px-2 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded text-xs transition-colors"
                      title="Zoom in"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex-1 min-h-0 bg-neutral-950 border border-neutral-800 rounded p-4 overflow-x-auto overflow-y-auto">
                {queryError && <div className="text-red-400 text-sm mb-4">{queryError}</div>}
                {previewData ? (
                  <div style={{ zoom: previewZoom / 100 }}>
                    <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-neutral-800 text-neutral-400">
                        {previewData.columns.map((c: any) => (
                          <th 
                            key={c.name} 
                            className="pb-2 font-medium px-2 whitespace-nowrap cursor-pointer hover:text-orange-400 transition-colors group/th"
                            onClick={() => handleSort(c.name)}
                          >
                            <div className="flex items-center gap-1">
                              {c.name}
                              <div className="flex flex-col opacity-0 group-hover/th:opacity-100 transition-opacity">
                                {sortConfig?.key === c.name ? (
                                  sortConfig?.direction === 'asc' ? <ArrowUp className="w-3 h-3 text-orange-500" /> : <ArrowDown className="w-3 h-3 text-orange-500" />
                                ) : (
                                  <ArrowUp className="w-3 h-3 text-neutral-600" />
                                )}
                              </div>
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedRows.map((row: any, i: number) => (
                        <tr key={i} className="border-b border-neutral-800/50 hover:bg-neutral-900/50">
                          {previewData.columns.map((c: any) => (
                            <td key={c.name} className="py-2 px-2 text-neutral-300 whitespace-nowrap">{row[c.name]?.toString()}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                    </table>
                  </div>
                ) : !queryError && (
                  <div className="h-full flex items-center justify-center text-neutral-600">
                    Run a query to see preview
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div 
      className={`${isPreviewMode ? 'h-screen overflow-hidden p-2' : 'min-h-screen p-8'} bg-neutral-950 text-neutral-50 flex flex-col`}
      style={isPreviewMode ? { zoom: 0.8 } : undefined}
    >
      <div className={`${isPreviewMode ? 'max-w-full h-full min-h-0' : 'max-w-7xl'} mx-auto w-full flex-1 flex flex-col`}>
        {/* Tab switch bar at the very top */}
        {!isPreviewMode && (
          <div className="flex border-b border-neutral-800 mb-6 gap-2 shrink-0">
            <button 
              onClick={() => setActiveTab("sql-editor")}
              className={`pb-3 px-3 py-2 rounded-t-lg font-semibold text-sm border-b-2 transition-colors ${
                activeTab === "sql-editor" 
                  ? "border-orange-500 bg-neutral-900 text-neutral-50" 
                  : "border-transparent text-neutral-400 hover:text-neutral-50 hover:bg-neutral-900/50"
              }`}
            >
              SQL Query Editor
            </button>
            <button 
              onClick={() => setActiveTab("datasets")}
              className={`pb-3 px-3 py-2 rounded-t-lg font-semibold text-sm border-b-2 transition-colors ${
                activeTab === "datasets" 
                  ? "border-orange-500 bg-neutral-900 text-neutral-50" 
                  : "border-transparent text-neutral-400 hover:text-neutral-50 hover:bg-neutral-900/50"
              }`}
            >
              Saved Datasets
            </button>
            <button 
              onClick={() => setActiveTab("connections")}
              className={`pb-3 px-3 py-2 rounded-t-lg font-semibold text-sm border-b-2 transition-colors ${
                activeTab === "connections" 
                  ? "border-orange-500 bg-neutral-900 text-neutral-50" 
                  : "border-transparent text-neutral-400 hover:text-neutral-50 hover:bg-neutral-900/50"
              }`}
            >
              Database Connections
            </button>
          </div>
        )}

        {/* Dynamic Content Views */}
        <div className="flex-1 flex flex-col min-h-0">
          {activeTab === "connections" && renderConnectionsTab()}
          {activeTab === "sql-editor" && renderQueryEditor()}
          {activeTab === "datasets" && renderDatasetsTab()}
        </div>
      </div>

      {/* Connection Edit/Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl w-full max-w-md overflow-hidden shadow-lg">
            <div className="flex justify-between items-center p-4 border-b border-neutral-800">
              <h3 className="font-semibold text-lg">{editingId ? "Edit Connection" : "Add Connection"}</h3>
              <button onClick={() => setShowModal(false)} className="text-neutral-400 hover:text-neutral-50">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm text-neutral-400 mb-1">Name</label>
                <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-neutral-950 border border-neutral-800 rounded p-2 focus:border-orange-500 outline-none text-neutral-300" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm text-neutral-400 mb-1">Host</label>
                  <input type="text" value={formData.host} onChange={e => setFormData({...formData, host: e.target.value})} className="w-full bg-neutral-950 border border-neutral-800 rounded p-2 focus:border-orange-500 outline-none text-neutral-300" />
                </div>
                <div>
                  <label className="block text-sm text-neutral-400 mb-1">Port</label>
                  <input type="number" value={formData.port} onChange={e => setFormData({...formData, port: parseInt(e.target.value)})} className="w-full bg-neutral-950 border border-neutral-800 rounded p-2 focus:border-orange-500 outline-none text-neutral-300" />
                </div>
              </div>
              <div>
                <label className="block text-sm text-neutral-400 mb-1">Database Name</label>
                <input type="text" value={formData.database_name} onChange={e => setFormData({...formData, database_name: e.target.value})} className="w-full bg-neutral-950 border border-neutral-800 rounded p-2 focus:border-orange-500 outline-none text-neutral-300" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-neutral-400 mb-1">Username</label>
                  <input type="text" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} className="w-full bg-neutral-950 border border-neutral-800 rounded p-2 focus:border-orange-500 outline-none text-neutral-300" />
                </div>
                <div>
                  <label className="block text-sm text-neutral-400 mb-1">Password</label>
                  <input type="password" placeholder="••••••" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full bg-neutral-950 border border-neutral-800 rounded p-2 focus:border-orange-500 outline-none text-neutral-300" />
                </div>
              </div>

              <div className="bg-neutral-950 p-3 rounded border border-neutral-800">
                <label className="block text-xs text-neutral-500 mb-1">Preview URL</label>
                <code className="text-xs text-orange-400 break-all">
                  {formData.type}://{formData.username || '<user>'}:****@{formData.host || '<host>'}:{formData.port}/{formData.database_name || '<db>'}
                </code>
              </div>

              {testResult && (
                <div className={`p-3 rounded-lg text-sm border ${
                  testResult.success 
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 font-medium' 
                    : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                }`}>
                  {testResult.msg}
                </div>
              )}
            </div>
             <div className="p-4 border-t border-neutral-800 flex justify-between bg-neutral-955/50">
              <button onClick={handleTestConnection} className="px-4 py-2 bg-orange-600 hover:bg-orange-700 rounded text-sm font-medium transition-colors text-white">
                Test Connection
              </button>
              <button onClick={handleSave} className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded text-sm font-medium transition-colors">
                {editingId ? "Update Connection" : "Save Connection"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dataset Preview Modal */}
      {showPreviewModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl w-full max-w-4xl max-h-[80vh] flex flex-col overflow-hidden shadow-lg">
             <div className="flex justify-between items-center p-4 border-b border-neutral-800 bg-neutral-900/50">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <Table2 className="w-5 h-5 text-orange-500" /> Dataset Preview
              </h3>
              <button onClick={() => setShowPreviewModal(false)} className="text-neutral-400 hover:text-neutral-50">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 flex-1 overflow-auto bg-neutral-950">
               {previewLoading ? (
                <div className="h-48 flex justify-center items-center">
                  <RefreshCw className="w-8 h-8 animate-spin text-orange-500" />
                </div>
              ) : previewDatasetData?.error ? (
                <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-lg text-sm text-rose-400">
                  {previewDatasetData.error}
                </div>
              ) : previewDatasetData && previewDatasetData.rows.length > 0 ? (
                (() => {
                  const sortedPreviewRows = [...previewDatasetData.rows].sort((a, b) => {
                    if (!previewSortConfig) return 0;
                    const aValue = a[previewSortConfig.key];
                    const bValue = b[previewSortConfig.key];
                    if (aValue === bValue) return 0;
                    if (aValue === null || aValue === undefined) return 1;
                    if (bValue === null || bValue === undefined) return -1;
                    const comp = aValue < bValue ? -1 : 1;
                    return previewSortConfig.direction === 'asc' ? comp : -comp;
                  });

                  return (
                    <table className="w-full text-left text-sm border-collapse">
                      <thead>
                        <tr className="border-b border-neutral-800 text-neutral-400 pb-2">
                          {previewDatasetData.columns.map((c: any) => (
                            <th 
                              key={c.name} 
                              className="pb-2 font-medium px-2 whitespace-nowrap cursor-pointer hover:text-orange-400 transition-colors group/th"
                              onClick={() => {
                                let dir: 'asc' | 'desc' = 'asc';
                                if (previewSortConfig?.key === c.name && previewSortConfig?.direction === 'asc') dir = 'desc';
                                setPreviewSortConfig({ key: c.name, direction: dir });
                              }}
                            >
                              <div className="flex items-center gap-1">
                                {c.name}
                                <div className="flex flex-col opacity-0 group-hover/th:opacity-100 transition-opacity">
                                  {previewSortConfig?.key === c.name ? (
                                    previewSortConfig?.direction === 'asc' ? <ArrowUp className="w-3 h-3 text-orange-500" /> : <ArrowDown className="w-3 h-3 text-orange-500" />
                                  ) : (
                                    <ArrowUp className="w-3 h-3 text-neutral-600" />
                                  )}
                                </div>
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {sortedPreviewRows.map((row: any, i: number) => (
                          <tr key={i} className="border-b border-neutral-800/50 last:border-0 hover:bg-neutral-900/50">
                            {previewDatasetData.columns.map((c: any) => (
                              <td key={c.name} className="py-2 px-2 text-neutral-300 whitespace-nowrap font-mono text-xs">
                                {row[c.name]?.toString()}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  );
                })()
              ) : (
                <div className="h-48 flex justify-center items-center text-neutral-500">
                  No data returned from query
                </div>
              )}
            </div>
            
            <div className="p-4 border-t border-neutral-800 flex justify-end bg-neutral-900/50">
              <button 
                onClick={() => setShowPreviewModal(false)}
                className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 rounded text-sm transition-colors text-neutral-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Folder Modal */}
      {showCreateFolderModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl w-full max-w-md overflow-hidden shadow-lg font-sans">
            <div className="flex justify-between items-center p-4 border-b border-neutral-800 bg-neutral-900/50">
              <h3 className="font-semibold text-base flex items-center gap-2 text-neutral-100">
                <FolderPlus className="w-5 h-5 text-orange-500" /> Tạo thư mục mới
              </h3>
              <button onClick={() => setShowCreateFolderModal(false)} className="text-neutral-400 hover:text-neutral-50 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs text-neutral-450 mb-1 uppercase tracking-wider font-semibold">Tên thư mục</label>
                <input 
                  type="text" 
                  value={newFolderName} 
                  onChange={e => setNewFolderName(e.target.value)} 
                  placeholder="Nhập tên thư mục..."
                  className="w-full bg-neutral-950 border border-neutral-800 rounded p-2 focus:border-orange-500 outline-none text-neutral-200 text-sm" 
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleCreateFolder();
                    }
                  }}
                />
              </div>
            </div>
            <div className="p-4 border-t border-neutral-800 flex justify-end bg-neutral-900/50 gap-2">
              <button 
                onClick={() => setShowCreateFolderModal(false)} 
                className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 rounded text-sm transition-colors text-neutral-300 cursor-pointer"
              >
                Hủy
              </button>
              <button 
                onClick={handleCreateFolder} 
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded text-sm font-medium transition-colors cursor-pointer"
              >
                Tạo thư mục
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Move Dataset Modal */}
      {movingDataset && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl w-full max-w-md overflow-hidden shadow-lg font-sans">
            <div className="flex justify-between items-center p-4 border-b border-neutral-800 bg-neutral-900/50">
              <h3 className="font-semibold text-base flex items-center gap-2 text-neutral-100">
                <Move className="w-5 h-5 text-orange-500" /> Di chuyển Dataset
              </h3>
              <button onClick={() => setMovingDataset(null)} className="text-neutral-400 hover:text-neutral-50 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-neutral-400">
                Di chuyển dataset <span className="font-semibold text-neutral-200">{movingDataset.name}</span> đến thư mục:
              </p>
              <div>
                <label className="block text-xs text-neutral-450 mb-1 uppercase tracking-wider font-semibold">Thư mục đích</label>
                <select 
                  value={targetFolderId} 
                  onChange={e => setTargetFolderId(e.target.value)} 
                  className="w-full bg-neutral-950 border border-neutral-800 text-neutral-300 text-sm rounded p-2 outline-none focus:border-orange-500 cursor-pointer"
                >
                  <option value="root">Root / Chưa phân loại (General)</option>
                  {getIndentedFolders().map((f) => (
                    <option key={f.id} value={f.id}>{f.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="p-4 border-t border-neutral-800 flex justify-end bg-neutral-900/50 gap-2">
              <button 
                onClick={() => setMovingDataset(null)} 
                className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 rounded text-sm transition-colors text-neutral-300 cursor-pointer"
              >
                Hủy
              </button>
              <button 
                onClick={handleMoveDataset} 
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded text-sm font-medium transition-colors cursor-pointer"
              >
                Di chuyển
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Excel Import Modal */}
      {showExcelImportModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl w-full max-w-5xl max-h-[85vh] flex flex-col overflow-hidden shadow-lg">
            <div className="flex justify-between items-center p-4 border-b border-neutral-800 bg-neutral-900/50">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-400" /> Import Excel
              </h3>
              <button onClick={closeExcelImportModal} className="text-neutral-400 hover:text-neutral-50">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 flex-1 overflow-auto bg-neutral-950">
              <div className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="block text-xs text-neutral-400 font-medium uppercase tracking-wider">File Format</label>
                    <div className="flex bg-neutral-950 border border-neutral-800 rounded p-1">
                      <button
                        onClick={() => setExcelImportFormat("excel")}
                        className={`flex-1 py-1 text-xs rounded transition-colors ${
                          excelImportFormat === "excel"
                            ? "bg-orange-600 text-white shadow-sm"
                            : "text-neutral-400 hover:text-neutral-200"
                        }`}
                      >
                        Excel (.xlsx)
                      </button>
                      <button
                        onClick={() => setExcelImportFormat("csv")}
                        className={`flex-1 py-1 text-xs rounded transition-colors ${
                          excelImportFormat === "csv"
                            ? "bg-orange-600 text-white shadow-sm"
                            : "text-neutral-400 hover:text-neutral-200"
                        }`}
                      >
                        CSV (.csv)
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs text-neutral-400 font-medium uppercase tracking-wider">Dataset Name</label>
                    <input
                      type="text"
                      value={excelDatasetName}
                      onChange={(e) => setExcelDatasetName(e.target.value)}
                      placeholder="Sales Report"
                      className="w-full bg-neutral-950 border border-neutral-800 rounded p-2 text-sm text-neutral-300 outline-none focus:border-orange-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs text-neutral-400 font-medium uppercase tracking-wider">Table Name</label>
                    <input
                      type="text"
                      value={excelTableName}
                      onChange={(e) => setExcelTableName(toSqlIdentifier(e.target.value))}
                      placeholder="sales_report"
                      className="w-full bg-neutral-950 border border-neutral-800 rounded p-2 text-sm text-neutral-300 outline-none focus:border-orange-500 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-xs text-neutral-400 font-medium uppercase tracking-wider">File</label>
                    <input
                      type="file"
                      accept={excelImportFormat === "excel" ? ".xlsx,.xls" : ".csv"}
                      onChange={(e) => handleExcelFileChange(e.target.files?.[0] || null)}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded p-2 text-sm text-neutral-300 file:bg-neutral-800 file:border-0 file:text-neutral-200 file:px-3 file:py-1.5 file:rounded file:mr-3"
                    />
                    {excelFileName && (
                      <p className="text-xs text-neutral-500">File: {excelFileName}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs text-neutral-400 font-medium uppercase tracking-wider">Sheet / Options</label>
                    <select
                      value={excelSelectedSheet}
                      onChange={(e) => handleExcelSheetChange(e.target.value)}
                      disabled={excelSheets.length === 0}
                      className="w-full bg-neutral-950 border border-neutral-800 text-neutral-300 text-sm rounded p-2 outline-none focus:border-orange-500 disabled:opacity-50"
                    >
                      {excelSheets.length === 0 ? (
                        <option value="">{excelImportFormat === "excel" ? "No sheets" : "CSV Loaded"}</option>
                      ) : (
                        excelSheets.map((sheet) => (
                          <option key={sheet} value={sheet}>{sheet}</option>
                        ))
                      )}
                    </select>
                  </div>
                </div>

                {excelLoading && (
                  <div className="flex items-center gap-2 text-sm text-orange-500">
                    <RefreshCw className="w-4 h-4 animate-spin" /> Loading Excel data...
                  </div>
                )}

                {excelError && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-sm text-rose-400">
                    {excelError}
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div className="lg:col-span-1 bg-neutral-900 border border-neutral-800 rounded-lg p-4 max-h-[320px] overflow-auto">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="text-sm font-semibold text-neutral-200">Columns</h4>
                        <p className="text-xs text-neutral-500 mt-0.5">Select which columns will be imported</p>
                      </div>
                      <span className="text-xs text-neutral-500">{excelColumns.length} total</span>
                    </div>
                    {excelColumns.length === 0 ? (
                      <div className="text-sm text-neutral-500">Load an Excel file to see columns.</div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 pb-2 border-b border-neutral-800 mb-2">
                          <button
                            type="button"
                            onClick={() => setExcelSelectedColumns([...excelColumns])}
                            className="text-xs px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 transition-colors"
                          >
                            Select all
                          </button>
                          <button
                            type="button"
                            onClick={() => setExcelSelectedColumns([])}
                            className="text-xs px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 transition-colors"
                          >
                            Clear
                          </button>
                        </div>
                        {excelColumns.map((col) => (
                          <label key={col} className="flex items-center gap-2 text-sm text-neutral-300 group/item">
                            <input
                              type="checkbox"
                              checked={excelSelectedColumns.includes(col)}
                              onChange={() => toggleExcelColumn(col)}
                              className="accent-orange-500"
                            />
                            <span 
                              className="truncate cursor-pointer hover:text-orange-400 transition-colors"
                              onClick={(e) => {
                                // Prevent checkbox toggle if clicking text
                                e.preventDefault();
                                copyToClipboard(col);
                              }}
                              title="Click to copy column name"
                            >
                              {col}
                            </span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="lg:col-span-2 bg-neutral-900 border border-neutral-800 rounded-lg p-4 overflow-auto">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-semibold text-neutral-200">Preview</h4>
                      <span className="text-xs text-neutral-500">
                        {excelRows.length} rows
                      </span>
                    </div>
                    {excelSelectedColumns.length === 0 ? (
                      <div className="text-sm text-neutral-500">Select at least one column to preview.</div>
                    ) : excelRows.length === 0 ? (
                      <div className="text-sm text-neutral-500">No data to preview yet.</div>
                    ) : (
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-neutral-800 text-neutral-400">
                            {excelSelectedColumns.map((col) => (
                              <th 
                                key={col} 
                                className="pb-2 pr-4 font-medium whitespace-nowrap cursor-pointer hover:text-orange-400 transition-colors"
                                onClick={() => copyToClipboard(col)}
                                title="Click to copy column name"
                              >
                                {col}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {excelRows.slice(0, 20).map((row, rowIndex) => (
                            <tr key={rowIndex} className="border-b border-neutral-800/50 last:border-0 hover:bg-neutral-900/40">
                              {excelSelectedColumns.map((col) => (
                                <td key={col} className="py-2 pr-4 text-neutral-300 whitespace-nowrap font-mono">
                                  {row[col]?.toString()}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-neutral-800 flex justify-end bg-neutral-900/50 gap-2">
              <button
                onClick={closeExcelImportModal}
                className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 rounded text-sm transition-colors text-neutral-300"
              >
                Close
              </button>
              <button
                onClick={handleImportExcel}
                disabled={excelImporting || excelRows.length === 0 || excelSelectedColumns.length === 0}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-neutral-800 disabled:text-neutral-500 text-white rounded text-sm font-medium transition-colors flex items-center gap-2"
              >
                {excelImporting && <RefreshCw className="w-4 h-4 animate-spin" />}
                {excelImporting ? "Importing..." : "Import Selected Columns"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
