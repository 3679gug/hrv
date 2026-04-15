import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === 'production';
const isVercel = process.env.VERCEL === '1';

const nextConfig: NextConfig = {
  output: 'export',
  // Vercel 배포 시에는 루트(/) 경로를 사용하고, 그 외 운영 환경(GitHub Pages 등)에서는 /hrv 경로 사용
  basePath: (isProd && !isVercel) ? '/hrv' : '',
  assetPrefix: (isProd && !isVercel) ? '/hrv/' : '',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  /* config options here */
};

export default nextConfig;
