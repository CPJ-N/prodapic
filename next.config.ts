import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    domains: ['together-api.com'], // Add your API domain
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
};

export default nextConfig;
