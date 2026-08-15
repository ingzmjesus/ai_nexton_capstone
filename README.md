# AI Support Ticket Classification System

NestJS + TypeScript backend that classifies customer support tickets with Ollama, persists results with Prisma/PostgreSQL, and exposes `POST /tickets`.

## Current phase: Phase 5 (unit tests)

Expanded automated coverage for the full pipeline — DTO validation, AI response validation, isolated Ollama client (mocked HTTP), orchestration, and e2e API contracts. Live Ollama is **not** required for CI.

## Phase overview

| Phase | Focus                                                   | Status  |
| ----- | ------------------------------------------------------- | ------- |
| 0     | NestJS scaffolding, config, Prisma stubs, `GET /health` | Done    |
| 1     | Ticket/Classification models, migration, Prisma wiring  | Done    |
| 2     | `POST /tickets` API contract + stub classifier          | Done    |
| 3     | Isolated Ollama `AiClassificationService`               | Done    |
| 4     | Orchestration + transactional save                      | Done    |
| 5     | Expanded unit/e2e tests + coverage thresholds           | Current |

## Prerequisites

- Node.js 22+
- npm
- Docker (PostgreSQL) **or** any Postgres matching `DATABASE_URL`
- [Ollama](https://ollama.com) with model `llama3.2` (optional; use `CLASSIFIER_PROVIDER=stub` offline)

## Setup

```bash
cp .env.example .env
npm install
docker compose up -d
npx prisma migrate deploy
npx prisma generate

# Install Ollama (if not already installed), then pull the model
curl -fsSL https://ollama.com/install.sh | sh
ollama pull llama3.2
```

## Run

```bash
npm run start:dev
```

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

**`GET /health`**

```json
{ "status": "ok", "database": "up" }
```

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
    "category": "Account Access",
    "priority": "High",
    "sentiment": "Frustrated",
    "summary": "...",
    "suggestedTeam": "Account Support",
    "requiresHumanReview": true
  }
}
```

AI failures → `502` (nothing saved). Validation failures → `400`. DB failures → `500`.

---

## Phase 0 — Scaffolding

NestJS + TypeScript app, `@nestjs/config`, Prisma 7 init, `docker-compose` Postgres, and `GET /health`.

### How to test Phase 0

```bash
npm install
npx prisma generate
npm test
npm run start:dev
curl http://localhost:3000/health
# {"status":"ok","database":"up"}   # database field added in Phase 1
```

---

## Phase 1 — Domain & persistence

Prisma models `Ticket` + `Classification` (1:1), enums, initial migration, `PrismaModule` wired into `AppModule`. Health reports database status.

### Domain model

- **Ticket**: `id`, `message`, timestamps
- **Classification** (1:1): category, priority, sentiment, summary, suggested team, requires human review

Enums (DB/API display values):

- Category: Billing, Account Access, Technical Issue, Product Question, Refund, Security, Other
- Priority: Low, Medium, High, Critical
- Sentiment: Positive, Neutral, Negative, Frustrated
- Suggested team: Billing, Account Support, Technical Support, Product, Security, General

### How to test Phase 1

```bash
docker compose up -d
npx prisma migrate deploy
npx prisma generate
npm test
npm run start:dev
curl http://localhost:3000/health
# {"status":"ok","database":"up"}
npx prisma studio
```

---

## Phase 2 — API contract

`POST /tickets` with validated `CreateTicketDto`, response shape `{ id, message, createdAt, classification }`, and a swappable stub classifier (`TICKET_CLASSIFIER`) that persists ticket + classification.

### How to test Phase 2

```bash
npm test
npm run test:e2e
npm run start:dev

curl -s -X POST http://localhost:3000/tickets \
  -H 'Content-Type: application/json' \
  -d '{"message":"I cannot reset my password because the link does not work."}'

# expect 400
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3000/tickets \
  -H 'Content-Type: application/json' -d '{"message":""}'
```

---

## Phase 3 — AI isolation

Isolated `AiClassificationService` calling Ollama `POST /api/chat` with `format: "json"`, forced JSON schema, server-side validation, one retry, then `502`. Default `CLASSIFIER_PROVIDER=ollama`; stub still available.

### AI JSON contract

```json
{
  "category": "Billing | Account Access | Technical Issue | Product Question | Refund | Security | Other",
  "priority": "Low | Medium | High | Critical",
  "sentiment": "Positive | Neutral | Negative | Frustrated",
  "summary": "string",
  "suggested_team": "Billing | Account Support | Technical Support | Product | Security | General",
  "requires_human_review": true
}
```

### How to test Phase 3

Automated (mocked HTTP, no live Ollama):

```bash
npm test
npm run test:e2e
```

Manual with Ollama:

```bash
curl -s http://localhost:11434/api/tags
CLASSIFIER_PROVIDER=ollama npm run start:dev

curl -s -X POST http://localhost:3000/tickets \
  -H 'Content-Type: application/json' \
  -d '{"message":"I cannot reset my password because the link does not work."}'
```

Ollama stopped → expect `502`. Offline:

```bash
CLASSIFIER_PROVIDER=stub npm run start:dev
```

---

## Phase 4 — Orchestration

`TicketsService.create` pipeline:

1. Validate / normalize input
2. Classify via `TICKET_CLASSIFIER`
3. Re-validate classification before persistence
4. Save ticket + classification in a **Prisma `$transaction`**
5. Return API response

### How to test Phase 4

```bash
npm test
npm run test:e2e

CLASSIFIER_PROVIDER=stub npm run start:dev   # or ollama

curl -s http://localhost:3000/health
curl -s -X POST http://localhost:3000/tickets \
  -H 'Content-Type: application/json' \
  -d '{"message":"I cannot reset my password because the link does not work."}'

npx prisma studio
# confirm rows in tickets + classifications
```

Failure cases:

```bash
# validation → 400
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3000/tickets \
  -H 'Content-Type: application/json' -d '{"message":""}'

# AI down → 502, no DB row
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3000/tickets \
  -H 'Content-Type: application/json' -d '{"message":"hello"}'
```

---

## Phase 5 — Unit tests

Broader automated coverage and coverage thresholds. Live Ollama is not required for CI.

### What is covered

| Area                              | File(s)                                            |
| --------------------------------- | -------------------------------------------------- |
| Request DTO validation            | `src/tickets/dto/create-ticket.dto.spec.ts`        |
| AI JSON parse/validate            | `src/ai/classification-response.validator.spec.ts` |
| Ollama client (mocked HTTP)       | `src/ai/ai-classification.service.spec.ts`         |
| Orchestration (no partial writes) | `src/tickets/tickets.service.spec.ts`              |
| Stub classifier                   | `src/tickets/stub-ticket-classifier.spec.ts`       |
| Config defaults/overrides         | `src/config/configuration.spec.ts`                 |
| HTTP 201 / 400 / 502              | `test/tickets.e2e-spec.ts`                         |

### How to test Phase 5

```bash
npm test
npm run test:cov    # statements/lines/functions ≥ 85%, branches ≥ 70%
npm run test:e2e
```

Optional manual smoke:

```bash
CLASSIFIER_PROVIDER=stub npm run start:dev

curl -s -X POST http://localhost:3000/tickets \
  -H 'Content-Type: application/json' \
  -d '{"message":"I cannot reset my password because the link does not work."}'
```

---

## Scripts

| Script                      | Purpose                          |
| --------------------------- | -------------------------------- |
| `npm run start:dev`         | Dev server with watch            |
| `npm run build`             | Compile TypeScript               |
| `npm test`                  | Unit tests                       |
| `npm run test:cov`          | Unit tests + coverage thresholds |
| `npm run test:e2e`          | E2E tests                        |
| `npm run prisma:generate`   | Generate Prisma Client           |
| `npx prisma migrate deploy` | Apply existing migrations        |

Generated Prisma Client lives at `src/generated/prisma` (gitignored); run `npx prisma generate` after clone.
