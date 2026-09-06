import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  // Pin the workspace root so Next doesn't walk up to the home directory
  // (a stray package-lock.json lives there).
  turbopack: {
    root: __dirname,
  },
};

export default withNextIntl(nextConfig);
