# CivicConnect AI — API Documentation (Authoritative Contract)

This document is the single source of truth for every HTTP interface in CivicConnect AI.
The frontend, the Node.js backend and the Python AI service must all conform to it.

**Version:** 1.0
**Last updated:** 2026-11-02

---

## 1. Conventions

### 1.1 Base URLs

| Service | Base URL | Consumer |
|---|---|---|
| Node.js backend (public API) | `http://localhost:4000/api` | Browser frontend |
| Python AI service (internal) | `http://localhost:8000` | Node.js backend only |
| Frontend dev server | `http://localhost:5173` | — |

The frontend reads the backend base URL from `import.meta.env.VITE_API_BASE_URL`
(default `http://localhost:4000/api`).

### 1.2 Authentication

* Session = signed JWT stored in an **httpOnly, SameSite=Lax cookie** named `ccai_token`.
* The browser must send requests with `credentials: 'include'`.
* The backend never returns the token in a JSON body.
* **CSRF defence:** every state-changing request (POST/PATCH/PUT/DELETE) must carry an
  `Origin` header whose origin is in the configured allow-list (`CORS_ORIGINS`).
  Requests without an `Origin` header (curl, server-to-server) are allowed only when a
  valid `Authorization: Bearer <token>` header is present instead of the cookie.
* The internal Python service authenticates with the header `X-Service-Key: <AI_SERVICE_KEY>`.

### 1.3 Roles

| Role | Scope |
|---|---|
| `SUPER_ADMIN` | Everything: all complaints, departments, officers, audit logs, escalation rules |
| `DEPARTMENT_ADMIN` | Complaints + officers + departments of their own department |
| `DEPARTMENT_OFFICER` | Complaints assigned to their department/jurisdiction only; status updates, notes |
| `CITIZEN` | Own complaints, own chat conversations, tracking |

### 1.4 Response shapes

* **Success:** the resource object/array directly (no envelope), HTTP 2xx.
* **Error:** always

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "Human readable", "details": [] } }
```

Common error codes: `VALIDATION_ERROR` (400), `UNAUTHENTICATED` (401), `FORBIDDEN` (403),
`NOT_FOUND` (404), `CONFLICT` (409), `RATE_LIMITED` (429), `AI_SERVICE_ERROR` (502),
`INTERNAL_ERROR` (500).

### 1.5 Pagination

List endpoints accept `page` (default 1) and `limit` (default 20, max 100) and return:

```json
{ "items": [...], "total": 42, "page": 1, "limit": 20 }
```

---

## 2. Shared domain types

### 2.1 Complaint categories (canonical keys)

`road_damage`, `water_supply`, `drainage_sewage`, `garbage_collection`, `electricity`,
`streetlights`, `public_health`, `government_hospitals`, `public_transport`,
`road_safety`, `environmental_pollution`, `public_infrastructure`, `animal_welfare`,
`fire_emergency`, `other`

Each has labels `{ en, kn, hi }` served by `GET /api/categories`.

### 2.2 Complaint statuses

`SUBMITTED`, `ACKNOWLEDGED`, `ASSIGNED`, `IN_PROGRESS`, `AWAITING_CITIZEN_INFO`,
`RESOLVED`, `REJECTED`, `ESCALATED`

### 2.3 Priorities

`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`

### 2.4 Complaint ID format

`CCAI-<year>-<6 digits>` e.g. `CCAI-2026-000001`. Generated server-side in a DB
transaction from a per-year counter; unique index enforced.

### 2.5 AIUnderstanding (produced by Python, stored/forwarded by Node)

```json
{
  "original_text": "There is a huge pothole near my college in Mysuru.",
  "detected_language": "en",
  "normalized_description": "Large pothole near college entrance causing accident risk.",
  "category": "road_damage",
  "category_label": { "en": "Roads and Potholes", "kn": "ರಸ್ತೆ ಮತ್ತು ಗುಂಡಿಗಳು", "hi": "सड़क और गड्ढे" },
  "entities": {
    "district": "Mysuru", "taluk": null, "city": null, "ward": null,
    "landmark": "College entrance", "duration_days": null,
    "problem_type": "pothole", "safety_details": null
  },
  "priority": "high",
  "safety_risk": true,
  "emergency": false,
  "recommended_department": "Urban Local Body",
  "confidence": 0.91,
  "reasoning": "Complaint describes road surface damage near a landmark.",
  "requires_manual_review": false,
  "ai_provider": "demo"
}
```

`ai_provider` is `demo` (offline Python engine) or `openai` (cloud LLM) — it is never
falsely reported as cloud-generated.

---

## 3. Public endpoints (no auth)

### GET /api/health
→ `{ "status": "ok", "database": "up", "ai": "up"|"down", "aiProvider": "demo", "version": "1.0.0" }`

### GET /api/stats
Platform statistics from the database.
```json
{
  "totalComplaints": 128, "resolvedComplaints": 61, "pendingComplaints": 54,
  "activeDepartments": 21, "districtsCovered": 12,
  "isDemoData": true, "lastUpdated": "2026-11-02T10:00:00.000Z"
}
```

### GET /api/categories
→ `{ "items": [ { "key": "road_damage", "label": { "en": "...", "kn": "...", "hi": "..." }, "description": { "en": "..." }, "icon": "Construction", "active": true } ] }`

### GET /api/departments
Active departments.
→ `{ "items": [ { "id": "uuid", "code": "PWD-KA", "name": "Public Works Department (Roads)", "type": "PWD", "description": "...", "categories": ["road_damage"], "jurisdictionLevel": "STATE", "district": null, "isDemo": false, "active": true, "jurisdictions": [...] } ] }`

### GET /api/departments/:id → `{ "department": {...} }`

### GET /api/jurisdictions?level=DISTRICT&district=Mysuru
→ `{ "items": [ { "id", "level": "STATE|DISTRICT|TALUK|LOCAL_BODY|WARD", "name": "Mysuru", "code": "KA-MYS", "parentId": "uuid|null", "district": "Mysuru", "taluk": null, "isDemo": true } ] }`

### POST /api/track  (public complaint tracking; rate-limited)
Request: `{ "complaintId": "CCAI-2026-000001", "trackingToken": "…raw token…" }`
(`trackingToken` may be omitted when the caller is logged in and owns the complaint.)
Success 200:
```json
{
  "complaint": {
    "complaintId": "CCAI-2026-000001", "status": "IN_PROGRESS",
    "category": "road_damage", "categoryLabel": { "en": "Roads and Potholes", "kn": "...", "hi": "..." },
    "priority": "HIGH", "district": "Mysuru", "city": null, "landmark": "College gate",
    "departmentName": "Mysuru City Corporation", "submittedAt": "...", "resolvedAt": null,
    "language": "en",
    "history": [ { "status": "SUBMITTED", "note": null, "at": "...", "byRole": "SYSTEM" } ],
    "publicUpdates": [ { "kind": "NOTE", "note": "Site inspection scheduled.", "at": "..." } ]
  }
}
```
Wrong ID **or** wrong token **or** no access → `404 NOT_FOUND` (identical response, no
enumeration). Internal notes, citizen PII and officer identities are never returned.

### GET /api/files/:id
Serve an attachment (auth required; owner of the conversation/complaint or staff).

---

## 4. Authentication endpoints

### POST /api/auth/register
`{ "email": "...", "password": "min 8 chars", "name": "Full Name", "phone": "optional" }`
→ 201 `{ "user": UserView }` and sets the session cookie.

### POST /api/auth/login
`{ "email": "...", "password": "..." }` → `{ "user": UserView }`
Invalid credentials → 401 `UNAUTHENTICATED`.

### POST /api/auth/logout → `{ "ok": true }`

### GET /api/auth/me → `{ "user": UserView }` or 401

```ts
UserView = {
  id: string; email: string; name: string; role: "SUPER_ADMIN"|"DEPARTMENT_ADMIN"|"DEPARTMENT_OFFICER"|"CITIZEN";
  phone: string | null; departmentId: string | null; departmentName: string | null;
  jurisdictionId: string | null; isActive: boolean; createdAt: string;
}
```

---

## 5. Chat endpoints (conversation workflow)

State lives in the `Conversation` row → the page can reload without losing context.

### POST /api/chat/conversations
`{ "language": "kn"|"en"|"hi"|null }` → 201
`{ "conversation": { "id", "language", "status": "ACTIVE", "state": ConversationState, "createdAt" } }`

```ts
ConversationState = {
  slots: { description?, district?, taluk?, city?, ward?, landmark?, category?,
           priority?, problem_type?, duration_days?, safety_concern?, location?,
           attachments?: { id, url, filename }[] },
  missing: string[];            // slot keys still needed
  understanding: AIUnderstanding | null;
  turn: number;
  emergencyHandled: boolean;
}
```

### GET /api/chat/conversations/:id
→ `{ "conversation": {...}, "messages": [ { "id", "role": "user"|"assistant", "content", "language", "createdAt", "meta": object|null } ] }`
404 if not owned by the caller (staff may not read citizens' conversations).

### POST /api/chat/conversations/:id/messages
`{ "content": "...", "attachments": [{ "id", "url", "filename" }]? , "location": { "latitude", "longitude", "label"? }? }`

Response 200:
```json
{
  "userMessage": { "id", "role": "user", "content", "createdAt" },
  "assistantMessage": { "id", "role": "assistant", "content": "…reply in preferred language…", "language": "kn", "createdAt" },
  "understanding": { ...AIUnderstanding | null },
  "nextAction": "ASK_LOCATION|ASK_CATEGORY|ASK_CONFIRM|CLARIFY|EMERGENCY|SMALLTALK|REGISTER",
  "needsConfirmation": false,
  "confirmationSummary": null,
  "emergency": { "isEmergency": false, "guidance": null, "callNumber": "112" },
  "missingSlots": ["district"],
  "suggestedReplies": ["ನನ್ನ ಜಿಲ್ಲೆ ಮೈಸೂರು", "ಹೌದು"],
  "state": { ...ConversationState },
  "aiProvider": "demo"
}
```

Rules enforced by the backend:
* Emergency detected → reply contains 112 guidance; no dispatch is ever claimed.
* The complaint is **only** created by the explicit confirm call below.
* Low AI confidence (`understanding.requires_manual_review`) → after confirmation the
  complaint is created with `requiresManualReview=true` and routed to the triage queue.

### POST /api/chat/conversations/:id/confirm
`{ "confirm": true }` → 201
```json
{
  "complaint": {
    "id": "uuid", "complaintId": "CCAI-2026-000001", "status": "ASSIGNED",
    "category": "road_damage", "priority": "HIGH",
    "departmentName": "Mysuru City Corporation", "departmentCode": "ULB-MYS",
    "routingExplanation": "AI category road_damage (confidence 0.91) matched Mysuru local body jurisdiction...",
    "requiresManualReview": false, "emergency": false, "createdAt": "..."
  },
  "trackingToken": "raw-token-shown-once",
  "conversationId": "uuid"
}
```
`{ "confirm": false }` → 200 `{ "conversation": {...} }` (bot re-opens editing).

### POST /api/chat/conversations/:id/cancel → `{ "conversation": { "status": "ABANDONED" } }`

---

## 6. Complaint management (staff, role-scoped)

### GET /api/complaints
Query: `search, category, departmentId, district, priority, status, page, limit, sort`
`search` matches complaintId or text. Officers only receive complaints of their
department/jurisdiction.
→ `{ items: ComplaintSummary[], total, page, limit }`

```ts
ComplaintSummary = {
  id, complaintId, category, priority, status, district, city, landmark,
  departmentId, departmentName, officerName, aiConfidence, requiresManualReview,
  emergency, safetyRisk, language, createdAt, updatedAt, resolvedAt,
  citizenName (staff only), isDemo
}
```

### GET /api/complaints/:id
→ `{ complaint: ComplaintDetail, updates: ComplaintUpdateView[], attachments: [...], assignments: [...] }`
403 when the complaint is outside the officer's department scope.
`ComplaintDetail` adds: `originalText, normalizedText, summary, aiReasoning, aiProvider,
routingExplanation, trackingHashPresent, jurisdiction*, duplicateOfComplaintId,
resolutionNote, auditTrail (super admin only)`.

### PATCH /api/complaints/:id/status
`{ "status": "IN_PROGRESS", "note": "optional public note" }`
Allowed transitions validated (e.g. RESOLVED requires a resolution note via updates).
Runs escalation-rule evaluation, writes status history + notification + audit log.

### PATCH /api/complaints/:id/assign
`{ "departmentId": "uuid"?, "officerId": "uuid"?, "note": "..." }` → reassignment history,
notification to new officer, audit log. Super admin / department admin only.

### POST /api/complaints/:id/updates
`{ "kind": "NOTE|INFO_REQUEST|RESOLUTION|ESCALATION|DUPLICATE_LINK", "note": "text",
   "resolutionNote": "required when kind=RESOLUTION" }`
`NOTE` = internal (not shown to citizen tracking), `INFO_REQUEST` + `RESOLUTION` +
`ESCALATION` are public. Resolution sets `status=RESOLVED` and `resolvedAt`.

### POST /api/complaints/:id/duplicate
`{ "duplicateOfId": "CCAI-2026-000042" }` → links duplicates **without deleting** either report.

### GET /api/map/points?scope=admin|public&category=&status=
* `scope=public` (no auth): district-level aggregation only —
  `{ "points": [ { "district", "category", "status", "priority", "count", "latitude", "longitude" } ] }`
  Coordinates are district centroids; no citizen-identifying data.
* `scope=admin` (staff): per-complaint points `{ complaintId, category, status, priority,
  district, latitude, longitude, departmentName }` for complaints visible to the caller.

---

## 7. Admin & analytics endpoints

All under `/api/admin/*`, authenticated; scope enforced per role.

### GET /api/admin/stats
```json
{
  "overview": { "total": 128, "newLast24h": 9, "pending": 30, "inProgress": 24,
                 "resolved": 61, "escalated": 5, "critical": 4, "awaitingCitizen": 8 },
  "byCategory":  [ { "key": "road_damage", "label": "Roads and Potholes", "count": 31 } ],
  "byDepartment":[ { "id": "uuid", "name": "...", "count": 20 } ],
  "byDistrict":  [ { "district": "Mysuru", "count": 18 } ],
  "monthly":     [ { "month": "2026-06", "total": 12, "resolved": 7 } ],
  "priorityDistribution": [ { "priority": "HIGH", "count": 22 } ],
  "pendingTrend":[ { "date": "2026-10-01", "pending": 40 } ],
  "resolutionRate": 0.47,
  "isDemoData": true
}
```

### GET /api/admin/officers?departmentId=
### POST /api/admin/officers  `{ name, email, password, role, departmentId?, jurisdictionId? }`
### PATCH /api/admin/officers/:id  `{ isActive?, departmentId?, jurisdictionId?, role?, name? }`
Officer accounts are users with role `DEPARTMENT_OFFICER`/`DEPARTMENT_ADMIN`.

### Department CRUD (super admin / dept admin)
* `POST /api/departments` `{ code, name, type, description?, categories[], jurisdictionLevel, district?, parentId?, contactEmail? }`
* `PATCH /api/departments/:id` (same fields, partial)
* `DELETE /api/departments/:id` → soft-deactivate (`active=false`)

### Category CRUD (super admin): `POST /api/categories`, `PATCH /api/categories/:key`
### Jurisdiction CRUD (super admin): `POST /api/jurisdictions`, `PATCH /api/jurisdictions/:id`, `DELETE` (soft)

### Escalation rules
`GET /api/admin/escalation-rules`, `POST`, `PATCH /:id`, `DELETE /:id`
Rule = `{ id, name, category?, priority?, hoursToEscalate, targetDepartmentId?, active }`.
Evaluated automatically whenever a complaint stays longer than `hoursToEscalate`
in a non-terminal state → status becomes `ESCALATED` + notification.

### GET /api/admin/audit?page=&limit= (super admin only)
→ `{ items: [ { id, actorEmail, action, entityType, entityId, metadata, ip, createdAt } ], total }`

---

## 8. Notifications

### GET /api/notifications?unreadOnly=&limit= → `{ items: [ { id, type, title, body, complaintId, readAt, createdAt } ], unreadCount }`
Visible to the logged-in user (staff get notifications for their scope; citizens for their own complaints).

### POST /api/notifications/read  `{ "ids": ["uuid"] | "all" }` → `{ unreadCount }`

Types: `COMPLAINT_SUBMITTED`, `ASSIGNED`, `REASSIGNED`, `STATUS_CHANGED`,
`INFO_REQUESTED`, `RESOLVED`, `ESCALATED`.

---

## 9. File uploads

### POST /api/files  (multipart, field `file`)
Auth required. Allowed: `image/png|jpeg|webp|gif`, max 5 MB.
→ `{ "id": "uuid", "url": "/api/files/<uuid>", "filename": "IMG_1234.jpg", "mimeType": "...", "size": 123456 }`
Rejections: 400 `VALIDATION_ERROR` with message, 413 for oversize.

---

## 10. Python AI service (internal only)

All requests carry `X-Service-Key: <AI_SERVICE_KEY>`; missing/wrong key → 401.
All endpoints validate with Pydantic; failures return the standard error envelope.

| Endpoint | Request | Response |
|---|---|---|
| `GET /health` | — | `{ "status": "ok", "provider": "demo", "models": ["tfidf-nb", "rules"] }` |
| `POST /api/v1/ai/detect-language` | `{ "text" }` | `{ "language", "confidence", "supported" }` |
| `POST /api/v1/ai/classify-complaint` | `{ "text", "language"? }` | AIUnderstanding (no entities/priority filled unless present) |
| `POST /api/v1/ai/extract-entities` | `{ "text", "language"? }` | `{ "entities": {...} }` |
| `POST /api/v1/ai/translate` | `{ "text", "target_language", "source_language"? }` | `{ "original_text", "translated_text", "source_language", "target_language", "provider" }` |
| `POST /api/v1/ai/assess-priority` | `{ "text", "language"?, "entities"?, "safety_risk"? }` | `{ "priority", "score", "factors": [...] }` |
| `POST /api/v1/ai/recommend-department` | `{ "category", "entities"?, "district"? }` | `{ "recommended_department", "reasoning", "confidence" }` |
| `POST /api/v1/ai/chat` | ChatRequest (below) | ChatResponse (below) |

### ChatRequest
```json
{
  "message": " citizen text ",
  "language": "kn|en|null",            // preferred language (manual selection honoured)
  "history": [ { "role": "user|assistant", "content": "..." } ],   // last 10 turns
  "state": { "slots": {...}, "missing": [...], "understanding": {...}|null, "turn": 3, "emergencyHandled": false }
}
```

### ChatResponse
```json
{
  "detected_language": "kn",
  "language_confidence": 0.98,
  "reply": "…in preferred language…",
  "understanding": { ...AIUnderstanding } | null,
  "slots": { ...merged state },
  "state": { ...full updated ConversationState (persisted by the backend) },
  "missing_slots": ["district"],
  "next_action": "ASK_LOCATION",
  "needs_confirmation": false,
  "confirmation_summary": null,
  "emergency": { "is_emergency": false, "guidance": null, "call_number": "112" },
  "suggested_replies": ["..."],
  "ai_provider": "demo"
}
```

### Internal contract rules

1. Python never touches the database, the filesystem (beyond model loading) or any
   privileged operation — it only transforms text.
2. Every response is Pydantic-validated on both sides; invalid cloud-LLM output is
   caught and the demo engine is used instead (logged, `ai_provider="demo"`).
3. When `AI_PROVIDER=demo` or the key is missing/unreachable, the offline engine answers
   and `ai_provider` is always `"demo"`.
4. Timeouts: Node → Python request timeout 25 s; Python → cloud LLM timeout
   `AI_LLM_TIMEOUT_SECONDS` (default 20 s) with one retry.

---

## 11. Rate limits (backend)

| Scope | Limit |
|---|---|
| `POST /api/auth/login`, `/register` | 10 / 15 min per IP |
| `POST /api/track` | 30 / min per IP |
| `POST /api/chat/conversations/:id/messages` | 60 / min per user |
| Everything else | 300 / min per IP |

Exceeding → 429 `RATE_LIMITED`.
