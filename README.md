# AI Support Ticket Classification System

NestJS + TypeScript backend that classifies customer support tickets with Ollama, persists results with Prisma/PostgreSQL, and exposes `POST /tickets`.

## Current phase: Phase 4 (orchestration)

End-to-end `POST /tickets` pipeline:

1. Validate request (`ValidationPipe` + `CreateTicketDto`)
2. Classify via isolated `TICKET_CLASSIFIER` (Ollama by default)
3. Re-validate classification before persistence
4. Save ticket + classification in a **Prisma transaction**
5. Return `{ id, message, createdAt, classification }`

AI failures → `502` (nothing saved). DB failures → `500`.

## Prerequisites

- Node.js 22+
- npm
- Docker (PostgreSQL) **or** any Postgres matching `DATABASE_URL`
- [Ollama](https://ollama.com) with model `llama3.2` (or set `CLASSIFIER_PROVIDER=stub`)

## Setup

```bash
cp .env.example .env
npm install
docker compose up -d
npx prisma migrate deploy
npx prisma generate
ollama pull llama3.2   # if using Ollama
```

## Run

```bash
npm run start:dev
```

## Test Phase 4

### Automated

```bash
npm test
npm run test:e2e
```

Unit coverage for orchestration includes:

- happy path (classify → transactional save → response)
- classifier failure does **not** call `$transaction`
- invalid classification payload rejected before save
- persistence failure mapped to `500`

### Manual end-to-end

```bash
# health
curl -s http://localhost:3000/health

# create ticket (Ollama or stub)
curl -s -X POST http://localhost:3000/tickets \
  -H 'Content-Type: application/json' \
  -d '{"message":"I cannot reset my password because the link does not work."}'
```

Expect HTTP `201` and a full classification object. Confirm both rows exist:

```bash
npx prisma studio
# tables: tickets, classifications (same ticket id)
```

### Failure cases

```bash
# validation → 400
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3000/tickets \
  -H 'Content-Type: application/json' -d '{"message":""}'

# AI down (CLASSIFIER_PROVIDER=ollama, Ollama stopped) → 502, no DB row
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3000/tickets \
  -H 'Content-Type: application/json' -d '{"message":"hello"}'
```

### Offline without Ollama

```bash
CLASSIFIER_PROVIDER=stub npm run start:dev
```

## Scripts

| Script                      | Purpose                   |
| --------------------------- | ------------------------- |
| `npm run start:dev`         | Dev server with watch     |
| `npm run build`             | Compile TypeScript        |
| `npm test`                  | Unit tests                |
| `npm run test:e2e`          | E2E tests                 |
| `npm run prisma:generate`   | Generate Prisma Client    |
| `npx prisma migrate deploy` | Apply existing migrations |

## Environment

| Variable              | Default                                                             | Purpose            |
| --------------------- | ------------------------------------------------------------------- | ------------------ |
| `PORT`                | `3000`                                                              | HTTP port          |
| `DATABASE_URL`        | `postgresql://tickets:tickets@localhost:5432/tickets?schema=public` | Postgres           |
| `CLASSIFIER_PROVIDER` | `ollama`                                                            | `ollama` or `stub` |
| `OLLAMA_BASE_URL`     | `http://localhost:11434`                                            | Ollama API         |
| `OLLAMA_MODEL`        | `llama3.2`                                                          | Chat model         |
| `OLLAMA_TIMEOUT_MS`   | `60000`                                                             | Ollama timeout     |

## API

**`POST /tickets`**

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
    "category": "Account Access",
    "priority": "High",
    "sentiment": "Frustrated",
    "summary": "...",
    "suggestedTeam": "Account Support",
    "requiresHumanReview": true
  }
}
```

Generated Prisma Client lives at `src/generated/prisma` (gitignored); run `npx prisma generate` after clone.
