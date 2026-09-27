# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Taskosaur is an open-source project management platform whose distinguishing feature is **conversational AI task execution**: users describe what they want in chat and the AI drives the actual UI to do it.

> A detailed `AGENTS.md` already lives at the repo root with the full command catalog, env vars, Docker workflow, and commit conventions. Read it for anything not covered here. This file focuses on the *architecture you can't discover from a single file* and the day-to-day commands.

## Commands

Everything runs from the repo root via npm workspaces (`frontend`, `backend`). Most scripts are wrapped with `dotenv` so the root `.env` is loaded automatically.

```bash
npm run dev                 # both apps (backend:3000, frontend:3001)
npm run dev:backend         # NestJS only, watch mode
npm run dev:frontend        # Next.js only

npm run test:backend        # Jest unit tests (*.spec.ts colocated in src/)
npm run test:e2e            # Jest e2e (backend/test/*.e2e-spec.ts), uses .env.test
npm run lint                # eslint --fix across both workspaces (pre-commit hook runs this)
npm run format              # prettier on backend

npm run db:migrate          # prisma migrate dev
npm run db:seed             # full sample data  |  db:seed:admin = admin user only
npm run db:reset            # DROPS ALL DATA, re-migrates, re-seeds
npm run db:studio           # Prisma Studio GUI
```

Run a **single backend unit test**: `cd backend && npx jest path/to/file.spec.ts` (or `-t "test name"`).
Run a **single e2e test**: `npm run test:e2e -- tasks.e2e-spec.ts`. The `test:db:*` scripts mirror `db:*` against `.env.test` and must be run before e2e.

Frontend e2e is **Playwright**: `cd frontend && npm run test:e2e` (`:headed`, `:ui`, `:debug` variants). There are no frontend unit tests despite what AGENTS.md implies — only Playwright.

## Architecture

### Monorepo layout
- `backend/` — NestJS 11, Prisma 6 / PostgreSQL, Redis + BullMQ. Runs on port 3000, all routes under `/api` (Swagger at `/api/docs`).
- `frontend/` — Next.js 16 + React 19, **Pages Router** (`frontend/src/pages/`, *not* App Router). Custom server in `frontend/server.js` on port 3001. Tailwind v4 + Radix UI.

### The AI execution model (the core idea — read this first)
The AI does **not** call server-side tools or mutate the database directly. Instead:
1. `backend/src/modules/ai-chat/` proxies chat to a user-configured LLM. Provider is auto-detected from the API URL in `ai-chat.service.ts` (`detectProvider`): OpenAI, Anthropic, Google, OpenRouter, Ollama (any localhost/private IP), or `custom`. The user brings their own API key/model/URL, stored per-user via `SettingsService`.
2. The system prompt is assembled in `app-guide.ts` (`APP_GUIDE` + `enhancePromptWithContext`) and `automation-prompts.ts`. It teaches the LLM the app's routes and the `data-automation-id` attributes of buttons/inputs.
3. The **frontend** (`frontend/src/contexts/chat-context.tsx`) receives the AI's instructions and performs in-app browser automation — navigating routes and clicking elements by their `data-automation-id`.

**Consequence:** when you add or change UI that the AI should drive, you must (a) add stable `data-automation-id` attributes to the relevant elements and (b) update `app-guide.ts` so the model knows they exist. The `APP_GUIDE` string contains hard-won disambiguation notes (e.g. the workspace "Create" button makes a *project*, not a task) — keep them accurate.

### Multi-tenancy & RBAC
Strict hierarchy: **Organization → Workspace → Project → Task**, each with its own membership join table (`OrganizationMember`, `WorkspaceMember`, `ProjectMember`). The `Role` enum (`SUPER_ADMIN`, `OWNER`, `MANAGER`, `MEMBER`, `VIEWER`) is applied *per scope*. Authorization is JWT-based: `JwtAuthGuard` is registered as a **global `APP_GUARD`**, so routes are protected by default — mark public endpoints with the `@Public()` decorator (`modules/auth/decorators/public.decorator.ts`). Role checks use `RolesGuard`. Shared access logic lives in `common/access-control.utils.ts`; frontend mirrors it in `utils/permissions.ts` / `utils/roles.ts`.

### Modules & routing
Every backend feature is a NestJS module under `backend/src/modules/` (~40 of them: tasks, sprints, workflows, automation, inbox, jira-sync, trello-sync, etc.). Modules are mounted under `/api` via `RouterModule.register` in `app.module.ts` — **adding a module requires registering it there twice** (once in `imports`, once in the router children array). Prisma is the single data layer (`prisma/prisma.module.ts`, global); schema is `backend/prisma/schema.prisma` (~50 models, 75+ migrations).

### Queue system (Redis-optional)
`modules/queue/` is a custom abstraction over a backend chosen by `QUEUE_BACKEND` env (`bullmq` default, `better-queue`, or `in-memory`) with adapters in `queue/adapters/`. With `QUEUE_ENABLE_FALLBACK=true` (default), it **automatically falls back to an in-process queue when Redis is unavailable** — this is why `main.ts` deliberately swallows Redis `ECONNREFUSED` errors. The app boots and runs without Redis. Used by email/inbox sync, automation rules, and scheduled jobs.

### Real-time
WebSocket gateway at `backend/src/gateway/events.gateway.ts` (Socket.IO) pushes notifications/activity; frontend connects via `socket.io-client`. Activity logging is automatic through the global `ActivityNotificationInterceptor`.

### Cross-cutting backend conventions
- Secrets/integration tokens are encrypted at rest — `common/crypto.service.ts` + `common/utils/encryption.util.ts`, keyed by `ENCRYPTION_KEY` (64-char hex). Don't store integration credentials in plaintext.
- File uploads go through `modules/storage/` (S3-compatible via `@aws-sdk/client-s3`, or local `uploads/`).
- Request-scoped context (current user/org) is provided by `RequestContextInterceptor` + `request-context.service.ts`.

### Frontend conventions
- State is organized as **per-domain React Context providers** in `frontend/src/contexts/` (auth, organization, workspace, project, task, sprint, inbox, notification, chat). Prefer extending the matching context over ad-hoc fetching.
- All HTTP goes through typed clients in `frontend/src/utils/api/*.ts` (axios). Add new endpoints there, not inline in components.
- URLs are slug-based and hierarchical: `/{workspaceSlug}/{projectSlug}/...` (see `pages/[workspaceSlug]/`). Slug helpers in `utils/slugUtils.ts`.

## Notes
- Husky pre-commit runs `npm run lint` on both workspaces. Bypass only with `--no-verify` in emergencies.
- Conventional Commits are required (`feat:`, `fix:`, `docs:`, …); see AGENTS.md.
- This project has a graphify knowledge graph configured at `graphify-out/` (see the user's global instructions). If that directory exists, prefer `graphify query`/`graphify path`/`graphify explain` for cross-module questions, and run `graphify update .` after editing code.
