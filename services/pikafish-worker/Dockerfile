FROM node:22-trixie-slim AS builder

WORKDIR /workspace

RUN corepack enable \
    && corepack prepare pnpm@12.15.0 --activate \
    && apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates curl file p7zip-full \
    && rm -rf /var/lib/apt/lists/*

COPY . .

RUN pnpm install --frozen-lockfile \
    && pnpm --filter @xq/pikafish-worker build \
    && pnpm --filter @xq/pikafish-worker deploy --prod --legacy /out

RUN set -eux; \
    archive=/tmp/Pikafish.2026-09-06.7z; \
    curl --fail --location --silent --show-error \
      https://github.com/official-pikafish/Pikafish/releases/download/Pikafish-2026-09-06/Pikafish.2026-09-06.7z \
      --output "$archive"; \
    echo '41952bbfe2520faceb5902c69e6ab4845cc999841d2b49a95cc1be7867a25e5b  /tmp/Pikafish.2026-09-06.7z' | sha256sum --check --strict; \
    mkdir -p /tmp/pikafish /out/pikafish; \
    7z x "$archive" -o/tmp/pikafish -y >/dev/null; \
    engine="$(find /tmp/pikafish -type f -exec sh -c 'for f do if file -b "$f" | grep -q "^ELF 64-bit.*x86-64"; then printf "%s\\n" "$f"; exit 0; fi; done; exit 0' sh {} + | head -n 1)"; \
    weights="$(find /tmp/pikafish -type f -name '*.nnue' -print -quit)"; \
    copying="$(find /tmp/pikafish -type f -name Copying.txt -print -quit)"; \
    nnue_license="$(find /tmp/pikafish -type f -name NNUE-License.md -print -quit)"; \
    authors="$(find /tmp/pikafish -type f -name AUTHORS -print -quit)"; \
    test -n "$engine" || { echo 'No Linux x86-64 Pikafish ELF found in release archive' >&2; exit 1; }; \
    test -n "$weights" || { echo 'No NNUE weights found in release archive' >&2; exit 1; }; \
    test -n "$copying" || { echo 'Copying.txt missing from release archive' >&2; exit 1; }; \
    test -n "$nnue_license" || { echo 'NNUE-License.md missing from release archive' >&2; exit 1; }; \
    test -n "$authors" || { echo 'AUTHORS missing from release archive' >&2; exit 1; }; \
    cp "$engine" /out/pikafish/pikafish; \
    cp "$weights" /out/pikafish/pikafish.nnue; \
    cp "$copying" /out/pikafish/Copying.txt; \
    cp "$nnue_license" /out/pikafish/NNUE-License.md; \
    cp "$authors" /out/pikafish/AUTHORS; \
    chmod 755 /out/pikafish/pikafish; \
    chmod 644 /out/pikafish/pikafish.nnue /out/pikafish/Copying.txt /out/pikafish/NNUE-License.md /out/pikafish/AUTHORS; \
    rm -rf /tmp/Pikafish.2026-09-06.7z /tmp/pikafish

FROM node:22-trixie-slim AS runtime

ENV NODE_ENV=production \
    PIKAFISH_PATH=/opt/pikafish/pikafish

WORKDIR /app

COPY --from=builder --chown=node:node /out/package.json ./package.json
COPY --from=builder --chown=node:node /out/dist/ ./dist/
COPY --from=builder --chown=node:node /out/node_modules/ ./node_modules/
COPY --from=builder --chown=node:node /out/pikafish/ /opt/pikafish/

USER node

EXPOSE 4000

CMD ["node", "dist/index.js"]
