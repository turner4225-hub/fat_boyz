import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root to this folder so Next doesn't get confused by
  // stray lockfiles elsewhere on the machine.
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
