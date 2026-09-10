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
  // /mnt/c is a Windows drive mounted into WSL and does not deliver inotify
  // events to Linux processes, so the dev server never learns a file changed:
  // edits are saved but the browser keeps serving the previously compiled
  // chunk. This polling setting fixes that — but it only reaches webpack
  // (next/dist/build/webpack-config.js reads it; Turbopack has no equivalent),
  // and `next dev --webpack` on this filesystem takes 60-90s per page load,
  // which is worse than the problem. Kept for anyone who does run webpack.
  // With Turbopack, use `npm run dev:clean` after editing.
  watchOptions: {
    pollIntervalMs: 1000,
  },
};

export default nextConfig;
