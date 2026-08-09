# Simple Router

A self-hosted AI provider router built with **Next.js** that exposes a single
OpenAI-compatible API while routing requests across multiple AI providers
(OpenAI, Gemini, Anthropic, Groq, OpenRouter, Alibaba DashScope, and any local
OpenAI-compatible server such as Ollama or vLLM).

Think OpenRouter / LiteLLM, but focused on self-hosted simplicity.

## Features

- **Single OpenAI-compatible API** — `/api/v1/chat/completions`, `/api/v1/responses`,
  `/api/v1/embeddings`, `/api/v1/images/generations`, `/api/v1/models`. Existing OpenAI
  SDKs only need a new `baseURL` and `apiKey`.
- **Multiple providers & credentials** — one provider can own many API keys
  with priorities for failover.
- **API keys are virtual models** — each inbound key is a full endpoint for an
  external project: pick its model list (with priority/weight) and a routing
  strategy. Clients can call the key's virtual model name to use that routing,
  or call any granted provider model directly. Strategies:
  - `fixed` · `random` · `roundRobin` · `weighted` · `priorityFailover`
- **Per-key rate limits** — requests/min, tokens/min, requests/day, monthly
  quota at the key and per-model level.
- **Usage tracking & cost estimation** — every request is logged with token
  counts, latency, status, and estimated cost.
- **Admin dashboard** — metrics, providers, models, API keys, usage analytics,
  searchable logs, and config export/import.
- **Streaming (SSE)** — chat completions stream through to clients, including
  Anthropic → OpenAI format conversion.
- **Secure by default** — session login (bcrypt), JWT API tokens, and all API
  keys encrypted at rest with an application-managed key (AES-256-GCM).
- **CORS enabled** — the `/api/v1` endpoints include `Access-Control-Allow-Origin`
  headers so browser-based OpenAI SDKs work out of the box.
- **Model testing** — test any catalog model directly from the Models screen
  with your own provider key and markdown-rendered responses.

## Tech Stack

Next.js (App Router) · TypeScript (strict) · TailwindCSS · shadcn/ui ·
TanStack Table primitives · Recharts · Prisma + SQLite · Zod · bcryptjs · jose

## Quick Start

Prerequisites: Node.js 20+.

```bash
npm install

# Configure environment
cp .env.example .env
# Set JWT_SECRET and ENCRYPTION_KEY (see .env.example for generators)

# Apply the migration and seed (admin user, provider presets, example key)
npm run db:deploy
npm run db:seed

# Start
npm run dev
```

Open http://localhost:3000 and sign in with the seeded admin credentials
(default: `admin@localhost` / `admin1234`; override via `ADMIN_EMAIL` /
`ADMIN_PASSWORD` in `.env`).

> The seed creates one example inbound key (a virtual model named
> `Development`) and prints the key to the console (`sk-sr-...`). Use it to
> call the gateway with `model: "Development"`, or with any provider model it
> has been granted. In production, change the admin password and rotate the
> example key.

### Using the gateway

```bash
# Use the key's virtual model — routes across its granted models per its strategy
curl http://localhost:3000/api/v1/chat/completions \
  -H "Authorization: Bearer sk-sr-..." \
  -H "Content-Type: application/json" \
  -d '{"model":"Development","messages":[{"role":"user","content":"Hello"}]}'

# Or call a granted provider model directly
curl http://localhost:3000/api/v1/chat/completions \
  -H "Authorization: Bearer sk-sr-..." \
  -H "Content-Type: application/json" \
  -d '{"model":"gemini-2.5-flash","messages":[{"role":"user","content":"Hello"}]}'
```

With the OpenAI SDK:

```ts
import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "http://localhost:3000/api/v1",
  apiKey: "sk-sr-...",
});
```

## Configuration

All secrets live in `.env`:

| Variable           | Purpose                                             |
| ------------------ | --------------------------------------------------- |
| `DATABASE_URL`     | SQLite file (default `file:./dev.db`)               |
| `JWT_SECRET`       | Signs session cookies and API tokens                |
| `ENCRYPTION_KEY`   | AES-256-GCM key for encrypting API keys at rest     |
| `REDIS_URL`        | Optional Redis for distributed rate limiting (future)|
| `ADMIN_EMAIL`      | Seed admin email                                    |
| `ADMIN_PASSWORD`   | Seed admin password                                 |

## Project Structure

```
app/
  (dashboard)/           Admin pages (dashboard, providers, models, keys,
                         usage, logs, settings)
  api/admin/             Admin REST API (session-protected)
  api/v1/                OpenAI-compatible gateway endpoints
  login/                 Session login
components/
  dashboard/  charts/    UI components
lib/
  auth/                  Session + JWT auth
  db/                    Prisma client singleton
  providers/             Provider adapters, presets, registry
  routing/               Routing strategies + target resolution
  rate-limit/            Rate limiter
  usage/                 Token/cost estimation + usage logging
  gateway/               Request pipeline orchestrator
  services/              Domain services (api-keys, providers, settings)
  validation/            Zod schemas
prisma/
  schema.prisma          Database schema
  migrations/            Prisma migrations
  seed.ts                Initial data seed
```

## Adding a Provider

A provider requires only an adapter implementing the `AIProvider` interface
(`chat`, `responses`, `embeddings`, `images`, `models`, `health`) plus a
registration in `lib/providers/registry.ts`. OpenAI-compatible providers can
extend `OpenAICompatibleProvider` in a few lines.

## Tests

```bash
npm test        # unit tests (vitest)
npm run lint    # eslint
npm run build   # production build + typecheck
```

## Docker

```bash
docker compose up
```

The container runs `prisma migrate deploy` on startup and exposes port 3000.
Set `JWT_SECRET`, `ENCRYPTION_KEY`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD` via
environment variables or a `.env` file.

## Maintenance

- **Log cleanup** — `POST /api/admin/logs/cleanup` with `{ "days": 90 }` to
  prune old usage logs (admin session required).
- **Config export/import** — use the Settings page in the dashboard or
  `GET /api/admin/settings/export` / `POST /api/admin/settings/import`.

## Development

```bash
# Add a new provider adapter
cp lib/providers/adapters/openai.ts lib/providers/adapters/my-provider.ts
# Edit the adapter, add it to lib/providers/registry.ts
```

Queries go through the `PrismaBetterSqlite3` driver adapter; the schema lives
in `prisma/schema.prisma` and a single migration in `prisma/migrations/`.

