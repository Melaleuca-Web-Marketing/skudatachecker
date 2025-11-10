import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  basePath: '/skudatachecker',
  // you're on HTTP right now, so include http://
  allowedDevOrigins: ['http://usifhqtsagrqt01.melaleuca.net'],
};

export default nextConfig;