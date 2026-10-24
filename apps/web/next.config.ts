import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  transpilePackages: [
    "@xq/xiangqi-core",
    "@xq/shared-contracts",
    "@xq/api-client",
    "@xq/content",
  ],
}

export default nextConfig
