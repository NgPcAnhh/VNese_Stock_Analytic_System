import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  /* Proxy API requests tới Backend qua Docker network hoặc Local */
  async rewrites() {
    const backendUrl = process.env.BACKEND_URL || (process.env.NODE_ENV === 'development' ? 'http://127.0.0.1:8000' : 'http://backend:8000');
    return [
      // Fix: một số file tạo URL kép /api/v1/api/v1/...
      {
        source: '/api/v1/api/v1/:path*',
        destination: `${backendUrl}/api/v1/:path*`,
      },
      // Route chuẩn /api/v1/...
      {
        source: '/api/v1/:path*',
        destination: `${backendUrl}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
