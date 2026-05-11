import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  /** Smaller Docker images + `node server.js` runner (see Dockerfile). */
  output: "standalone",

  /**
   * IMPORTANT for running multiple Next apps on the same host:
   * - Pages are served under `/supervision/*` (by route structure)
   * - We must also serve Next assets under `/supervision/_next/*` in prod,
   *   otherwise Kong routes `/_next/*` to the other Next service.
   */
  assetPrefix: isProd ? "/supervision" : undefined,
  images: {
    path: isProd ? "/supervision/_next/image" : "/_next/image",
  },
};

export default nextConfig;
