// next.config.ts
import type { NextConfig } from 'next';

const rawBasePath = process.env.NEXT_PUBLIC_BASE_PATH?.replace(/\/$/, "");

const nextConfig: NextConfig = {
  ...(rawBasePath ? { basePath: rawBasePath } : {}),
  // Note: no trailingSlash here
  // allowedDevOrigins only matters for `next dev`; harmless to keep or drop
};

export default nextConfig;
