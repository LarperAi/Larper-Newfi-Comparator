import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Vercel: static export served from root
  output: "export",
  images: { unoptimized: true },

  // Optimize package imports to reduce bundle size
  experimental: {
    optimizePackageImports: [
      "@google/generative-ai",
      "@anthropic-ai/sdk",
      "openai",
      "exceljs",
    ],
  },

  // Enable React strict mode for better development experience
  reactStrictMode: true,

  // Compression
  compress: true,
};

export default nextConfig;