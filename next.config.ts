import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,
  images: {
    domains: ['assets.schematichq.com'],
  },
};

export default nextConfig;
