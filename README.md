# CivicConnect AI

A multilingual (Kannada / English / Hindi) civic grievance platform for Karnataka:
citizens report problems through an AI chatbot, the AI classifies and routes each
report to the right department, citizens track progress with a secure token, and
staff work the queue from dashboards with live analytics and a map.

**The AI is Python.** All classification, NLP, emergency detection and language
handling live in a FastAPI service; the Node.js backend never duplicates AI logic
— it calls the AI service over an authenticated internal REST interface
(`X-Service-Key`). Every AI response is labeled with the provider that produced
it: `openai` (cloud LLM) or `demo` (built-in offline rule/ML engine used when no
cloud provider is configured).

## Repository layout

| Path          | What it is                                                  |
| ------------- | ----------------------------------------------------------- |
| `frontend/`   | React 18 + TypeScript + Vite + Tailwind, Recharts, Leaflet  |
| `backend/`    | Node.js + Express + TypeScript + Prisma (REST API, auth)    |
| `ai-service/` | Python 3.11 + FastAPI (classification, chatbot brain)       |
| `docs/`       | Architecture, API contract, deployment and testing docs     |
| `docker-compose.yml` | One-command full-stack deployment                      |

## Feature highlights

- **AI chatbot** — one question per turn, conversation state persists across
  reloads, explicit confirmation before anything is registered, complaint IDs of
  the form `CCAI-YYYY-NNNNNN`, token shown exactly once.
- **Emergency handling** — detected emergencies advise calling **112** and never
  claim a dispatch was made; the platform never claims an official government
  submission.
- **15 complaint categories**, jurisdiction-aware routing (AI *recommends*,
  backend *validates* against configured departments).
- **4 roles** — Super Admin, Department Admin, Department Officer, Citizen,
  with scoped dashboards.
- **Secure tracking** — token-hashed lookups that return identical 404s (no
  enumeration), owner may track without logging in.
- **Analytics** — Recharts dashboards (KPIs, trends, category/department
  splits) + Leaflet map with district-level public points and per-complaint
  staff points.
- **Runs with or without a cloud LLM** — the built-in engine works with no
  external credentials; set `AI_PROVIDER=openai` to route classification and
  translation through a cloud model.

## Quick start (local development)

Prerequisites: Node.js 20+, Python 3.11+, PostgreSQL 14+.

```bash
# 1. Install dependencies (root + backend + frontend, and a Python venv)
npm run install:all

# 2. Configure environment
cp .env.example .env                      # root
cp backend/.env.example backend/.env
cp ai-service/.env.example ai-service/.env
# edit DATABASE_URL / JWT_SECRET as needed

# 3. Create, migrate and seed the database
npm run db:setup

# 4. Run all three services (backend :4000, ai :8000, frontend :5173)
npm run dev
```

Open <http://localhost:5173>.

> **Portable PostgreSQL:** the `.env.example` in this workspace points at a
> portable PostgreSQL 16 running on port **5443** (started with
> `.pg/bin/pg_ctl`). On your own machine, use any PostgreSQL and set
> `DATABASE_URL` accordingly (`npm run db:setup` creates the `civicconnect`
> and `civicconnect_test` databases).

### Staff accounts

The seed creates a Super Admin plus department admins, officers and two citizens;
the account list and roles live in [backend/prisma/seed.ts](backend/prisma/seed.ts).
They are created with a shared default password — change it (or create your own
admin and deactivate the seeded ones) before letting real users in; see
[docs/deployment.md](docs/deployment.md).

## Tests

```bash
npm test          # Python (pytest) + backend (vitest/supertest) + frontend (vitest)
```

- **ai-service** — 43 pytest cases (classification, multilingual chat,
  emergency detection, confirmation flow, routing).
- **backend** — 39 vitest/supertest cases covering the **8 required spec
  scenarios** end-to-end (guest chat → confirm → track; auth and role
  enforcement; duplicate handling; escalation; notifications; …) against a real
  PostgreSQL test database with the Python service running.
- **frontend** — vitest unit tests (i18n dictionary integrity).

Individual runs: `npm test --prefix backend`, `npm test --prefix ai-service`,
`npm test --prefix frontend`.

## Cloud routing through the Respan Gateway (optional)

The AI service can send its cloud (`AI_PROVIDER=openai`) classification and
translation calls through the open-source
[Respan Gateway](https://github.com/respanai/respan-gateway).
It runs **in-process** (no container, port or extra service) and uses your own
provider key — no Respan account, hosted credits or tracing export is involved.

```bash
# ai-service/.env (never committed)
AI_PROVIDER=openai
OPENAI_API_KEY=...                    # your existing key, unchanged
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o-mini
AI_GATEWAY_ENABLED=true               # route cloud calls through the gateway
AI_GATEWAY_FALLBACK_MODEL=gpt-4o      # optional spare model
```

The service keeps its existing `httpx` client and request payload; the gateway
is attached as an httpx transport (`gw.async_transport()`), so no caller
changes. It serves one stable route name, `civic-classifier`, which it tries
twice and then resolves to `AI_GATEWAY_FALLBACK_MODEL` when one is set. For a
custom topology, set `AI_GATEWAY_CONFIG=/path/to/gateway.toml`; provider keys
belong there as `env:OPENAI_API_KEY` references, never literals.

```bash
# Manual run (same as before)
npm run dev --prefix ai-service       # or: npm run dev  (all services)
```

Verify it without a provider key:

```bash
cd ai-service && ./.venv/bin/python -m pytest tests/test_gateway.py
```

The test starts a loopback OpenAI-compatible fixture, calls the service's own
`POST /api/v1/ai/classify-complaint` path, and asserts the gateway resolved the
route to the configured model, forwarded the provider key, and retried twice
before falling back to the spare model. Observed result: 3 passed;
classification returned `ai_provider: "openai"` with the fixture's category.
No live provider request was made while developing this — set the variables
above and run the app to exercise your real provider.

## Deployment (Docker)

```bash
cp .env.example .env       # set JWT_SECRET, AI_SERVICE_KEY, POSTGRES_PASSWORD
docker compose up --build
```

- UI → <http://localhost:8080> (nginx, proxies `/api` to the backend so
  cookies are same-origin)
- API → <http://localhost:4000/api/health>
- Containers run migrations + idempotent seed on first boot.

See [docs/deployment.md](docs/deployment.md) for production notes (HTTPS,
secrets, `AI_PROVIDER=openai`, reverse proxy, backup).

## Environment variables

Each service ships a `.env.example` (root, `backend/`, `ai-service/`,
`frontend/`). Never commit real `.env` files — `.gitignore` excludes them.

| Variable               | Service  | Purpose                                    |
| ---------------------- | -------- | ------------------------------------------ |
| `DATABASE_URL`         | backend  | PostgreSQL connection string                |
| `JWT_SECRET`           | backend  | Signs the httpOnly session cookie          |
| `CORS_ORIGINS`         | backend  | Allowed browser origins (CSRF allowlist)   |
| `AI_SERVICE_URL`       | backend  | Base URL of the Python service             |
| `AI_SERVICE_KEY`       | both     | Shared `X-Service-Key` for internal calls  |
| `AI_PROVIDER`          | ai       | `demo` (default) or `openai`               |
| `OPENAI_API_KEY`       | ai       | Only used when `AI_PROVIDER=openai`        |
| `AI_GATEWAY_ENABLED`   | ai       | Route cloud calls through the in-process Respan Gateway |
| `AI_GATEWAY_FALLBACK_MODEL` | ai  | Optional spare model tried after the primary keeps failing |
| `VITE_API_BASE_URL`    | frontend | API base URL the browser calls             |

## Documentation

- [docs/api-documentation.md](docs/api-documentation.md) — full REST contract
- [docs/architecture.md](docs/architecture.md) — components, data flow, security model
- [docs/deployment.md](docs/deployment.md) — step-by-step deployment guide (Docker Compose, VPS + HTTPS, PaaS, manual)
- [docs/testing.md](docs/testing.md) — how the test suites work

## Security notes

- Session = httpOnly cookie (`ccai_token`) + Origin allowlist CSRF guard.
- Guests get a signed, HttpOnly `ccai_guest` cookie bound to a Citizen row;
  returning guests reuse the same citizen.
- Tracking tokens are stored hashed; unknown IDs and unknown tokens return the
  same 404 body (no enumeration).
- No secrets are committed; all keys come from environment variables.
