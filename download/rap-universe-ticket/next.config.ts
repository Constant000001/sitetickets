import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Add empty turbopack config to silence warning
  turbopack: {},
};

export default nextConfig;
