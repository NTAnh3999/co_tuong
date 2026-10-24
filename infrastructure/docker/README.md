# Docker infrastructure

`docker-compose.dev.yml` starts PostgreSQL and the Pikafish worker for local
development. The worker image downloads the pinned Pikafish release during its
build and verifies its SHA-256 checksum before including the engine.

The worker listens on port `4000` by default. Compose sets `PORT`, `POOL_SIZE`
and `QUEUE_CAP`; `PIKAFISH_PATH` is set in the image to the bundled engine.
The worker service is limited to 2 CPUs and 1 GiB of memory.

## Production

Set `DOMAIN`, `ACME_EMAIL`, and a strong `POSTGRES_PASSWORD` in the shell
environment, then start the production stack with:

```sh
docker compose -f infrastructure/docker/docker-compose.prod.yml up --build -d
```

The API and web images use Turbo's Docker pruning workflow. The API runs
`prisma migrate deploy` on every start before launching Nest; Prisma applies
pending migrations and skips migrations already recorded as applied. If the
migration command fails, the API process does not start. Prisma documents that
failed migrations can require manual resolution before a later deployment.

Caddy obtains and renews HTTPS certificates automatically for `DOMAIN`, using
`ACME_EMAIL` as the ACME contact address. Use a real public domain with DNS
pointing at this host for production; a placeholder or staging domain will not
receive a real production certificate. Caddy routes `/api/*` and Socket.IO
(`/socket.io/`) to the API, and all other requests to the web app.

Only Caddy publishes host ports (`80` and `443`). PostgreSQL, the API, web app,
and Pikafish worker have no host-published ports and are reachable only on the
Compose network, so external traffic enters through the proxy.
