import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /** Smaller Docker images + `node server.js` runner (see Dockerfile). */
  output: "standalone",
};

export default nextConfig;
