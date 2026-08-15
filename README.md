# AI Support Ticket Classification System

NestJS + TypeScript backend that classifies customer support tickets (Ollama in a later phase), persists results with Prisma/PostgreSQL, and exposes `POST /tickets`.

## Current phase: Phase 2 (API contract)

- `POST /tickets` with request validation
- Response shape: `{ id, message, createdAt, classification }`
- Classification via a **stub classifier** (keyword heuristics) behind `TICKET_CLASSIFIER`
- Ticket + classification persisted to PostgreSQL
- Phase 3 will replace the stub with an Ollama-backed AI service

## Prerequisites

- Node.js 22+
- npm
- Docker (for PostgreSQL) **or** any Postgres matching `DATABASE_URL`
- Ollama (Phase 3+; not required for Phase 2)

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

## Test Phase 2

### Automated

```bash
npm test
npm run test:e2e
```

### Manual API checks

Health (DB must be up):

```bash
curl http://localhost:3000/health
# {"status":"ok","database":"up"}
```

Create a ticket:

```bash
curl -s -X POST http://localhost:3000/tickets \
  -H 'Content-Type: application/json' \
  -d '{"message":"I cannot reset my password because the link does not work."}'
```

Example response:

```json
{
  "id": "...",
  "message": "I cannot reset my password because the link does not work.",
  "createdAt": "2026-08-15T...",
  "classification": {
    "category": "Account Access",
    "priority": "High",
    "sentiment": "Frustrated",
    "summary": "Customer is having trouble accessing their account.",
    "suggestedTeam": "Account Support",
    "requiresHumanReview": true
  }
}
```

Validation failures (expect HTTP 400):

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3000/tickets \
  -H 'Content-Type: application/json' \
  -d '{"message":""}'

curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3000/tickets \
  -H 'Content-Type: application/json' \
  -d '{}'
```

Optional: inspect saved rows with `npx prisma studio`.

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

| Variable          | Default                                                             | Purpose                        |
| ----------------- | ------------------------------------------------------------------- | ------------------------------ |
| `PORT`            | `3000`                                                              | HTTP port                      |
| `DATABASE_URL`    | `postgresql://tickets:tickets@localhost:5432/tickets?schema=public` | Postgres connection            |
| `OLLAMA_BASE_URL` | `http://localhost:11434`                                            | Ollama API base URL (Phase 3+) |
| `OLLAMA_MODEL`    | `llama3.2`                                                          | Model name (Phase 3+)          |

## API contract

**`POST /tickets`**

Request:

```json
{ "message": "string (required, 1–5000 chars)" }
```

Response `201`:

```json
{
  "id": "string",
  "message": "string",
  "createdAt": "ISO-8601 datetime",
  "classification": {
    "category": "Billing | Account Access | ...",
    "priority": "Low | Medium | High | Critical",
    "sentiment": "Positive | Neutral | Negative | Frustrated",
    "summary": "string",
    "suggestedTeam": "Billing | Account Support | ...",
    "requiresHumanReview": true
  }
}
```

## Domain model

- **Ticket**: `id`, `message`, timestamps
- **Classification** (1:1): category, priority, sentiment, summary, suggested team, requires human review

Generated Prisma Client lives at `src/generated/prisma` (gitignored); run `npx prisma generate` after clone.
