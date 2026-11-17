# HireX - Agent Instructions

Permanent instructions for all agents working on HireX. Read this file before every task.

---

## Mandatory Rules

1. **Read AGENTS.md before every task.**
2. **Read only relevant documentation and source files.**
3. **Inspect existing implementation before proposing changes.**
4. **NestJS remains HireX's primary backend.**
5. **Preserve existing Supabase PostgreSQL data and users.**
6. **Never perform destructive database operations without explicit approval.**
7. **Never introduce duplicate modules or services.**
8. **Never remove existing functionality without approval.**
9. **Never expose secrets in logs, documentation or Git.**
10. **Keep frontend, NestJS and Python AI service contracts synchronized.**
11. **Implement one task at a time.**
12. **Run relevant tests after modifications.**
13. **Report failures honestly.**
14. **Update project documentation after every completed task.**
15. **Verify actual source code when documentation conflicts with implementation.**
16. **Never assume previous conversation history is accurate.**
17. **Do not perform unrelated refactoring.**

---

## Verified Architecture Baseline

| Layer | Technology | Status |
|-------|------------|--------|
| Frontend | Next.js 15 + TypeScript + Tailwind CSS | ✅ Verified |
| Backend | NestJS 11 + Prisma 5 + TypeScript | ✅ Verified |
| Database | Supabase PostgreSQL (PostgreSQL 16+) | ✅ Verified |
| Authentication | Supabase Auth + custom JWT (access + refresh) | ✅ Verified |
| Queue | Redis + BullMQ | ✅ Verified |
| AI Service | Python FastAPI + spaCy + scikit-learn | ✅ Verified |
| Storage | Supabase Storage | ✅ Verified |
| Realtime | Socket.io + WebRTC (LiveKit) | ✅ Verified |

**UNVERIFIED**: Calendar integrations, SMS/WhatsApp reminders, SSO/SAML, multi-tenant support.

---

## Project Structure

```
HireX/
├── ts-api/              # NestJS Backend (Primary API)
├── frontend/            # Next.js 15 Frontend
├── python-ai-service/   # Python FastAPI AI Service
├── audit/               # Audit reports (ARCHITECTURE.md, etc.)
├── docs/                # Project documentation (to be created)
├── tasks/               # Task tracking (to be created)
└── .opencode/           # OpenCode configuration (to be created)
```

### Key Backend Modules (ts-api/src/)
- `auth/` - Authentication (JWT, OAuth, refresh tokens)
- `jobs/` - Job posting, applications, ATS
- `candidates/` - Candidate profiles
- `recruiters/` - Recruiter profiles
- `interviews/` - Interview scheduling, WebRTC rooms
- `ats/` - ATS scoring, resume analysis
- `ai/` - AI orchestration (Gemini, Ollama)
- `resumes/` - Resume upload, parsing, analysis
- `recommendations/` - Job recommendations
- `alerts/` - Notifications
- `feedback/` - Interview feedback

### Key Frontend Routes (frontend/app/)
- `/` - Landing page
- `/auth/*` - Authentication flows
- `/candidate/*` - Candidate dashboard
- `/recruiter/*` - Recruiter dashboard
- `/admin/*` - Admin dashboard
- `/analyze` - Resume analysis
- `/mock-interview` - AI mock interviews

---

## Critical Rules for This Project

1. **Never modify application logic** during context/documentation tasks
2. **Never delete or overwrite** existing code without approval
3. **Preserve existing users and data** - demo users exist
4. **Never run destructive DB operations** (`prisma migrate reset`, `db push --force`)
5. **Secrets stay in `.env`** - never commit or log them
6. **API contracts must stay synchronized** between frontend, NestJS, Python AI
7. **One task at a time** - complete and verify before moving on

---

## Current Verified State (as of 2026-11-10)

- **Phase 0 Stabilization**: COMPLETED
  - JWT secret validation fixed (no empty fallback)
  - Rate limiting on auth endpoints (5 login/15min, 3 register/15min, etc.)
  - Request ID middleware with UUID v4
  - Database module renamed (`datbase` → `database`)
  - Exception filter renamed (`all-excepions` → `all-exceptions`)
  - Helmet CSP/HSTS configured
  - Python AI timeout + retry with exponential backoff
  - File upload magic bytes validation (PDF, DOCX, DOC)
  - Frontend Spring Boot references removed → NestJS only
  - OAuth token URL handling reviewed

- **Build Status**: ✅ Passing
- **Tests**: No existing test suite found

---

## Documentation References

- `docs/ARCHITECTURE.md` - System architecture
- `docs/DATABASE.md` - Prisma schema, models, indexes
- `docs/API_DOCUMENTATION.md` - API routes, contracts
- `docs/AUTH_AND_SECURITY.md` - Auth flows, security
- `docs/AI_SERVICES.md` - AI providers, models, fallbacks
- `audit/` - Audit reports (ARCHITECTURE.md, BACKEND_AUDIT.md, etc.)
- `readme.md` - Project overview (at root)

---

## Next Actions Protocol

When starting a task:
1. Read AGENTS.md
2. Read CURRENT_STATUS.md
3. Read ACTIVE_TASK.md
4. Inspect relevant source code
5. Create implementation plan
5. Wait for approval before risky changes

After completing a task:
1. Update CURRENT_STATUS.md
2. Update ACTIVE_TASK.md
3. Update relevant technical documentation
3. Add to DECISIONS.md if architectural
4. Add to COMPLETED_TASKS.md
5. Update CHANGELOG.md
6. Record test results and risks