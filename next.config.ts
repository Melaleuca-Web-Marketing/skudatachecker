import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  basePath: '/skudatachecker',
  allowedDevOrigins: ['http://usifhqtsagrqt01.melaleuca.net'],
  async rewrites() {
    return [
      // Make API work under the basePath in dev/prod
      { source: '/skudatachecker/api/:path*', destination: '/api/:path*' },
    ];
  },
};

export default nextConfig;
