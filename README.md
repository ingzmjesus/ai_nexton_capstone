# AI Support Ticket Classification System

NestJS + TypeScript backend that will classify customer support tickets with Ollama, persist results with Prisma/PostgreSQL, and expose `POST /tickets`.

## Current phase: Phase 1 (domain & persistence)

- NestJS app with `GET /health` (includes database status)
- Prisma models: `Ticket` + `Classification` (1:1) with approved enums
- Initial migration applied via Prisma Migrate
- `PrismaModule` wired into `AppModule`

AI classification and `POST /tickets` come in later phases.

## Prerequisites

- Node.js 22+
- npm
- Docker (for PostgreSQL) **or** any Postgres matching `DATABASE_URL`
- Ollama (later phase; not required yet)

## Setup

```bash
cp .env.example .env
npm install
docker compose up -d
npx prisma migrate deploy
npx prisma generate
```

## Run

```bash
npm run start:dev
```

Health check (database should be `up`):

```bash
curl http://localhost:3000/health
# {"status":"ok","database":"up"}
```

## Test Phase 1

```bash
# Unit tests (includes Prisma persistence test against DATABASE_URL)
npm test

# E2E (Prisma is mocked; health contract only)
npm run test:e2e
```

Manual persistence check with Prisma Studio:

```bash
npx prisma studio
```

## Scripts

| Script                      | Purpose                       |
| --------------------------- | ----------------------------- |
| `npm run start:dev`         | Dev server with watch         |
| `npm run build`             | Compile TypeScript            |
| `npm test`                  | Unit tests                    |
| `npm run test:e2e`          | E2E tests                     |
| `npm run prisma:generate`   | Generate Prisma Client        |
| `npm run prisma:migrate`    | Create/apply migrations (dev) |
| `npx prisma migrate deploy` | Apply existing migrations     |

## Environment

See `.env.example`:

| Variable          | Default                                                             | Purpose                       |
| ----------------- | ------------------------------------------------------------------- | ----------------------------- |
| `PORT`            | `3000`                                                              | HTTP port                     |
| `DATABASE_URL`    | `postgresql://tickets:tickets@localhost:5432/tickets?schema=public` | Postgres connection           |
| `OLLAMA_BASE_URL` | `http://localhost:11434`                                            | Ollama API base URL           |
| `OLLAMA_MODEL`    | `llama3.2`                                                          | Model name for classification |

## Domain model (Phase 1)

- **Ticket**: `id`, `message`, timestamps
- **Classification** (1:1): `category`, `priority`, `sentiment`, `summary`, `suggestedTeam`, `requiresHumanReview`

Enums (DB values match product strings):

- Category: Billing, Account Access, Technical Issue, Product Question, Refund, Security, Other
- Priority: Low, Medium, High, Critical
- Sentiment: Positive, Neutral, Negative, Frustrated
- Suggested team: Billing, Account Support, Technical Support, Product, Security, General

Generated Prisma Client lives at `src/generated/prisma` (gitignored); run `npx prisma generate` after clone.
