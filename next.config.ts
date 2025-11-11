// next.config.ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  basePath: '/skudatachecker',
  // Note: no trailingSlash here
  // allowedDevOrigins only matters for `next dev`; harmless to keep or drop
};

export default nextConfig;
