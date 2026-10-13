import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 26 MiB covers the 25 MiB audio limit plus multipart overhead; actions enforce product limits.
  experimental: { serverActions: { bodySizeLimit: "26mb" } },
};

export default nextConfig;
