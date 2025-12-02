import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      {
        source: '/dasboard',
        destination: '/dashboard',
        permanent: false
      }
    ];
  }
};

export default nextConfig;