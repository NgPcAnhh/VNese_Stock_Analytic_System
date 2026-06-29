// cấu hình docker 
// import type { NextConfig } from "next";

// const nextConfig: NextConfig = {
//   output: 'standalone',
//   /* config options here */
// };

// export default nextConfig;


import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  // output: 'standalone', // COMMENT dòng này đi để tương thích với Vercel
  typescript: {
    ignoreBuildErrors: true, // Bỏ qua lỗi TypeScript khi build
  },
  eslint: {
    ignoreBuildErrors: true, // Bỏ qua lỗi ESLint khi build
  },
};
export default nextConfig;