import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  basePath: '/skudatachecker',
  trailingSlash: true, // ⬅ ensures `/skudatachecker` redirects to `/skudatachecker/`
  allowedDevOrigins: ['http://usifhqtsagrqt01.melaleuca.net'],

  // Optional: this rewrite is harmless but not required because basePath already scopes routes.
  // You can keep it or remove it; either way will work.
  async rewrites() {
    return [
      { source: '/skudatachecker/api/:path*', destination: '/api/:path*' },
    ];
  },
};

export default nextConfig;
