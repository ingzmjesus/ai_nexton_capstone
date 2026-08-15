# AI Support Ticket Classification System

NestJS + TypeScript backend that receives a customer support ticket, classifies it with Ollama (AWS Bedrock alternative), validates the AI JSON, and persists ticket + classification in PostgreSQL via Prisma.

**Capstone status: complete (Phases 0–6).**

## Quick start (runbook)

```bash
# 1) Bootstrap
cp .env.example .env
npm install
docker compose up -d
npx prisma migrate deploy
npx prisma generate

# 2) Install Ollama (if needed) and pull the model
curl -fsSL https://ollama.com/install.sh | sh
ollama pull llama3.2

# 3) Run the API
npm run start:dev

# 4) Smoke checks
curl -s http://localhost:3000/health
curl -s -X POST http://localhost:3000/tickets \
  -H 'Content-Type: application/json' \
  -d '{"message":"I cannot reset my password because the link does not work."}'
```

Offline without Ollama:

```bash
CLASSIFIER_PROVIDER=stub npm run start:dev
```

---

## Architecture

```
Client
  │  POST /tickets { message }
  ▼
TicketsController  →  ValidationPipe + CreateTicketDto
  ▼
TicketsService (orchestration)
  ├── TicketClassifier (AiClassificationService | StubTicketClassifier)
  ├── Classification re-validation
  └── Prisma $transaction (Ticket + Classification)
  ▼
PostgreSQL
```

| Layer                                  | Responsibility                                          |
| -------------------------------------- | ------------------------------------------------------- |
| `TicketsModule`                        | HTTP API + orchestration                                |
| `AiModule` / `AiClassificationService` | Isolated Ollama client, JSON force, validate, retry     |
| `PrismaModule`                         | DB access                                               |
| `StubTicketClassifier`                 | Offline keyword classifier (`CLASSIFIER_PROVIDER=stub`) |

### Pipeline (`POST /tickets`)

1. Validate request (`message` required, 1–5000 chars)
2. Send message to AI classifier (Ollama by default)
3. Force / parse expected JSON structure
4. Validate AI fields (enums + types); retry once on invalid JSON
5. Save ticket + classification in one transaction
6. Return `{ id, message, createdAt, classification }`

---

## Prerequisites

- Node.js 22+
- npm
- Docker (PostgreSQL) **or** any Postgres matching `DATABASE_URL`
- [Ollama](https://ollama.com) with model `llama3.2` (optional; use stub mode offline)

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
# production-style:
npm run build && npm run start:prod
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

See `.env.example` for a copy-paste template.

## API reference

### `GET /health`

```bash
curl -s http://localhost:3000/health
```

```json
{ "status": "ok", "database": "up" }
```

### `POST /tickets`

```bash
curl -s -X POST http://localhost:3000/tickets \
  -H 'Content-Type: application/json' \
  -d '{"message":"I cannot reset my password because the link does not work."}'
```

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
    "summary": "Customer is having trouble accessing their account.",
    "suggestedTeam": "Account Support",
    "requiresHumanReview": true
  }
}
```

| Status | When                                                                    |
| ------ | ----------------------------------------------------------------------- |
| `201`  | Ticket classified and saved                                             |
| `400`  | Invalid/missing `message`                                               |
| `502`  | AI/Ollama failure or invalid classification after retry (nothing saved) |
| `500`  | Persistence failure                                                     |

### Example failure curls

```bash
# validation → 400
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3000/tickets \
  -H 'Content-Type: application/json' -d '{"message":""}'

# AI down (CLASSIFIER_PROVIDER=ollama, Ollama stopped) → 502
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3000/tickets \
  -H 'Content-Type: application/json' -d '{"message":"hello"}'
```

Inspect persisted rows:

```bash
npx prisma studio
```

---

## Domain model

- **Ticket**: `id`, `message`, timestamps
- **Classification** (1:1, cascade delete): category, priority, sentiment, summary, suggested team, requires human review

| Field          | Allowed values                                                                      |
| -------------- | ----------------------------------------------------------------------------------- |
| Category       | Billing, Account Access, Technical Issue, Product Question, Refund, Security, Other |
| Priority       | Low, Medium, High, Critical                                                         |
| Sentiment      | Positive, Neutral, Negative, Frustrated                                             |
| Suggested team | Billing, Account Support, Technical Support, Product, Security, General             |

### AI JSON contract (forced)

```json
{
  "category": "Account Access",
  "priority": "High",
  "sentiment": "Frustrated",
  "summary": "Password reset link is broken.",
  "suggested_team": "Account Support",
  "requires_human_review": true
}
```

---

## Testing

```bash
npm test           # unit tests
npm run test:cov   # coverage thresholds (stmts/lines/funcs ≥ 85%, branches ≥ 70%)
npm run test:e2e   # HTTP contracts (Prisma + classifier mocked; no live Ollama)
```

Live Ollama is **not** required for automated tests.

---

## Troubleshooting

| Symptom                                       | Likely cause                            | Fix                                                                                    |
| --------------------------------------------- | --------------------------------------- | -------------------------------------------------------------------------------------- |
| `ERR_CONNECTION_REFUSED` on `:3000`           | API not running                         | `npm run start:dev`                                                                    |
| `database":"down"` / Prisma connection errors | Postgres down or bad `DATABASE_URL`     | `docker compose up -d`; check `.env`                                                   |
| `502` from `POST /tickets`                    | Ollama down/wrong model/invalid AI JSON | `curl localhost:11434/api/tags`; `ollama pull llama3.2`; or `CLASSIFIER_PROVIDER=stub` |
| Migration errors                              | Client/schema out of sync               | `npx prisma migrate deploy && npx prisma generate`                                     |
| Tests fail resolving Prisma `.js` imports     | Missing Jest mapper / VM modules        | Use repo scripts (`npm test` already sets flags)                                       |

---

## Capstone requirements checklist

| #   | Requirement                  | Implementation                                                    |
| --- | ---------------------------- | ----------------------------------------------------------------- |
| 1   | `POST /tickets`              | `TicketsController`                                               |
| 2   | Validate request             | `CreateTicketDto` + global `ValidationPipe`                       |
| 3   | Send ticket to AI            | `AiClassificationService` → Ollama                                |
| 4   | Force expected JSON          | Ollama `format: "json"` + system prompt                           |
| 5   | Validate AI response         | `classification-response.validator.ts` (+ orchestration re-check) |
| 6   | Save ticket + classification | Prisma `$transaction`                                             |
| 7   | Return classification        | `TicketResponseDto` shape                                         |
| 8   | Unit tests                   | Jest unit + e2e + coverage thresholds                             |
| 9   | AI isolated in own service   | `AiModule` / `AiClassificationService`                            |

---

## Phase overview

| Phase | Focus                                                   | Status |
| ----- | ------------------------------------------------------- | ------ |
| 0     | NestJS scaffolding, config, Prisma stubs, `GET /health` | Done   |
| 1     | Ticket/Classification models, migration, Prisma wiring  | Done   |
| 2     | `POST /tickets` API contract + stub classifier          | Done   |
| 3     | Isolated Ollama `AiClassificationService`               | Done   |
| 4     | Orchestration + transactional save                      | Done   |
| 5     | Expanded unit/e2e tests + coverage thresholds           | Done   |
| 6     | Docs & runbook (this README)                            | Done   |

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
```

---

## Phase 1 — Domain & persistence

Prisma models `Ticket` + `Classification` (1:1), enums, initial migration, `PrismaModule` wired into `AppModule`. Health reports database status.

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

`POST /tickets` with validated `CreateTicketDto`, response shape `{ id, message, createdAt, classification }`, and swappable `TICKET_CLASSIFIER` (stub for offline use).

### How to test Phase 2

```bash
npm test
npm run test:e2e
npm run start:dev

curl -s -X POST http://localhost:3000/tickets \
  -H 'Content-Type: application/json' \
  -d '{"message":"I cannot reset my password because the link does not work."}'

curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3000/tickets \
  -H 'Content-Type: application/json' -d '{"message":""}'
```

---

## Phase 3 — AI isolation

Isolated `AiClassificationService` calling Ollama `POST /api/chat` with `format: "json"`, forced schema, server-side validation, one retry, then `502`. Default `CLASSIFIER_PROVIDER=ollama`.

### How to test Phase 3

```bash
npm test
npm run test:e2e

curl -s http://localhost:11434/api/tags
CLASSIFIER_PROVIDER=ollama npm run start:dev
curl -s -X POST http://localhost:3000/tickets \
  -H 'Content-Type: application/json' \
  -d '{"message":"I cannot reset my password because the link does not work."}'

# offline
CLASSIFIER_PROVIDER=stub npm run start:dev
```

---

## Phase 4 — Orchestration

`TicketsService.create`: validate → classify → re-validate → Prisma `$transaction` → response. AI failures do not write rows.

### How to test Phase 4

```bash
npm test
npm run test:e2e
CLASSIFIER_PROVIDER=stub npm run start:dev

curl -s http://localhost:3000/health
curl -s -X POST http://localhost:3000/tickets \
  -H 'Content-Type: application/json' \
  -d '{"message":"I cannot reset my password because the link does not work."}'
npx prisma studio
```

---

## Phase 5 — Unit tests

Broader automated coverage and coverage thresholds. Live Ollama is not required for CI.

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
npm run test:cov
npm run test:e2e
```

---

## Phase 6 — Docs & runbook

This README is the project runbook: quick start, architecture, env vars, Ollama install/pull, API `curl` examples, troubleshooting, and per-phase notes.

### How to verify Phase 6

- Walk the **Quick start** section end-to-end on a clean machine
- Confirm `.env.example` matches documented environment variables
- Confirm capstone checklist rows map to real modules in `src/`

---

## Project structure

```
src/
  ai/                 # Isolated Ollama classification
  tickets/            # POST /tickets API + orchestration
  prisma/             # PrismaService / PrismaModule
  config/             # Env configuration
prisma/               # Schema + migrations
test/                 # E2E tests
docker-compose.yml    # Local Postgres
.env.example          # Env template
AI_SUPPORT_TICKET_CAPSTONE.md
```

## Scripts

| Script                      | Purpose                          |
| --------------------------- | -------------------------------- |
| `npm run start:dev`         | Dev server with watch            |
| `npm run start:prod`        | Run compiled `dist/main`         |
| `npm run build`             | Compile TypeScript               |
| `npm test`                  | Unit tests                       |
| `npm run test:cov`          | Unit tests + coverage thresholds |
| `npm run test:e2e`          | E2E tests                        |
| `npm run prisma:generate`   | Generate Prisma Client           |
| `npx prisma migrate deploy` | Apply existing migrations        |
| `npx prisma studio`         | Browse DB data                   |

Generated Prisma Client lives at `src/generated/prisma` (gitignored); run `npx prisma generate` after clone.
