import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // Only set for the production Docker image build (apps/web/Dockerfile sets DOCKER_BUILD=1).
  // Next's standalone output traces and symlinks node_modules, which fails with EPERM on
  // Windows without Developer Mode/admin rights -- keep local `next build` unaffected.
  ...(process.env.DOCKER_BUILD === '1' ? { output: 'standalone' as const } : {}),
  // Lets a second `next dev` instance run against this same source tree (e.g. a test that needs
  // its own disposable dev server) without racing the primary instance's .next build output.
  distDir: process.env.NEXT_DIST_DIR ?? '.next',
  transpilePackages: [
    "@xq/xiangqi-core",
    "@xq/shared-contracts",
    "@xq/api-client",
    "@xq/content",
  ],
}

export default nextConfig
