# AI-Powered Hiring Platform (Real-Time, Full-Stack, Production-Ready)

A complete hiring ecosystem with **Candidate**, **Recruiter**, and **Single Admin** modules, built for fast recruitment, AI-assisted decisioning, and real-time operations.

**Stack:** NestJS + Prisma + Supabase PostgreSQL + Next.js 15 + Redis/BullMQ + WebSocket + Anthropic + S3/R2

---

## Table of Contents

- [1) Product Overview](#1-product-overview)
- [2) Core Roles](#2-core-roles)
- [3) Architecture](#3-architecture)
- [4) Auth & Identity Module](#4-auth--identity-module)
- [5) Profile Module (LinkedIn-Style + Unique Differentiators)](#5-profile-module-linkedinstyle--unique-differentiators)
- [6) Platform Modules](#6-platform-modules)
  - [6.1 Candidate Module](#61-candidate-module)
  - [6.2 Recruiter Module](#62-recruiter-module)
  - [6.3 Admin Module (Single Admin)](#63-admin-module-single-admin)
- [7) Resume Upload & Versioning](#7-resume-upload--versioning)
- [8) Resume Analysis & ATS Intelligence](#8-resume-analysis--ats-intelligence)
- [9) Recruiter Interview System (Human Interview + AI Assist)](#9-recruiter-interview-system-human-interview--ai-assist)
- [10) AI Mock Interview Engine (Upcoming)](#10-ai-mock-interview-engine-upcoming)
- [11) Real-Time Events](#11-real-time-events)
- [12) API Overview (v1)](#12-api-overview-v1)
- [13) Database Model (Conceptual)](#13-database-model-conceptual)
- [14) Security, Privacy & Audit](#14-security-privacy--audit)
- [15) Analytics, Reporting & Power BI](#15-analytics-reporting--power-bi)
- [16) Getting Started](#16-getting-started)
- [17) Roadmap](#17-roadmap)
- [18) License](#18-license)

---

## 1) Product Overview

This platform is designed to speed up recruitment by combining:

- **Human-led interviews**
- **AI-assisted scoring and automation**
- **Real-time candidate-recruiter interaction**
- **Data-driven reporting for business decisions**

It supports full hiring lifecycle:  
**Resume Upload → ATS Analysis → Application → Scheduling → Interview → Evaluation → Shortlist/Hire**

---

## 2) Core Roles

### Candidate
Uses dashboard for profile, resumes, analysis, interviews, mock prep, and recommendations.

### Recruiter
Posts jobs, tracks funnel, schedules interviews, conducts live interviews, and finalizes shortlist/hire.

### Admin (Only One)
Controls subscriptions, billing, usage, compliance, and exact platform analytics.

---

## 3) Architecture

```text
┌────────────────────────────────────────────────────────────────┐
│ SaaS Layer (Product)                                           │
│ Next.js 15 Frontend                                            │
│ /candidate/*   /recruiter/*   /admin/*                         │
└─────────────────────────────┬──────────────────────────────────┘
                              │ HTTPS + WSS
┌─────────────────────────────▼──────────────────────────────────┐
│ PaaS Layer (API)                                                │
│ NestJS (MVC + Module Architecture)                              │
│ REST: /api/v1/*    WebSocket: /realtime                         │
│ Modules: auth, profile, jobs, applications, interviews, ai,     │
│ notifications, upload, recruiter, candidate, admin, analytics   │
└─────────────────────────────┬──────────────────────────────────┘
                              │
┌─────────────────────────────▼──────────────────────────────────┐
│ IaaS/Data Layer                                                  │
│ Supabase PostgreSQL · Redis/BullMQ · S3/R2 · TURN/WebRTC        │
│ AI providers (LLM + NLP + CV components)                         │
└────────────────────────────────────────────────────────────────┘
```

---

## 4. ## Auth Module Flow (Role-First + Correct Endpoint Routing)

### Role-first entry (required)
When a user clicks **Sign In** or **Create Account**, they must first choose a role:

- **Recruiter**
- **Job Seeker (Candidate)**

Only after selecting role, the auth form appears.

---

### Sign In flow (with role-aware routing)
1. User clicks **Sign In**
2. Role popup appears (Recruiter Login / Job Seeker Login)
3. User selects role
4. App opens sign-in form for that role
5. User signs in via:
   - Email/Password, or
   - Google OAuth, or
   - GitHub OAuth
6. Request is sent to role-aware auth endpoint/query
7. On success, user is redirected to role-specific destination:
   - Recruiter → recruiter dashboard endpoint/route
   - Job Seeker → candidate dashboard endpoint/route

✅ This ensures selected role always maps to correct auth handling and post-login route.

---

### Sign Up flow (with role-aware routing)
1. User clicks **Create Account**
2. Role popup appears
3. User selects role
4. User signs up with Email/Password or OAuth
5. Account is created with selected role
6. User is redirected to role-specific destination:
   - Recruiter route for recruiter accounts
   - Candidate route for job seeker accounts

---

### OAuth endpoint rules
Use `mode` and role query params:

- Sign in:
  - `/auth/oauth/google?mode=signin&role=recruiter`
  - `/auth/oauth/google?mode=signin&role=candidate`
  - `/auth/oauth/github?mode=signin&role=recruiter`
  - `/auth/oauth/github?mode=signin&role=candidate`

- Sign up:
  - `/auth/oauth/google?mode=signup&role=recruiter`
  - `/auth/oauth/google?mode=signup&role=candidate`
  - `/auth/oauth/github?mode=signup&role=recruiter`
  - `/auth/oauth/github?mode=signup&role=candidate`

---

### OAuth new-user behavior from Sign In
If user chooses **Sign In via OAuth** but account does not exist:
- Show: **“No account found. Complete signup with Google/GitHub.”**
- Redirect to OAuth onboarding
- Preserve identity from provider
- User picks role
- System completes signup and redirects to correct role route

---

### Final guarantee
After role selection, authentication always:
1. hits the correct role-aware endpoint/query, and
2. redirects to the correct role-specific route/dashboard.

## 5) Profile Module (LinkedIn-Style + Unique Differentiators)

Profile is designed similar to LinkedIn, but optimized for hiring outcomes.

### LinkedIn-Style Sections

- Headline
- About
- Experience
- Education
- Skills
- Certifications
- Projects
- Achievements
- Portfolio/GitHub/Social links
- Location & preferences
- Open-to-work status

### Unique Standout Features

1. **Interview Readiness Score** (from mock + ATS + behavior signals)  
2. **ATS Strength Meter** (role-wise quality and keyword gaps)  
3. **Recruiter Visibility Mode** (public/limited/private)  
4. **Proof-of-Skill Cards** (project + mock interview highlights)  
5. **Profile Health Checklist** (actionable improvements)

---

## 6) Platform Modules

## 6.1 Candidate Module

Sections:

1. Dashboard  
2. Profile Settings  
3. Resume Upload  
4. Resume Analysis  
5. Interview Section  
6. Job Recommendations  
7. AI Resume Builder  
8. AI Mock Interview  
9. Alerts & Notifications  

Dashboard highlights:
- Profile completion
- Active applications
- Upcoming interviews
- ATS score snapshot
- Recommendation count
- Readiness indicators

---

## 6.2 Recruiter Module

Recruiter dashboard tracks:

- Applications received
- Shortlisted candidates
- Interviews scheduled/completed
- Final shortlisted after interview
- Hired candidates
- Standout candidates

### Recruiter Jobs Option

Recruiter can:
- Create/edit/publish/close jobs
- View hiring funnel per job
- Push jobs to platform candidates
- Track conversion and hiring outcomes

### Recruiter Mobility (Optional Business Feature)

Recruiters may discover other organizations hiring recruiters and request shift.  
Data ownership remains protected (no cross-org private candidate data leak).

---

## 6.3 Admin Module (Single Admin)

Only one admin handles all global operations:

- Subscriptions
- Billing
- Usage and adoption metrics
- Reports and analytics
- Compliance and audit oversight

### Admin Metrics Accuracy Policy (Critical)

Admin dashboard must show **exact counts** (not approximations):

- users
- mock interviews completed
- resume builder usage
- resumes uploaded/analyzed
- ATS scoring runs
- interviews scheduled/completed
- shortlisted/hired
- subscriptions and revenue

Requirements:
- no rounded estimates for core KPI
- filter-aware exact values
- query/view traceability for audits
- near real-time consistency with committed DB data

---

## 7) Resume Upload & Versioning

- One candidate can upload multiple resumes
- Each resume has unique `resumeId`
- Same `userId` across candidate’s resumes
- Default resume selection supported
- Upload triggers analysis pipeline

Core design:
**User (1) → Resume (Many)**

---

## 8) Resume Analysis & ATS Intelligence

### Capabilities

- NLP-based parsing (skills/experience/education/projects)
- ATS score against:
  - recruiter jobs
  - external API jobs stored in DB
- Selection chance prediction:
  - High / Medium / Low
- Missing skills and improvement guidance

### AI Resume Builder

If ATS score is low:
- generate ATS-friendly, humanized resume
- role-targeted optimization
- instant re-scoring and comparison

---

## 9) Recruiter Interview System (Human Interview + AI Assist)

### Interview Policy

- Live interview is conducted by recruiter (P2P)
- Scheduling and reminders are automated
- AI assists with scoring and summary

### FIFO Scheduling

- Candidate queue ordered FIFO
- Slots assigned sequentially
- Large volume (e.g., 100 candidates) scheduled one-by-one by slot availability

### Mandatory Reminders

- Instant confirmation
- T-30 min reminder
- T-15 min reminder

Channels:
- In-app
- Email
- Optional SMS/WhatsApp (future)

### Real-Time Interview Workspace

- Secure tokenized video room
- Join/leave tracking
- Optional embedded technical editor/notepad for coding rounds

### AI Scoring

AI generates rubric suggestions:
- Technical
- Aptitude
- Communication
- Problem solving
- Culture fit
- Overall recommendation

Recruiter can accept/edit/override before final status.

> **AI assists by default. Human has final authority.**

---

## 10) AI Mock Interview Engine (Upcoming)

A separate AI preparation module for candidates before recruiter interview.

### Features

- Resume-aware question generation
- Voice/video/text mock interactions
- AI grading + readiness classification
- 2–3 day improvement plan before real interviews
- Progress tracking across attempts

### Advanced Analysis (Advisory)

- speech pace/clarity
- hesitation/filler patterns
- communication confidence
- optional CV-based engagement cues

---

## 11) Real-Time Eventstty

WebSocket: `ws://localhost:3001/realtime`  
Auth payload: `auth: { token }`

Events (sample):
- `job:published`
- `application:new`
- `application:status_changed`
- `interview:scheduled`
- `interview:reminder_30m`
- `interview:reminder_15m`
- `interview:started`
- `interview:completed`
- `notification:new`

---

## 12) API Overview (v1)

Base: `/api/v1`

### Auth
- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/oauth/google`
- `GET /auth/oauth/google/callback`
- `GET /auth/oauth/linkedin`
- `GET /auth/oauth/linkedin/callback`
- `POST /auth/refresh`
- `POST /auth/logout`
- `POST /auth/logout-all`
- `GET /auth/me`

### Candidate & Profile
- `GET /candidate/dashboard`
- `GET /candidate/profile`
- `PATCH /candidate/profile`

### Resume & ATS
- `POST /resumes/upload`
- `GET /resumes/me`
- `PATCH /resumes/me/:resumeId/default`
- `DELETE /resumes/me/:resumeId`
- `POST /ats/score/:jobId`
- `GET /ats/matches/me`
- `POST /resume-builder/generate`
- `POST /resume-builder/improve`

### Jobs
- `POST /jobs` (Recruiter)
- `PATCH /jobs/:id`
- `POST /jobs/:id/publish`
- `POST /jobs/:id/close`
- `GET /jobs/me/posted`

### Interviews
- `POST /interviews/schedule/batch` (Recruiter FIFO)
- `GET /interviews/me`
- `POST /interviews/room/:token/join`
- `PATCH /interviews/:id/feedback`

### Admin
- `GET /admin/dashboard`
- `GET /admin/usage/ai`
- `GET /admin/subscriptions`
- `GET /admin/billing`
- `GET /admin/reports/weekly`
- `GET /admin/reports/monthly`

---

## 13) Database Model (Conceptual)

- `User`
- `AuthProviderLink`
- `Session`
- `CandidateProfile`
- `RecruiterProfile`
- `Company`
- `Job`
- `Application`
- `Interview`
- `InterviewEvaluation`
- `Resume`
- `ResumeParsedData`
- `ResumeScore`
- `AiJobMatch`
- `MockInterviewSession`
- `MockInterviewEvaluation`
- `Notification`
- `Subscription`
- `Invoice`
- `UsageMetric`
- `AuditLog`

---

## 14) Security, Privacy & Audit

- JWT + refresh rotation
- RBAC + resource ownership controls
- Secure env management
- Strict CORS and throttling
- Input validation
- Signed URLs/tokens for secure resource access
- PII-safe logging
- Immutable audit logs for critical events
- Consent-first policy for audio/video AI analysis

---

## 15) Analytics, Reporting & Power BI

### Reports

- Weekly/monthly hiring reports
- Candidate funnel conversion
- Recruiter productivity
- AI module usage
- Revenue/subscription analytics

### Power BI Integration

Data exposed through:
- reporting tables/views/materialized views in PostgreSQL, or
- export/API connector pipeline

Must remain aligned with exact-count admin policy.

---

## 16) Getting Started

### Prerequisites

- Node.js 20+
- npm 10+
- Supabase project
- Redis instance
- Anthropic API key
- S3/R2 credentials (if enabled)

### Install

```bash
# API
cd ts-api
npm install
npx prisma generate

# Frontend
cd ../frontend
npm install
```

### Environment

```bash
cp ts-api/.env.example ts-api/.env.local
cp frontend/.env.example frontend/.env.local
```

Fill required values:
- `DATABASE_URL`
- JWT secrets
- `REDIS_URL`
- `ANTHROPIC_API_KEY`
- OAuth credentials (Google, LinkedIn)
- Storage credentials (optional)

### Database

```bash
cd ts-api
npx prisma db push
npx prisma db seed
npx prisma studio
```

### Run

```bash
# Terminal 1
cd ts-api && npm run start:dev

# Terminal 2
cd frontend && npm run dev
```

Local endpoints:
- API: `http://localhost:3001/api/v1`
- Swagger: `http://localhost:3001/api/docs`
- Frontend: `http://localhost:3000`

---

## 17) Roadmap

- AI mock interview production rollout
- Advanced recruiter copilots
- Calendar integrations
- Enterprise multi-tenant support
- SMS/WhatsApp reminders
- Bias/fairness monitoring dashboard
- Predictive hiring intelligence

---

## 18) License

Use MIT (or preferred license).  
Add `LICENSE` at repository root.