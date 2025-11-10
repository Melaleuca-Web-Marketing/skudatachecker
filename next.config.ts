import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  basePath: '/skudatachecker',
  // Silence that dev cross-origin warning when you open via your server hostname:
  allowedDevOrigins: ['https://usifhqtsagrqt01.melaleuca.net'],
};

export default nextConfig;
