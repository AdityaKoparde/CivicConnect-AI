# Architecture

```
┌──────────────┐   HTTP (REST, cookie session)   ┌──────────────────┐  internal REST   ┌──────────────────┐
│   Frontend   │ ───────────────────────────────▶ │     Backend      │ ────────────────▶ │    AI service    │
│ React+Vite   │ ◀─────────────────────────────── │ Node/Express     │  X-Service-Key   │ Python/FastAPI   │
└──────────────┘                                 │ Prisma ORM       │                   └────────┬─────────┘
                                                 └────────┬─────────┘                            │
                                                          │ SQL                                 │ provider
                                                          ▼                                     ▼
                                                  ┌──────────────────┐                demo (offline rules/ML)
                                                  │   PostgreSQL     │                or openai-compatible API
                                                  └──────────────────┘
```

## Principles

1. **Python owns all AI/ML.** Classification, language detection, emergency
   detection, summarization and the chatbot dialogue engine live in
   `ai-service/`. The Node backend contains *no* duplicate AI logic — it makes
   authenticated internal HTTP calls (`X-Service-Key` header) to the Python
   service. A wrong/missing key → 401 from Python.
2. **AI recommends, backend validates.** Python returns a category,
   department *suggestion*, priority and confidence. The backend re-validates
   the suggestion against the configured department/jurisdiction catalog before
   anything is persisted. Routing is never taken from the model alone.
3. **Honest labeling.** Every AI-touching response carries the provider
   (`demo` or `openai`) and the UI shows it. The platform never claims an
   official government submission and never claims to have dispatched help —
   emergencies are advised to call 112.

## Services

### frontend/ (React 18 + TypeScript + Vite + Tailwind)
- `lib/api.ts` — fetch wrapper, `VITE_API_BASE_URL` (default
  `http://localhost:4000/api`), throws the backend's error envelope.
- `lib/auth.tsx` — `AuthContext` (`GET /api/auth/me` on boot), role helpers.
- `lib/i18n.tsx` — en/kn/hi dictionary persisted in `localStorage.ccai_lang`.
- Pages: landing (13 sections), chat, track, login, register, dashboard
  (Overview / Complaints / Detail / Officers / Audit / CitizenHome).
- Charts: Recharts. Map: Leaflet (district centroids publicly, per-complaint
  points for staff).

### backend/ (Node.js + Express + TypeScript + Prisma)
- `server.ts` mounts: `/api/auth`, `/api/chat`, `/api/complaints`,
  `/api/track` + `/api/map/points`, catalog (`/api/health`, `/api/stats`,
  `/api/categories`, `/api/departments`, `/api/jurisdictions`), `/api/admin`,
  `/api/notifications`, `/api/files`, static `/uploads`.
- **Auth:** JWT in httpOnly cookie `ccai_token`; `attachUser` middleware; CSRF
  guard compares `Origin` against `CORS_ORIGINS`. Tests may use
  `Authorization: Bearer`.
- **Guest chat:** signed HttpOnly cookie `ccai_guest` bound to a Citizen row;
  returning guests reuse the same citizen across conversations.
- **Tracking:** tokens stored as hashes (`trackingHash`); identical 404 for
  unknown ID and unknown token.
- **Escalation:** rules (category/priority → hours) evaluated when complaints
  are read/updated; breach → `ESCALATED` + notification.
- **Rate limiting** on auth, chat, track and admin routes; helmet security
  headers; 256 kB JSON limit; 5 MB uploads (image types only).

### ai-service/ (Python 3.11 + FastAPI)
- `app/api/routes/{ai,health}.py` — `/health` is public; AI routes require
  `X-Service-Key`.
- `app/services/` — `classifier.py` (15 categories), `emergency.py` (112
  guidance patterns + severity), `chat.py` (state machine: one question per
  turn, confirmation before registration), `language.py` (en/kn/hi),
  `routing.py` (department suggestion), `llm.py` (openai-compatible provider).
- Provider selected by `AI_PROVIDER`; the demo provider is deterministic and
  offline so the whole platform runs with zero credentials.

### Data model (Prisma, `backend/prisma/schema.prisma`)
`User` (4 roles) · `Citizen` · `Complaint` (public `complaintId`
`CCAI-YYYY-NNNNNN`, category, priority, status, district/taluk, jurisdiction,
department, AI fields, `trackingHash`, `isDemo`) · `Assignment` ·
`ComplaintUpdate` (public vs internal kinds) · `Notification` ·
`EscalationRule` · `AuditLog` · `Attachment` · `Department` · `Category` ·
`Jurisdiction` (state → district → taluk) · `Counter` (ID sequence).

## Request lifecycle (citizen reports an issue)

1. `POST /api/chat/conversations` → conversation (guest cookie issued).
2. `POST /api/chat/conversations/:id/messages` → backend calls Python; Python
   asks **one question per turn** (language → category → location → details).
3. When all slots are filled Python returns a *confirmation summary*; nothing
   is written yet.
4. `POST /api/chat/conversations/:id/confirm` → backend validates the AI's
   routing suggestion against the catalog, creates the `Complaint`, assigns the
   department, writes audit + notifications, returns `CCAI-YYYY-NNNNNN` +
   tracking token **once**.
5. Emergency turns short-circuit: Python flags emergency, chat surfaces
   “call 112”, no dispatch is claimed.
6. Citizen tracks via `POST /api/track` (token, no login required); staff work
   the queue in `/dashboard`, transitions validated against
   `STATUS_TRANSITIONS`.

## Security model

| Concern        | Mechanism                                                    |
| -------------- | ------------------------------------------------------------ |
| Sessions       | httpOnly, SameSite=Lax cookie; `Secure` when `NODE_ENV=production` |
| CSRF           | Origin allowlist (`CORS_ORIGINS`) on state-changing requests  |
| Passwords      | bcrypt                                                       |
| Enumeration    | identical 404 for unknown complaint ID / tracking token      |
| Internal calls | `X-Service-Key` (constant-time compare) on the Python service |
| Uploads        | MIME allowlist, 5 MB cap, stored outside the web root, served via `/uploads` |
| Rate limiting  | express-rate-limit on auth/chat/track/admin                   |
| Headers        | helmet security headers                                      |
| Secrets        | environment only; `.env` gitignored                          |
