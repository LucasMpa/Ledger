import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root so Next doesn't walk up to the home directory
  // (a stray package-lock.json lives there).
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
