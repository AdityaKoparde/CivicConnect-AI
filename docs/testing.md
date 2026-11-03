# Testing

Run everything from the repo root:

```bash
npm test
```

This runs, in order:

1. **ai-service** — `pytest` (Python)
2. **backend** — `vitest run` (supertest against a real Express app)
3. **frontend** — `vitest run`

Individual suites: `npm test --prefix ai-service`, `npm test --prefix backend`,
`npm test --prefix frontend`.

## Prerequisites

- PostgreSQL reachable at `TEST_DATABASE_URL` (created by `npm run db:setup`;
  in this workspace the portable server runs on port 5443).
- Python venv installed (`npm run install:all` creates `ai-service/.venv`).
- No manual setup of the test DB per run: the backend's vitest
  **global-setup** (`backend/tests/global-setup.ts`) drops/recreates the schema
  with `prisma migrate reset`, seeds it, and **spawns the Python AI service on
  port 8010** for the duration of the run, then tears it down.

`backend/vitest.config.ts` sets `fileParallelism: false` because all files
share one test database and one AI process.

## Backend — the 8 spec scenarios (39 tests, 8 files)

`backend/tests/*.test.ts`, each file = one scenario, using `supertest` with
`request.agent(app)` so cookies (session + guest) flow between requests:

| File | Scenario |
| ---- | -------- |
| `01-guest-chat.test.ts` | Guest opens a chat, answers one-question-at-a-time flow, confirms, receives `CCAI-YYYY-NNNNNN` + token once; state persists across reload (conversation restore) |
| `02-chat-limits.test.ts` | One question per turn, confirmation required before registration, cancel path, input validation |
| `03-emergency.test.ts` | Emergency messages → 112 guidance only, never a dispatch claim; no false positives |
| `04-auth-roles.test.ts` | Login/logout/me, 4 roles, role-scoped access to admin/officer endpoints |
| `05-citizen-access.test.ts` | Citizens get 403 on the staff complaint list (by design), can chat and track their own complaints |
| `06-tracking.test.ts` | Token tracking works; unknown ID and wrong token return identical 404s (no enumeration) |
| `07-lifecycle.test.ts` | Assignment, status transitions (validated), updates (public vs internal), duplicate link without deletion, escalation rules |
| `08-notifications-audit.test.ts` | Notifications created for relevant events, audit log records staff actions |

Helpers live in `backend/tests/helpers.ts` (cookie-jar `agent`,
`newConversation`, `chatUntilConfirmation`, `bearer`, `makeComplaint`).

## ai-service — 43 pytest cases

`ai-service/tests/`:

- category classification for all 15 categories (+ confidence/reasoning)
- language detection for en/kn/hi and mixed text
- emergency detection (fire/gas/flood/medical… → advise 112, severity
  escalation, no false positives on “fire station”/“fire extinguisher”)
- dialogue state machine: slot filling, one question per turn, confirmation
  summary, correction/cancel turns
- routing suggestions and provider labeling (`demo` vs `openai`)
- the optional Respan Gateway path (`tests/test_gateway.py`): cloud
  classification routed through the in-process gateway to a loopback
  OpenAI-compatible fixture, including retry and fallback-model routing

Run with `ai-service/.venv/bin/python -m pytest` (or `npm test --prefix
ai-service`).

## frontend — vitest

`src/**/*.test.ts`, node environment (no DOM emulation): dictionary integrity
for the en/kn/hi i18n strings (every key present and non-empty in all three
languages).

## Smoke check (manual E2E)

```bash
npm run db:setup && npm run dev
# in another shell:
curl -s localhost:4000/api/health
curl -s -X POST localhost:4000/api/track -H 'Content-Type: application/json' \
  -d '{"complaintId":"CCAI-2026-000001","trackingToken":"demo-track-01"}'
```

Full walkthroughs are listed at the end of [deployment.md](deployment.md).
