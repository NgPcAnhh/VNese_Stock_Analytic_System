import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import MainLayout from "@/components/layout/MainLayout";
import { AuthProvider } from "@/lib/AuthContext";
import { AuthModal } from "@/components/auth/AuthModal";
import { SettingsProvider } from "@/lib/SettingsContext";
import { StockWebSocketProvider } from "@/lib/StockWebSocketContext";

if (typeof window !== "undefined") {
  const originalFetch = window.fetch;
  window.fetch = function (input, init) {
    init = init || {};
    init.headers = init.headers || {};
    if (init.headers instanceof Headers) {
      init.headers.set('ngrok-skip-browser-warning', 'any-value');
    } else if (Array.isArray(init.headers)) {
      init.headers.push(['ngrok-skip-browser-warning', 'any-value']);
    } else {
      (init.headers as Record<string, string>)['ngrok-skip-browser-warning'] = 'any-value';
    }
    return originalFetch(input, init);
  };
}

export const metadata: Metadata = {
  title: "StockPro - Nền tảng phân tích chứng khoán chuyên nghiệp",
  description: "Cập nhật dữ liệu thị trường, tin tức tài chính và công cụ phân tích chứng khoán hàng đầu Việt Nam.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@400;500;700&family=Roboto:wght@300;400;500;700&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased">
        <AuthProvider>
          <SettingsProvider>
            <StockWebSocketProvider>
              <Suspense fallback={<div className="flex h-screen w-full items-center justify-center bg-background" />}>
                <MainLayout>
                  {children}
                </MainLayout>
              </Suspense>
              <AuthModal />
            </StockWebSocketProvider>
          </SettingsProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
