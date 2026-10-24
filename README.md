# Xiangqi Learn & Play — Cờ Tướng web platform

A modern web platform for learning and playing Xiangqi (Chinese chess) built with Next.js, NestJS, PostgreSQL, and a pure-TypeScript rules engine.

## Prerequisites

- **Node.js** >=22
- **pnpm** (installed via [corepack](https://nodejs.org/api/corepack.html))
- **Docker** & **Docker Compose** (for local development database)

## Quick Start

### 1. Enable pnpm via corepack

```bash
corepack enable
```

### 2. Install dependencies

```bash
pnpm install
```

### 3. Set up environment variables

Copy environment examples to each app:

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

### 4. Start PostgreSQL

From the repository root:

```bash
docker compose -f infrastructure/docker/docker-compose.dev.yml up -d
```

This creates two databases:
- `xq_dev` — for development
- `xq_test` — for tests

Verify with `docker ps` — you should see `xq_postgres_dev` running on port 5432.

### 5. Build the project

```bash
pnpm turbo run build
```

### 6. Run the dev servers

```bash
pnpm turbo run dev
```

- API: http://localhost:3001/api/v1
- Web: http://localhost:3000

## Testing

Run all tests across the monorepo:

```bash
pnpm turbo run test
```

## Documentation

- **[Execution Plan](.agents/PLAN.md)** — Milestones, task IDs, and acceptance criteria
- **[Product Specification](docs/spec/v1.0/)** — Vietnamese product spec and feature details
- **[Architecture Decisions](docs/adr/)** — ADRs covering coordinates, FEN/UCI, ruleset, and design patterns
- **[Contribution Guide](AGENTS.md)** — Conventions for agents and contributors working in this repo

## License

All rights reserved.
