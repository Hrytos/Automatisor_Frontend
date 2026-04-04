import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    // Proxy all /api/* calls to the backend so cookies are same-origin.
    // In production, set BACKEND_URL to your deployed API URL.
    const dest = process.env.BACKEND_URL ?? "http://localhost:8000";
    return [{ source: "/api/:path*", destination: `${dest}/:path*` }];
  },
};

export default nextConfig;
