import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  turbopack: {
    // Ensure Next selects this workspace as the root when multiple lockfiles exist
    root: __dirname,
  },
};

export default nextConfig;
