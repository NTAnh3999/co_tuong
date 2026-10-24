FROM node:22-trixie-slim AS pruner
WORKDIR /workspace
RUN corepack enable && corepack prepare pnpm@12.15.0 --activate
COPY . .
RUN pnpm install --frozen-lockfile \
    && pnpm exec turbo prune @xq/api --docker

FROM node:22-trixie-slim AS builder
WORKDIR /workspace
RUN corepack enable && corepack prepare pnpm@12.15.0 --activate
COPY --from=pruner /workspace/out/json/ ./
COPY --from=pruner /workspace/out/pnpm-lock.yaml ./pnpm-lock.yaml
RUN pnpm install --frozen-lockfile
COPY --from=pruner /workspace/out/full/ ./
COPY --from=pruner /workspace/tsconfig.base.json ./tsconfig.base.json
RUN pnpm --filter @xq/api exec prisma generate \
    && pnpm exec turbo run build --filter=@xq/api

FROM node:22-trixie-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
WORKDIR /app/apps/api
COPY --from=builder --chown=node:node /workspace/node_modules/ /app/node_modules/
COPY --from=builder --chown=node:node /workspace/packages/xiangqi-core/package.json /app/packages/xiangqi-core/package.json
COPY --from=builder --chown=node:node /workspace/packages/xiangqi-core/dist/ /app/packages/xiangqi-core/dist/
COPY --from=builder --chown=node:node /workspace/packages/xiangqi-core/node_modules/ /app/packages/xiangqi-core/node_modules/
COPY --from=builder --chown=node:node /workspace/packages/shared-contracts/package.json /app/packages/shared-contracts/package.json
COPY --from=builder --chown=node:node /workspace/packages/shared-contracts/dist/ /app/packages/shared-contracts/dist/
COPY --from=builder --chown=node:node /workspace/packages/shared-contracts/node_modules/ /app/packages/shared-contracts/node_modules/
COPY --from=builder --chown=node:node /workspace/apps/api/package.json ./package.json
COPY --from=builder --chown=node:node /workspace/apps/api/dist/ ./dist/
COPY --from=builder --chown=node:node /workspace/apps/api/node_modules/ ./node_modules/
COPY --from=builder --chown=node:node /workspace/apps/api/prisma/schema.prisma ./prisma/schema.prisma
COPY --from=builder --chown=node:node /workspace/apps/api/prisma/migrations/ ./prisma/migrations/
COPY --chown=node:node apps/api/docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod 755 ./docker-entrypoint.sh
USER node
EXPOSE 3001
ENTRYPOINT ["./docker-entrypoint.sh"]
