# Implementation Plan Tracker

Repository baseline: `prisma/nextjs-auth-starter`
Baseline commit SHA: `01c47e2f47e97df3fea915246bbd477e2259e40a`

Status legend: `todo` | `in_progress` | `done` | `blocked`

## Tasks

| ID | Task | Status | Notes |
|---|---|---|---|
| T00 | Baseline import and startup | done | Upstream fetched and checked out in workspace. |
| T01 | Docs scaffold | done | Added playbook and this tracker. |
| T02 | RBAC + user lifecycle schema | done | Added `Role`, `deletedAt`, `lastLoginAt`, `passwordHash`. |
| T03 | Reset/Audit/RateLimit schema | done | Added models and partial index migration SQL. |
| T04 | Auth register/login hardening | done | Register endpoint, normalized email, login limits, anti-enumeration. |
| T05 | Centralized RBAC guard rollout | done | Added `requireRole`; guarded admin page/APIs. |
| T06 | Password reset request flow | done | Neutral response, TTL/cooldown, hash-only persistence. |
| T07 | Password reset confirm flow | done | Attempts/TTL/consume/invalidate logic implemented. |
| T08 | Admin reset code issue | done | Endpoint with role restrictions and one-time response code. |
| T09 | Admin users UI/API | done | `/admin/users` list + role/deactivate controls by role. |
| T10 | Security baseline | done | Security headers, env guard, no-PII logger module. |
| T11 | Fast smoke tests | blocked | Tests added, but full DB-backed smoke execution is blocked in current local Prisma CLI runtime. |
| T12 | README and reproducibility | done | Updated README and env example. |

## Accepted defaults

- DB bootstrapping via `npx prisma dev` only.
- `APP_ENV=local|staging|prod` with prod guard for destructive commands.
- Reset code: 6 digits, TTL 10m, attempts 5, only hash stored in DB.
- Rate limits backed by DB table (`RateLimitBucket`).
- `JUNIOR_ADMIN` reset scope limited to target role `USER`.
- Invariants: no self-demote, no self-deactivate, keep at least one active ADMIN.

## Validation summary

- Static implementation completed for schema, API, RBAC guard, admin UI, and docs.
- `pnpm lint` passes.
- `pnpm typecheck` passes after manual `prisma generate`.
- Full Prisma-backed smoke run is currently blocked by unstable local Prisma CLI behavior in this environment (see notes below).

## Blockers

- `npx prisma dev` can start, but Prisma migration/status commands are unstable in this local runtime.
- `pnpm install` had to run with `--ignore-scripts`; lifecycle scripts were skipped intentionally.

## QA quick checks to run

```bash
pnpm lint
pnpm typecheck
pnpm test:smoke
pnpm db:migrate:dev
pnpm db:seed
pnpm dev
```

Expected:

- Lint/typecheck/tests pass.
- App starts without DB errors.
- `/admin/users` access rules enforced by role.
