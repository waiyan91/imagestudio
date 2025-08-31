import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    // Ensure Next selects this workspace as the root when multiple lockfiles exist
    root: __dirname,
  },
};

export default nextConfig;
