"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { useSettings } from "@/lib/SettingsContext";

const VN_TIMEZONE = "Asia/Ho_Chi_Minh";
const STORAGE_NEVER_SHOW_KEY = "stockpro:price-board-popup:never-show";
const STORAGE_HIDE_TODAY_KEY = "stockpro:price-board-popup:hide-today";
const SESSION_CLOSE_KEY = "stockpro:price-board-popup:session-closed";

function getVietnamNow() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: VN_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    weekday: "short",
    hour12: false,
  }).formatToParts(new Date());

  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const dateKey = `${map.year}-${map.month}-${map.day}`;
  const hour = Number(map.hour);
  const weekday = map.weekday?.toLowerCase() ?? "";

  return { dateKey, hour, weekday };
}

export function PriceBoardPopup({ onHandled }: { onHandled?: () => void }) {
  const router = useRouter();
  const { showPriceBoardPopup, setShowPriceBoardPopup } = useSettings();
  const [isVisible, setIsVisible] = useState(false);
  const [neverShowAgain, setNeverShowAgain] = useState(false);
  const [hideToday, setHideToday] = useState(false);

  const evaluateVisibility = useCallback(() => {
    if (!showPriceBoardPopup) {
      setIsVisible(false);
      return;
    }

    const { dateKey, hour, weekday } = getVietnamNow();
    const isBusinessDay = ['mon', 'tue', 'wed', 'thu', 'fri'].includes(weekday);
    const isInDisplayWindow = isBusinessDay && hour >= 9 && hour < 15;

    if (!isInDisplayWindow) {
      setIsVisible(false);
      return;
    }

    const shouldNeverShow = localStorage.getItem(STORAGE_NEVER_SHOW_KEY) === "1";
    const hiddenDate = localStorage.getItem(STORAGE_HIDE_TODAY_KEY);
    const sessionClosed = sessionStorage.getItem(SESSION_CLOSE_KEY) === dateKey;

    const shouldHideToday = hiddenDate === dateKey;

    // Popup chỉ hiển thị khi chưa bị tắt vĩnh viễn, chưa bị tắt trong ngày và chưa đóng trong phiên hiện tại.
    const willShow = !shouldNeverShow && !shouldHideToday && !sessionClosed;
    setIsVisible(willShow);
  }, [showPriceBoardPopup]);

  useEffect(() => {
    evaluateVisibility();

    const interval = window.setInterval(() => {
      evaluateVisibility();
    }, 60 * 1000);

    return () => window.clearInterval(interval);
  }, [evaluateVisibility]);

  const persistPreferences = useCallback(() => {
    const { dateKey } = getVietnamNow();

    if (neverShowAgain) {
      localStorage.setItem(STORAGE_NEVER_SHOW_KEY, "1");
    }

    if (hideToday) {
      localStorage.setItem(STORAGE_HIDE_TODAY_KEY, dateKey);
    }

    sessionStorage.setItem(SESSION_CLOSE_KEY, dateKey);
  }, [hideToday, neverShowAgain]);

  const closePopup = useCallback(() => {
    persistPreferences();
    setIsVisible(false);
    onHandled?.();
  }, [onHandled, persistPreferences]);

  const onNeverShowAgainChange = useCallback((checked: boolean) => {
    setNeverShowAgain(checked);
    if (checked) {
      setShowPriceBoardPopup(false);
      localStorage.setItem(STORAGE_NEVER_SHOW_KEY, "1");
      return;
    }
    localStorage.removeItem(STORAGE_NEVER_SHOW_KEY);
  }, [setShowPriceBoardPopup]);

  const onHideTodayChange = useCallback((checked: boolean) => {
    setHideToday(checked);
    if (checked) {
      setShowPriceBoardPopup(false);
      const { dateKey } = getVietnamNow();
      localStorage.setItem(STORAGE_HIDE_TODAY_KEY, dateKey);
      return;
    }
    localStorage.removeItem(STORAGE_HIDE_TODAY_KEY);
  }, [setShowPriceBoardPopup]);

  const openPriceBoardPage = useCallback(() => {
    persistPreferences();
    setIsVisible(false);
    onHandled?.();
    router.push("/price-board");
  }, [onHandled, persistPreferences, router]);

  const checkboxIdNever = useMemo(() => "price-board-popup-never", []);
  const checkboxIdToday = useMemo(() => "price-board-popup-today", []);

  if (!isVisible) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[90] bg-black/55 backdrop-blur-[1px]"
      onClick={closePopup}
      role="presentation"
    >
      <div
        className="relative mx-auto mt-[3vh] flex flex-col gap-2 h-[94vh] w-[94vw] max-w-[1920px] min-h-[460px] min-w-[320px]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="relative flex-1 w-full overflow-hidden rounded-2xl border border-border/70 bg-background shadow-2xl">
          <button
            type="button"
            onClick={closePopup}
            aria-label="Đóng popup bảng điện"
            className="absolute right-3 top-3 z-30 rounded-full bg-background/85 p-2 text-foreground hover:bg-background shadow-md transition-all hover:scale-110"
          >
            <X className="h-5 w-5" />
          </button>

          <button
            type="button"
            onClick={openPriceBoardPage}
            className="absolute inset-x-0 top-0 h-10 z-20 cursor-pointer bg-transparent"
            aria-label="Mở trang bảng điện"
          />

          <div className="w-full h-full overflow-hidden relative cursor-pointer" onClick={openPriceBoardPage}>
              <iframe
                title="Bảng điện giao dịch"
                src="/price-board?hideSidebar=true"
                style={{ width: "117.647%", height: "117.647%", transform: "scale(0.85)", transformOrigin: "top left", pointerEvents: "none" }}
                className="absolute top-0 left-0 border-0 rounded-2xl"
              />
          </div>
        </div>

        <div className="flex flex-row items-center gap-6 text-sm text-gray-300 bg-transparent px-2 pt-1 pb-2">
          <label htmlFor={checkboxIdNever} className="flex items-center gap-2 cursor-pointer hover:text-white transition-colors drop-shadow-md">
            <input
              id={checkboxIdNever}
              type="checkbox"
              checked={neverShowAgain}
              onChange={(event) => onNeverShowAgainChange(event.target.checked)}
              className="h-4 w-4 accent-blue-500"
            />
            <span>Không hiển thị lần sau</span>
          </label>

          <label htmlFor={checkboxIdToday} className="flex items-center gap-2 cursor-pointer hover:text-white transition-colors drop-shadow-md">
            <input
              id={checkboxIdToday}
              type="checkbox"
              checked={hideToday}
              onChange={(event) => onHideTodayChange(event.target.checked)}
              className="h-4 w-4 accent-blue-500"
            />
            <span>Không hiển thị trong ngày hôm nay</span>
          </label>
        </div>
      </div>
    </div>
  );
}
