"use client";

import { ArrowUp } from "lucide-react";

export default function ScrollToTopButton() {
  const handleScrollTop = () => {
    if (typeof window === "undefined") return;
    const appScrollRoot = document.querySelector<HTMLElement>('[data-scroll-root="app"]');
    if (appScrollRoot) {
      appScrollRoot.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <button
      type="button"
      aria-label="Cuộn lên đầu trang"
      title="Lên đầu trang"
      onClick={handleScrollTop}
      className="fixed bottom-5 right-5 z-[120] inline-flex h-11 w-11 items-center justify-center rounded-full border border-orange-200 bg-white text-orange-600 shadow-lg shadow-orange-200/40 transition hover:-translate-y-0.5 hover:bg-orange-50 hover:text-orange-700"
    >
      <ArrowUp className="h-5 w-5" />
    </button>
  );
}
