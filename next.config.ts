import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  output: 'export',          // ← 정적 내보내기
  images: { unoptimized: true }, // next/image 쓰면 필요 (이미지 최적화 서버 비활성)
  turbopack: {
    // 프로젝트 실 루트 경로로 바꿔줘
    root: '/Users/apple/Desktop/hojin2025/Tea_hojin/tea_DB2/tea-assessment',
  },
};

export default nextConfig;
