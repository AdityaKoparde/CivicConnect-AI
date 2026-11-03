# Deployment Guide

CivicConnect AI is four services that must run together:

| Service     | Stack                      | Port             | Needs                      |
| ----------- | -------------------------- | ---------------- | -------------------------- |
| `frontend`  | React/Vite build on nginx  | `8080` (public)  | backend                    |
| `backend`   | Node.js 22 + Express + Prisma | `4000`        | PostgreSQL, AI service     |
| `ai`        | Python 3.11+ FastAPI/uvicorn | `8000` (internal only) | backend (via `X-Service-Key`) |
| `db`        | PostgreSQL 16              | `5432` (internal only) | –                    |

Pick **one** path:

- **[A. Docker Compose](#a-docker-compose-recommended)** — one command, works on any VPS. Recommended.
- **[B. Production VPS with HTTPS](#b-production-on-a-vps-step-by-step)** — A plus TLS, firewall, backups.
- **[C. Managed platforms](#c-managed-platforms-render-railway-flyio)** — Render/Railway/Fly.io.
- **[D. Manual without Docker](#d-manual-no-docker)** — Node + Python + Postgres installed directly.

The stack is **not** deployable to Cloudflare Pages/Workers, Vercel or Netlify: those
platforms do not run a long-lived Node server, a Python process, or PostgreSQL.
You need a container host or a VM.

---

## 0. Before you deploy

**Prerequisites (local Docker path)**

- Docker Engine 24+ with Compose v2 (`docker compose version` must print v2.x)
- 2 GB RAM free, ~2 GB disk for images
- Ports `8080` (UI) and optionally `4000` (API) free

**Prerequisites (manual path)** — Node.js 20+, Python 3.11+, PostgreSQL 14+ (16 recommended).

**What you must supply for any deployment**

| Secret             | How to generate                    | Why                                |
| ------------------ | ---------------------------------- | ---------------------------------- |
| `JWT_SECRET`       | `openssl rand -hex 32`             | signs session cookies              |
| `AI_SERVICE_KEY`   | `openssl rand -hex 32`             | authenticates Node → Python calls  |
| `POSTGRES_PASSWORD`| `openssl rand -base64 24`          | database password                  |

A cloud LLM is **optional**. With `AI_PROVIDER=demo` (the default) the built-in
engine handles classification, translation and the chatbot entirely offline — no
API key, no cost, no network egress — and responses are labelled `demo`. Set
`AI_PROVIDER=openai` + `OPENAI_API_KEY` when you want cloud LLM classification;
responses are then labelled `openai`.

---

## A. Docker Compose (recommended)

### A1. Get the code and create the env file

```bash
git clone <your-repo-url> civicconnect && cd civicconnect
cp .env.example .env
```

Generate the three secrets and paste them into `.env`:

```bash
openssl rand -hex 32     # → JWT_SECRET
openssl rand -hex 32     # → AI_SERVICE_KEY  (same value for ai + backend; compose wires it)
openssl rand -base64 24  # → POSTGRES_PASSWORD
```

Minimal `.env` for a same-origin deployment:

```dotenv
NODE_ENV=development            # switch to production once HTTPS is in place (see B6)
POSTGRES_PASSWORD=<generated>
JWT_SECRET=<generated>
AI_SERVICE_KEY=<generated>
FRONTEND_ORIGIN=http://localhost:8080
CORS_ORIGINS=http://localhost:8080
FRONTEND_PORT=8080
AI_PROVIDER=demo
```

> `FRONTEND_ORIGIN` and `CORS_ORIGINS` must be the **exact** origin the browser
> uses (scheme + host + port, no trailing slash). They power the CSRF check and
> CORS. A mismatch produces `403 FORBIDDEN "Request origin is not allowed"`.

### A2. Start everything

```bash
docker compose up --build -d
docker compose ps                  # all four services should be running
docker compose logs -f backend     # watch migrate + seed + start
```

The backend container runs, on every start:

```bash
npx prisma migrate deploy   # applies pending migrations (idempotent)
npx prisma db seed          # baseline data via upserts (idempotent, safe to re-run)
node dist/server.js
```

First boot takes ~1–2 minutes (image builds, Prisma generate, seed).

### A3. Verify

```bash
curl -s http://localhost:4000/api/health
# {"status":"ok","database":"up","ai":"up","aiProvider":"demo","version":"1.0.0"}
```

Open <http://localhost:8080> — the landing page should render, and
`/api` is proxied same-origin by nginx so cookies work without CORS.

### A4. Sign in

The seed creates one Super Admin — `admin@civicconnect.demo`, default password
`Demo@12345` — plus a triage lead, two department admins, four officers and two
citizens, all with the same default password. The authoritative list of emails,
roles and jurisdictions is [`backend/prisma/seed.ts`](../backend/prisma/seed.ts).

Treat that password as a placeholder: rotate it (section B8) before anyone real
uses the deployment, and deactivate the accounts you do not need.

### A5. Stop / inspect

```bash
docker compose logs -f            # all logs
docker compose restart backend    # restart one service
docker compose down               # stop (data survives in named volumes)
docker compose down -v            # stop AND delete database + uploads
```

---

## B. Production on a VPS (step by step)

Assumes Ubuntu 22.04/24.04, a domain you control, and a fresh server.

### B1. Server sizing and firewall

2 vCPU / 2 GB RAM is enough for a district-scale pilot.

```bash
sudo apt update && sudo apt upgrade -y
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

Do **not** expose `4000` (API) or `5432` (Postgres) publicly. The shipped compose
file publishes `4000` for convenience; in production remove that `ports:` mapping
on `backend` so only nginx reaches it (see B7).

### B2. Install Docker

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER && newgrp docker
docker compose version
```

### B3. DNS

Create an `A` record (and `AAAA` if you have IPv6) for e.g.
`civic.example.org` pointing at the server's public IP. Wait for propagation:

```bash
dig +short civic.example.org
```

### B4. Deploy the code

```bash
git clone <your-repo-url> /opt/civicconnect && cd /opt/civicconnect
# or: unzip civicconnect-ai.zip -d /opt/civicconnect && cd /opt/civicconnect
cp .env.example .env && nano .env     # set the three secrets
```

`.env` for the domain (still HTTP for now — TLS in B6):

```dotenv
NODE_ENV=development
POSTGRES_PASSWORD=<generated>
JWT_SECRET=<generated>
AI_SERVICE_KEY=<generated>
FRONTEND_ORIGIN=https://civic.example.org
CORS_ORIGINS=https://civic.example.org
FRONTEND_PORT=8080
AI_PROVIDER=demo
```

### B5. Build and start

```bash
docker compose up --build -d
docker compose ps
curl -s localhost:4000/api/health
curl -sI localhost:8080 | head -3
```

### B6. HTTPS (required before switching to production mode)

The backend marks the session cookie `Secure` when `NODE_ENV=production`. Over
plain HTTP that cookie is silently dropped by browsers → login appears to
succeed but every subsequent request is anonymous. So: **TLS first, then flip
the flag.**

Caddy is the shortest path (automatic Let's Encrypt certificates):

```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install -y caddy
```

`/etc/caddy/Caddyfile`:

```caddyfile
civic.example.org {
    encode gzip
    reverse_proxy 127.0.0.1:8080
}
```

```bash
sudo systemctl reload caddy && sudo systemctl status caddy --no-pager
```

Then enable production cookies:

```bash
sed -i 's/^NODE_ENV=.*/NODE_ENV=production/' .env
docker compose up -d backend
```

**nginx + Certbot alternative**

```nginx
server {
  listen 80;
  server_name civic.example.org;
  client_max_body_size 6m;

  location / {
    proxy_pass http://127.0.0.1:8080;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

```bash
sudo apt install -y nginx certbot python3-certbot-nginx
sudo ln -s /etc/nginx/sites-available/civic /etc/nginx/sites-enabled/civic
sudo certbot --nginx -d civic.example.org
sudo nginx -t && sudo systemctl reload nginx
```

> `client_max_body_size` must be ≥ `UPLOAD_MAX_BYTES` (default 5 MB), otherwise
> attachment uploads fail at the proxy with `413`.

### B7. Lock down the API port

In `docker-compose.yml`, remove the published port from `backend`:

```yaml
  backend:
    # ports:
    #   - "4000:4000"
```

Then `docker compose up -d`. The API is still reachable from the frontend
container over the compose network and from the host only via `127.0.0.1:8080`.

### B8. Harden the seeded accounts

Every seeded account shares a publicly documented password. Do this before
inviting real users. All calls need the `Origin` header because the session is a
cookie (and the API rejects cookie-auth mutations without it):

```bash
API=https://civic.example.org/api

# 1. sign in as the seeded super admin
curl -s -c jar.txt -X POST $API/auth/login \
  -H 'Content-Type: application/json' -H "Origin: https://civic.example.org" \
  -d '{"email":"admin@civicconnect.demo","password":"Demo@12345"}'

# 2. find your own user id
curl -s -b jar.txt $API/auth/me -H "Origin: https://civic.example.org"
```

**Option 1 — rotate the seeded admin's password** (fastest):

```bash
curl -s -b jar.txt -X PATCH $API/admin/officers/<your-user-id> \
  -H 'Content-Type: application/json' -H "Origin: https://civic.example.org" \
  -d '{"password":"<a strong new password>"}'
```

**Option 2 — create your own admin, then retire the seeded ones**:

```bash
# list departments to get a departmentId
curl -s -b jar.txt $API/departments -H "Origin: https://civic.example.org"

# create your account (officers are created as DEPARTMENT_ADMIN first)
curl -s -b jar.txt -X POST $API/admin/officers \
  -H 'Content-Type: application/json' -H "Origin: https://civic.example.org" \
  -d '{"name":"Your Name","email":"you@example.org","password":"<strong>","role":"DEPARTMENT_ADMIN","departmentId":"<uuid>"}'

# promote it to SUPER_ADMIN
curl -s -b jar.txt -X PATCH $API/admin/officers/<new-user-id> \
  -H 'Content-Type: application/json' -H "Origin: https://civic.example.org" \
  -d '{"role":"SUPER_ADMIN"}'
```

Then disable the seeded logins (they stay linked to seeded complaints, so
deactivate rather than delete):

```bash
docker compose exec db psql -U postgres -d civicconnect -c \
  "UPDATE \"User\" SET \"isActive\" = false
   WHERE email LIKE '%@civicconnect.demo'
     AND email NOT IN ('admin@civicconnect.demo');"
```

Seeded complaint data is flagged `isDemo` in the database, so it is always
distinguishable from real submissions (`/api/admin/stats` and the dashboards
report the split).

### B9. Verify the live deployment

```bash
BASE=https://civic.example.org

curl -s $BASE/api/health                       # status/database/ai all "ok"
curl -s -o /dev/null -w '%{http_code}\n' $BASE # 200 (SPA)
curl -s -o /dev/null -w '%{http_code}\n' $BASE/api/admin/audit  # 401 signed out
```

Browser walkthrough:

1. Landing page renders all sections.
2. **Report an issue** → chatbot asks one question at a time → answer in English,
   Kannada or Hindi → review summary → explicit confirm → get `CCAI-YYYY-NNNNNN`
   and a tracking token (shown once).
3. **Track** with the ID + token → status timeline.
4. Sign in as an officer → dashboard charts (Recharts) and map (Leaflet) render;
   assign/update a complaint.
5. Reload mid-chat — the conversation and answers persist.

A fresh complaint ID should be visible to the right department for its
jurisdiction only; a wrong tracking token and an unknown ID must both return the
same generic `404`.

---

## C. Managed platforms (Render / Railway / Fly.io)

Compose does not run as-is on most PaaS, but the same four pieces map cleanly:

| Container  | Platform resource                          | Notes |
| ---------- | ------------------------------------------ | ----- |
| `db`       | managed PostgreSQL                         | copy its URL into `DATABASE_URL` |
| `backend`  | Docker service from `./backend`            | start command already migrates + seeds |
| `ai`       | Docker service from `./ai-service`         | **private/internal** only |
| `frontend` | Docker service from `./frontend`           | public; nginx serves the SPA |

Environment for the backend service:

```dotenv
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@host:5432/db?schema=public
JWT_SECRET=<generated>
JWT_EXPIRES_IN=43200
AI_SERVICE_URL=http://<ai-service-internal-host>:8000
AI_SERVICE_KEY=<generated>
FRONTEND_ORIGIN=https://<your-frontend-domain>
CORS_ORIGINS=https://<your-frontend-domain>
UPLOAD_DIR=uploads
UPLOAD_MAX_BYTES=5242880
```

Environment for the AI service: `AI_SERVICE_KEY` (same value), `AI_PROVIDER`,
and `OPENAI_API_KEY` only if `AI_PROVIDER=openai`.

Health check path for both services: `/api/health` (backend) and `/health` (AI).

**Important — same-origin matters.** The shipped nginx image proxies `/api` to a
host named `backend` inside the compose network. On a PaaS where the frontend and
backend are separate public services, that host does not resolve, so either:

1. **Keep one origin (simplest):** point a single domain at the frontend service
   and add a path route `/api/*` → backend service (Render/Railway both support
   rewrite rules), leaving `VITE_API_BASE_URL=/api` as built; or
2. **Split origins:** rebuild the frontend with
   `--build-arg VITE_API_BASE_URL=https://api.example.org/api` and set
   `FRONTEND_ORIGIN`/`CORS_ORIGINS` to `https://civic.example.org`. Cookies are
   `SameSite=Lax`, so both hostnames must be subdomains of the same site
   (`civic.example.org` + `api.example.org`) for the session cookie to be sent.

Render/Railway do not provide a persistent disk by default: attach one for
`/app/uploads`, or attachments disappear on redeploy (the database keeps only
their metadata).

---

## D. Manual (no Docker)

```bash
npm run install:all        # root + backend + frontend deps + Python venv
cp .env.example .env       # plus backend/.env and ai-service/.env
# point DATABASE_URL at your PostgreSQL, then:
npm run db:setup           # creates the database if needed, migrates, seeds
npm run dev                # backend :4000, AI :8000, frontend :5173
```

`npm run db:setup` expects a reachable PostgreSQL. Example using a local server:

```bash
createdb -h 127.0.0.1 -p 5432 -U postgres civicconnect
createdb -h 127.0.0.1 -p 5432 -U postgres civicconnect_test   # only for tests
```

Production-ish run without containers:

```bash
npm run build                                # backend tsc + frontend vite build
npm run db:deploy --prefix backend           # prisma migrate deploy
node backend/dist/server.js                  # API on :4000
./ai-service/.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Serve `frontend/dist` with any static server and proxy `/api` and `/uploads` to
`:4000` on the same origin (nginx config in `frontend/nginx.conf` is a working
example). Run the API and AI processes under `systemd` or `pm2` so they restart
on boot.

---

## Environment variable reference

### Shared / backend

| Variable            | Default                        | Purpose |
| ------------------- | ------------------------------ | ------- |
| `NODE_ENV`          | `development`                  | `production` enables `Secure` cookies (HTTPS required) |
| `DATABASE_URL`      | –                              | PostgreSQL connection string (**required**) |
| `BACKEND_PORT`      | `4000`                         | API port |
| `JWT_SECRET`        | `change-me…`                   | cookie signing key — **change** |
| `JWT_EXPIRES_IN`    | `43200`                        | session lifetime, seconds (12 h) |
| `FRONTEND_ORIGIN`   | `http://localhost:5173`        | canonical UI origin |
| `CORS_ORIGINS`      | `http://localhost:5173,…`      | comma-separated allowed browser origins (CSRF + CORS) |
| `AI_SERVICE_URL`    | `http://localhost:8000`        | where the backend finds the AI service |
| `AI_SERVICE_KEY`    | `ccai-internal-service-key-demo` | shared key sent as `X-Service-Key` — **change** |
| `UPLOAD_DIR`        | `uploads`                      | attachment storage directory |
| `UPLOAD_MAX_BYTES`  | `5242880`                      | max attachment size (5 MB) |
| `TEST_DATABASE_URL` | –                              | test-only database |

### AI service

| Variable                  | Default                | Purpose |
| ------------------------- | ---------------------- | ------- |
| `AI_SERVICE_PORT`         | `8000`                 | listen port |
| `AI_SERVICE_KEY`          | demo key               | must equal the backend's value |
| `AI_PROVIDER`             | `demo`                 | `demo` (offline) or `openai` |
| `OPENAI_API_KEY`          | –                      | only for `AI_PROVIDER=openai` |
| `OPENAI_BASE_URL`         | `https://api.openai.com/v1` | any OpenAI-compatible endpoint |
| `OPENAI_MODEL`            | `gpt-4o-mini`          | model name |
| `AI_LLM_TIMEOUT_SECONDS`  | `20`                   | per-request timeout |
| `AI_GATEWAY_ENABLED`      | `false`                | route cloud calls through the in-process gateway (retries + fallback) |
| `AI_GATEWAY_FALLBACK_MODEL` | –                    | spare model used when the primary keeps failing |
| `AI_GATEWAY_CONFIG`       | –                      | optional custom `gateway.toml` |
| `AI_MAX_TEXT_CHARS`       | `4000`                 | input truncation limit |

### Frontend (build time)

| Variable             | Default                  | Purpose |
| -------------------- | ------------------------ | ------- |
| `VITE_API_BASE_URL`  | `http://localhost:4000/api` | API base the browser calls; `/api` in the container build (same origin) |

---

## Operations

**Logs**

```bash
docker compose logs -f backend        # structured JSON lines
docker compose logs -f ai
```

**Update to a new version**

```bash
git pull
docker compose up --build -d          # migrations run automatically on start
```

**Backup / restore**

```bash
docker compose exec -T db pg_dump -U postgres -Fc civicconnect > backup-$(date +%F).dump
cat backup-2026-11-03.dump | docker compose exec -T db pg_restore -U postgres -d civicconnect --clean
docker run --rm -v civicconnect_uploads:/data -v "$PWD":/backup alpine \
  tar czf /backup/uploads-$(date +%F).tgz -C /data .
```

**Rotate the session secret** — invalidates every logged-in session (users must
sign in again):

```bash
sed -i "s/^JWT_SECRET=.*/JWT_SECRET=$(openssl rand -hex 32)/" .env
docker compose up -d backend
```

**Disk growth** — the `pgdata` and `uploads` volumes are the only stateful parts;
images are prunable with `docker system prune -f`.

---

## Troubleshooting

| Symptom | Cause | Fix |
| ------- | ----- | --- |
| `403 FORBIDDEN "Request origin is not allowed"` | browser origin not in `CORS_ORIGINS` | add the exact scheme+host+port; restart backend |
| `403 "Missing Origin header for cookie-authenticated request"` | curl/API client using cookies without `Origin` | send `-H "Origin: https://your.domain"`, or use a Bearer token |
| Login returns 200 but the session is immediately lost | `NODE_ENV=production` over plain HTTP → `Secure` cookie dropped | serve over HTTPS, or temporarily set `NODE_ENV=development` |
| `/api/health` reports `ai: "down"` | AI container not started / wrong URL or key | `docker compose ps ai`, `docker compose logs ai`, check `AI_SERVICE_KEY` matches |
| `502` from nginx on `/api/*` | backend crashed or still migrating | `docker compose logs backend` |
| `413` on upload | proxy body limit below upload size | raise `client_max_body_size` / `UPLOAD_MAX_BYTES` |
| Blank page, console `404` on `/api` | built for a different API base | rebuild with the correct `VITE_API_BASE_URL` |
| `port is already allocated` | 8080/4000 in use | set `FRONTEND_PORT`, or stop the other process |
| Chat loses answers after reload | cookies blocked (third-party/incognito strict) | serve UI and API on the same site; keep `SameSite=Lax` |
| Track always `404` | wrong token **or** unknown ID — intentionally identical | re-check the token shown at registration; this is anti-enumeration by design |
| `prisma migrate` fails on start | database unreachable / bad `DATABASE_URL` | `docker compose logs db`, verify credentials |

---

## Security checklist before real use

- [ ] `JWT_SECRET`, `AI_SERVICE_KEY`, `POSTGRES_PASSWORD` replaced with generated values
- [ ] `.env` never committed (already in `.gitignore`); injected from a secret store
- [ ] HTTPS enabled and `NODE_ENV=production` (secure cookies)
- [ ] Seeded accounts deactivated or re-passworded (section B8)
- [ ] Postgres and the AI service not reachable from the internet
- [ ] Backups scheduled (database + uploads volume) and restore tested
- [ ] `UPLOAD_MAX_BYTES` matches your reverse-proxy body limit
- [ ] Log monitoring on `docker compose logs` or your platform's log drain
- [ ] Reminder in your own runbook: the app never claims official government
      submission and never claims that emergency services were dispatched

---

## What was verified in this workspace

Run at the final commit, in this environment:

- `npm test` → **88 tests green**: 46 Python (`pytest`), 39 backend
  (`vitest` + `supertest`, covering the 8 spec scenarios), 3 frontend (`vitest`).
- `npm run build` → backend `tsc` clean, frontend `tsc --noEmit` + `vite build`
  (866 kB JS / 30.75 kB CSS).
- Live end-to-end smoke against the real processes: health (`database:up`,
  `ai:up`, `aiProvider:demo`), admin login, guest chat, one-question-per-turn
  flow, explicit confirmation, registration (`CCAI-2026-000015`), jurisdiction
  routing, token shown once, tracking to `ASSIGNED`, and byte-identical `404`s
  for a wrong token vs. an unknown ID.
- `docker compose config` validates (schema, interpolation, health-check
  dependency order).

**Not verified here:** the container images were not built or run — this
workspace has no Docker socket access (permission denied, no root). The compose
file and both Dockerfiles are reviewed and schema-validated, but expect a normal
first-build cycle (`docker compose up --build`) on your host. Likewise, TLS,
DNS, and a real cloud provider key were not exercised.
