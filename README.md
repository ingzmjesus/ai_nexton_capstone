# AI Support Ticket Classification System

NestJS + TypeScript backend that will classify customer support tickets with Ollama, persist results with Prisma/PostgreSQL, and expose `POST /tickets`.

## Phase 0 (this branch)

Scaffolding only:

- NestJS app with TypeScript
- `@nestjs/config` for `PORT`, `DATABASE_URL`, `OLLAMA_BASE_URL`, `OLLAMA_MODEL`
- Prisma 7 initialized (PostgreSQL) + `PrismaModule` / `PrismaService` stubs
- `docker-compose.yml` for local Postgres
- `GET /health` smoke endpoint

Domain models, AI classification, and `POST /tickets` come in later phases.

## Prerequisites

- Node.js 22+
- npm
- Docker (for PostgreSQL)
- Ollama (used in a later phase; not required for Phase 0)

## Setup

```bash
cp .env.example .env
npm install
npx prisma generate
```

Start PostgreSQL:

```bash
docker compose up -d
```

## Run

```bash
npm run start:dev
```

Smoke check:

```bash
curl http://localhost:3000/health
# {"status":"ok"}
```

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run start:dev` | Dev server with watch |
| `npm run build` | Compile TypeScript |
| `npm test` | Unit tests |
| `npm run test:e2e` | E2E tests |
| `npm run prisma:generate` | Generate Prisma Client |

## Environment

See `.env.example`:

| Variable | Default | Purpose |
|----------|---------|---------|
| `PORT` | `3000` | HTTP port |
| `DATABASE_URL` | `postgresql://tickets:tickets@localhost:5432/tickets?schema=public` | Postgres connection |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Ollama API base URL |
| `OLLAMA_MODEL` | `llama3.2` | Model name for classification |

## Notes

- `PrismaModule` is prepared under `src/prisma/` but not imported into `AppModule` yet. Phase 1 wires it after Ticket/Classification models and migrations exist.
- Generated Prisma Client lives at `src/generated/prisma` (gitignored); run `npx prisma generate` after clone.
