import React, { useState } from "react";
import { Bell, X } from "lucide-react";
import type { StockAlert } from "@/hooks/useAlerts";
import { useAlerts } from "@/hooks/useAlerts";

export function AlertPopup({
  ticker,
  onClose,
  existingAlert,
  onSaved,
}: {
  ticker: string;
  onClose: () => void;
  existingAlert?: StockAlert | null;
  onSaved?: (alert: StockAlert | null) => void;
}) {
  const { createAlert, updateAlert, deleteAlert } = useAlerts();
  const [condition, setCondition] = useState(existingAlert?.condition_type ?? "GREATER_THAN");
  const [price, setPrice] = useState(existingAlert?.target_price ? String(existingAlert.target_price) : "");
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!price || Number.isNaN(Number(price)) || Number(price) <= 0) {
      window.alert("Vui lòng nhập mức giá hợp lệ.");
      return;
    }

    try {
      setLoading(true);
      const targetPrice = Number(price);
      if (existingAlert?.id) {
        const updated = await updateAlert(existingAlert.id, {
          condition_type: condition,
          target_price: targetPrice,
          status: "ACTIVE",
        });
        onSaved?.(updated);
      } else {
        const created = await createAlert({
          ticker,
          condition_type: condition,
          target_price: targetPrice,
        });
        onSaved?.(created);
      }
      onClose();
    } catch {
      window.alert("Không thể lưu cảnh báo.");
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = async () => {
    if (!existingAlert?.id) return;
    try {
      setLoading(true);
      await updateAlert(existingAlert.id, { status: "DISMISSED" });
      onSaved?.(null);
      onClose();
    } catch {
      window.alert("Không thể tắt cảnh báo.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!existingAlert?.id) return;
    const ok = window.confirm("Xóa cảnh báo này?");
    if (!ok) return;
    try {
      setLoading(true);
      await deleteAlert(existingAlert.id);
      onSaved?.(null);
      onClose();
    } catch {
      window.alert("Không thể xóa cảnh báo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-96 max-w-[90vw] shadow-xl relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-gray-700">
          <X className="w-5 h-5" />
        </button>
        <h3 className="text-lg font-bold mb-4 flex items-center dark:text-gray-100">
          <Bell className="w-5 h-5 mr-2 text-blue-500" />
          {existingAlert ? `Chỉnh sửa cảnh báo ${ticker}` : `Tạo cảnh báo giá ${ticker}`}
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 dark:text-gray-200">Điều kiện</label>
            <select
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              className="w-full border rounded px-3 py-2 bg-transparent dark:text-white dark:border-gray-600"
            >
              <option value="GREATER_THAN">Giá lớn hơn</option>
              <option value="LESS_THAN">Giá nhỏ hơn</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 dark:text-gray-200">Giá mục tiêu</label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="Ví dụ: 50000"
              className="w-full border rounded px-3 py-2 bg-transparent dark:text-white dark:border-gray-600"
            />
          </div>

          <div className="pt-2 space-y-2">
            <button
              onClick={handleSave}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded font-medium disabled:opacity-50"
            >
              {loading ? "Đang lưu..." : existingAlert ? "Cập nhật cảnh báo" : "Lưu cảnh báo"}
            </button>
            {existingAlert && (
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleDismiss}
                  disabled={loading}
                  className="w-full border border-amber-300 text-amber-700 hover:bg-amber-50 py-2 rounded font-medium disabled:opacity-50"
                >
                  Tắt cảnh báo
                </button>
                <button
                  onClick={handleDelete}
                  disabled={loading}
                  className="w-full border border-red-300 text-red-700 hover:bg-red-50 py-2 rounded font-medium disabled:opacity-50"
                >
                  Xóa
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
