# AI Support Ticket Classification System

NestJS + TypeScript backend that classifies customer support tickets with Ollama, persists results with Prisma/PostgreSQL, and exposes `POST /tickets`.

## Current phase: Phase 3 (AI isolation)

- Isolated `AiClassificationService` talking to Ollama (`POST /api/chat`, `format: json`)
- Forced JSON schema + server-side validation of AI output
- One retry on invalid AI JSON, then HTTP `502 Bad Gateway`
- `TICKET_CLASSIFIER` wired to Ollama by default (`CLASSIFIER_PROVIDER=ollama`)
- Stub classifier still available via `CLASSIFIER_PROVIDER=stub`

## Prerequisites

- Node.js 22+
- npm
- Docker (PostgreSQL) **or** any Postgres matching `DATABASE_URL`
- [Ollama](https://ollama.com) running locally with a chat model (default `llama3.2`)

## Setup

```bash
cp .env.example .env
npm install
docker compose up -d
npx prisma migrate deploy
npx prisma generate

# Install/start Ollama, then pull the model
ollama pull llama3.2
```

## Run

```bash
npm run start:dev
```

## Test Phase 3

### Automated (no live Ollama required)

Unit tests mock the Ollama HTTP client:

```bash
npm test
npm run test:e2e
```

### Manual with Ollama

1. Confirm Ollama is up:

```bash
curl -s http://localhost:11434/api/tags
```

2. Ensure `.env` uses the AI provider:

```bash
CLASSIFIER_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2
```

3. Start the API and classify a ticket:

```bash
npm run start:dev

curl -s -X POST http://localhost:3000/tickets \
  -H 'Content-Type: application/json' \
  -d '{"message":"I cannot reset my password because the link does not work."}'
```

Expect HTTP `201` and a `classification` object with:

- `category`, `priority`, `sentiment`, `summary`
- `suggestedTeam`, `requiresHumanReview`

4. Failure behavior (Ollama stopped):

```bash
# stop Ollama, then:
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3000/tickets \
  -H 'Content-Type: application/json' \
  -d '{"message":"hello"}'
# expect 502
```

### Offline / stub mode

If Ollama is unavailable, you can still exercise the API contract:

```bash
CLASSIFIER_PROVIDER=stub npm run start:dev
```

## Scripts

| Script                      | Purpose                                            |
| --------------------------- | -------------------------------------------------- |
| `npm run start:dev`         | Dev server with watch                              |
| `npm run build`             | Compile TypeScript                                 |
| `npm test`                  | Unit tests (includes AI validator + mocked Ollama) |
| `npm run test:e2e`          | E2E tests                                          |
| `npm run prisma:generate`   | Generate Prisma Client                             |
| `npx prisma migrate deploy` | Apply existing migrations                          |

## Environment

See `.env.example`:

| Variable              | Default                                                             | Purpose             |
| --------------------- | ------------------------------------------------------------------- | ------------------- |
| `PORT`                | `3000`                                                              | HTTP port           |
| `DATABASE_URL`        | `postgresql://tickets:tickets@localhost:5432/tickets?schema=public` | Postgres            |
| `CLASSIFIER_PROVIDER` | `ollama`                                                            | `ollama` or `stub`  |
| `OLLAMA_BASE_URL`     | `http://localhost:11434`                                            | Ollama API base URL |
| `OLLAMA_MODEL`        | `llama3.2`                                                          | Chat model name     |
| `OLLAMA_TIMEOUT_MS`   | `60000`                                                             | Ollama HTTP timeout |

## AI contract (forced JSON)

Ollama is asked to return only:

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

Invalid JSON / enum values → one retry → `502` if still invalid.

## API

**`POST /tickets`** — same request/response shape as Phase 2; classification now comes from Ollama (unless stub mode).

Generated Prisma Client lives at `src/generated/prisma` (gitignored); run `npx prisma generate` after clone.
