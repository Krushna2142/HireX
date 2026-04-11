# 🚀 Hiring Platform — Real-Time, AI-Powered, MVC Architecture

Full-stack hiring platform with **Admin / Recruiter / Candidate** roles.
Built on **NestJS + Prisma + Supabase + Next.js 15**.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│  SaaS Layer (Product)                                           │
│  Next.js 15 Frontend — Role-based route groups                  │
│  /candidate/*  /recruiter/*  /admin/*                           │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTPS + WSS
┌────────────────────────────▼────────────────────────────────────┐
│  PaaS Layer (API)                                               │
│  NestJS (TypeScript) — MVC + Module architecture                │
│  REST API  /api/v1/*        WebSocket  /realtime                │
│  ┌──────────┬──────────┬──────────┬──────────┬──────────┐      │
│  │  auth    │  jobs    │  apps    │  intrvws │  ai      │      │
│  │  module  │  module  │  module  │  module  │  module  │      │
│  └──────────┴──────────┴──────────┴──────────┴──────────┘      │
│  ┌──────────┬──────────┬──────────┬──────────┬──────────┐      │
│  │ recruiter│  admin   │ notifs   │  upload  │ realtime │      │
│  │  module  │  module  │  module  │  module  │ gateway  │      │
│  └──────────┴──────────┴──────────┴──────────┴──────────┘      │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│  IaaS Layer (Infrastructure)                                    │
│  Supabase (PostgreSQL)  ·  Redis + BullMQ  ·  AWS S3 / R2      │
│  TURN Server (WebRTC)   ·  Anthropic API                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## Quick Start

### 1. Clone + Install

```bash
# API
cd ts-api && npm install
npx prisma generate

# Frontend
cd frontend && npm install
```

### 2. Environment Setup

```bash
cp .env.example ts-api/.env.local
# Fill in DATABASE_URL, JWT_SECRET, ANTHROPIC_API_KEY
```

### 3. Database

```bash
cd ts-api
npx prisma db push          # Push schema to Supabase
npx prisma db seed          # Seed demo data (optional)
npx prisma studio           # Visual DB browser
```

### 4. Run

```bash
# Terminal 1 — API
cd ts-api && npm run start:dev

# Terminal 2 — Frontend
cd frontend && npm run dev
```

- API:      http://localhost:3001/api/v1
- Swagger:  http://localhost:3001/api/docs
- Frontend: http://localhost:3000

---

## Database Schema (9 models)

| Model | Description |
|-------|-------------|
| `User` | Auth entity — has role (ADMIN/RECRUITER/CANDIDATE) |
| `CandidateProfile` | Skills, preferences, open-to-work status |
| `RecruiterProfile` | Company association, designation |
| `Company` | Verified company with branding |
| `Job` | Job posting (DRAFT→ACTIVE→CLOSED→ARCHIVED) |
| `Resume` | File + AI-parsed data + quality score |
| `Application` | ATS entity — tracks full hiring pipeline |
| `Interview` | Scheduled video/phone/onsite — room tokens |
| `AiJobMatch` | AI-computed fit scores per candidate×job |
| `AuditLog` | Immutable — every action recorded |

---

## API Endpoints

### Auth
| Method | Path | Access |
|--------|------|--------|
| POST | `/auth/register` | Public |
| POST | `/auth/login` | Public |
| POST | `/auth/refresh` | Public |
| GET | `/auth/me` | All |

### Jobs
| Method | Path | Access |
|--------|------|--------|
| GET | `/jobs?q=&location=&skills=` | Public (paginated) |
| GET | `/jobs/:id` | Public |
| POST | `/jobs` | Recruiter |
| PATCH | `/jobs/:id` | Recruiter (owner) |
| POST | `/jobs/:id/publish` | Recruiter (triggers AI matching) |
| GET | `/jobs/me/posted` | Recruiter |
| POST | `/jobs/:id/save` | Candidate |

### Applications (ATS)
| Method | Path | Access |
|--------|------|--------|
| POST | `/applications` | Candidate |
| GET | `/applications/me` | Candidate |
| GET | `/applications/job/:jobId` | Recruiter |
| PATCH | `/applications/:id/status` | Recruiter |
| GET | `/applications/:id/history` | All (own only) |

### Interviews
| Method | Path | Access |
|--------|------|--------|
| POST | `/interviews` | Recruiter |
| GET | `/interviews/me` | Candidate |
| POST | `/interviews/room/:token/join` | All (participants only) |
| PATCH | `/interviews/:id/feedback` | Recruiter |

### Recruiter Dashboard
| Method | Path | Access |
|--------|------|--------|
| GET | `/recruiter/dashboard` | Recruiter |
| GET | `/recruiter/activity` | Recruiter |
| GET | `/recruiter/analytics/time-to-hire` | Recruiter |

---

## Real-Time Events (WebSocket)

Connect: `ws://localhost:3001/realtime` with `auth: { token }`

| Event | Direction | Description |
|-------|-----------|-------------|
| `job:published` | Server→All candidates | New job went live |
| `application:new` | Server→Recruiter | Candidate applied |
| `application:status_changed` | Server→Candidate | Pipeline moved |
| `interview:scheduled` | Server→Candidate | Interview booked |
| `interview:cancelled` | Server→Both | Interview cancelled |
| `interview:participant_joined` | Server→Both | Someone joined room |
| `notification:new` | Server→User | New notification |

---

## AI Automation Pipeline

```
Resume Upload
     ↓
[AI] Parse + score resume (Claude Sonnet)
     ↓
Candidate applies to job
     ↓
[AI] Screen application — compute fit score (Claude Sonnet)
     ↓
Recruiter sees AI score + screening note in ATS board
     ↓
Job Published
     ↓
[AI] Match all candidates → create AiJobMatch records (Claude Haiku — bulk)
     ↓
Top matches notified in real-time
     ↓
Interview completed
     ↓
[AI] Summarize feedback (Claude Haiku)
```

---

## RBAC Permission Matrix

| Action | CANDIDATE | RECRUITER | ADMIN |
|--------|-----------|-----------|-------|
| View jobs | ✅ | ✅ | ✅ |
| Apply to job | ✅ | — | — |
| Post job | — | ✅ | ✅ |
| View all applications for own job | — | ✅ | ✅ |
| Move application in pipeline | — | ✅ | ✅ |
| Schedule interview | — | ✅ | ✅ |
| View platform stats | — | — | ✅ |
| Manage all users | — | — | ✅ |
| View audit logs | — | — | ✅ |

---

## Security Model

- **JWT access tokens** — 15 min expiry, RS256 signed
- **Refresh tokens** — 30 day, rotated on use, stored in DB
- **RBAC guards** — every protected endpoint checks role
- **Resource ownership** — recruiters can only modify their own jobs/applications
- **Helmet** — secure HTTP headers
- **CORS** — strict origin whitelist
- **Rate limiting** — 100 req/min per IP (ThrottlerModule)
- **Zod + class-validator** — all inputs validated, unknown fields stripped
- **Video room tokens** — unique per interview, validated server-side
- **Audit log** — immutable, append-only, every action recorded

---

## Folder Structure

```
platform/
├── prisma/
│   └── schema.prisma          # 9 models, all relations
├── ts-api/
│   └── src/
│       ├── main.ts            # Bootstrap + Swagger
│       ├── app.module.ts      # Root module
│       ├── prisma/            # Global PrismaService
│       ├── auth/              # JWT, OAuth, refresh tokens
│       ├── jobs/              # CRUD, search, DB-backed
│       ├── applications/      # ATS pipeline + audit trail
│       ├── interviews/        # Scheduling + video rooms
│       ├── ai/                # Claude integration
│       ├── realtime/          # WebSocket gateway
│       ├── upload/            # S3 resume upload
│       ├── notifications/     # Push + real-time
│       ├── recruiter/         # Dashboard + analytics
│       ├── admin/             # Platform oversight
│       └── common/            # Guards, decorators, pipes
└── frontend/
    └── src/
        ├── lib/               # API client, auth store
        ├── app/
        │   ├── auth/          # Login, register pages
        │   ├── candidate/     # Dashboard, jobs, applications
        │   ├── recruiter/     # Dashboard, ATS board, interviews
        │   └── admin/         # Platform management
        └── middleware.ts      # Role-based route protection
```