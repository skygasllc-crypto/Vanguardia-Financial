import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export: `next build` emits fully static HTML/JS into `out/`
  // (no Node server, no SSR, no route handlers). All data fetching in this
  // app is already client-side (fetch() calls to the FastAPI backend from
  // 'use client' components), so this requires no architecture change.
  output: "export",
  // The default Image Optimization API needs a running Node server, which
  // static export doesn't have — serve images as-is instead.
  images: {
    unoptimized: true,
  },
  // Allow localtunnel domain for HMR in development
  allowedDevOrigins: ['wide-queens-decide.loca.lt'],
};

export default nextConfig;
