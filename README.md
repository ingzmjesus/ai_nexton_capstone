# AI Support Ticket Classification System

NestJS + TypeScript backend that classifies customer support tickets with Ollama, persists results with Prisma/PostgreSQL, and exposes `POST /tickets`.

## Current phase: Phase 5 (unit tests)

Expanded automated coverage for the full pipeline — DTO validation, AI response validation, isolated Ollama client (mocked HTTP), orchestration, and e2e API contracts. Live Ollama is **not** required for CI.

## Prerequisites

- Node.js 22+
- npm
- Docker (PostgreSQL) **or** any Postgres matching `DATABASE_URL`
- [Ollama](https://ollama.com) with model `llama3.2` (optional for manual AI tests)

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

## Test Phase 5

### Automated (recommended)

```bash
# Unit tests (DTO, AI validator, AiClassificationService, TicketsService, stub, config)
npm test

# Coverage report + threshold gate (statements/lines/functions ≥ 85%, branches ≥ 70%)
npm run test:cov

# E2E API contract tests (Prisma + classifier mocked; no live Ollama)
npm run test:e2e
```

What is covered:

| Area                              | File(s)                                            |
| --------------------------------- | -------------------------------------------------- |
| Request DTO validation            | `src/tickets/dto/create-ticket.dto.spec.ts`        |
| AI JSON parse/validate            | `src/ai/classification-response.validator.spec.ts` |
| Ollama client (mocked HTTP)       | `src/ai/ai-classification.service.spec.ts`         |
| Orchestration (no partial writes) | `src/tickets/tickets.service.spec.ts`              |
| Stub classifier                   | `src/tickets/stub-ticket-classifier.spec.ts`       |
| Config defaults/overrides         | `src/config/configuration.spec.ts`                 |
| HTTP 201 / 400 / 502              | `test/tickets.e2e-spec.ts`                         |

### Manual smoke (optional)

```bash
CLASSIFIER_PROVIDER=stub npm run start:dev

curl -s -X POST http://localhost:3000/tickets \
  -H 'Content-Type: application/json' \
  -d '{"message":"I cannot reset my password because the link does not work."}'
```

With Ollama:

```bash
CLASSIFIER_PROVIDER=ollama npm run start:dev
# same curl as above
```

## Scripts

| Script                      | Purpose                          |
| --------------------------- | -------------------------------- |
| `npm test`                  | Unit tests                       |
| `npm run test:cov`          | Unit tests + coverage thresholds |
| `npm run test:e2e`          | E2E tests                        |
| `npm run start:dev`         | Dev server                       |
| `npm run build`             | Compile TypeScript               |
| `npx prisma migrate deploy` | Apply migrations                 |
| `npx prisma generate`       | Generate Prisma Client           |

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

**`POST /tickets`** — see prior phases for request/response shape. Classification comes from Ollama unless `CLASSIFIER_PROVIDER=stub`.

Generated Prisma Client lives at `src/generated/prisma` (gitignored); run `npx prisma generate` after clone.
