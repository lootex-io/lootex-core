/** @type {import('next').NextConfig} */

const nextConfig = {
  reactStrictMode: false,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lootex.mypinata.cloud',
      },
      {
        protocol: 'https',
        hostname: 'lootex-dev.s3.amazonaws.com',
      },
    ],
  },
  logging: {
    fetched: {
      fullUrl: true,
    },
  },
  transpilePackages: ['lootex'],
};

export default nextConfig