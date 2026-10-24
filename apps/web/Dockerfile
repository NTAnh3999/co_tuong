FROM node:22-trixie-slim AS pruner
WORKDIR /workspace
RUN corepack enable && corepack prepare pnpm@12.15.0 --activate
COPY . .
RUN pnpm install --frozen-lockfile \
    && pnpm exec turbo prune @xq/web --docker

FROM node:22-trixie-slim AS builder
WORKDIR /workspace
RUN corepack enable && corepack prepare pnpm@12.15.0 --activate
COPY --from=pruner /workspace/out/json/ ./
COPY --from=pruner /workspace/out/pnpm-lock.yaml ./pnpm-lock.yaml
RUN pnpm install --frozen-lockfile
COPY --from=pruner /workspace/out/full/ ./
COPY --from=pruner /workspace/tsconfig.base.json ./tsconfig.base.json
ARG NEXT_PUBLIC_API_BASE_URL=/api/v1
ENV NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL}
ENV DOCKER_BUILD=1
RUN pnpm exec turbo run build --filter=@xq/web

FROM node:22-trixie-slim AS runtime
ENV NODE_ENV=production PORT=3000
WORKDIR /app
COPY --from=builder --chown=node:node /workspace/apps/web/.next/standalone/ ./
COPY --from=builder --chown=node:node /workspace/apps/web/.next/static/ ./apps/web/.next/static/
COPY --from=builder --chown=node:node /workspace/apps/web/public/ ./apps/web/public/
USER node
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
