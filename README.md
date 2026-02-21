# Next.js + Prisma Auth Starter (Local Prisma Postgres)

MVP starter with email/password auth, RBAC, password reset codes, admin user management, and security-focused defaults.

## Stack

- Next.js 16 (App Router)
- NextAuth v4 credentials auth
- Prisma ORM + Prisma Postgres local dev
- PostgreSQL via `npx prisma dev`

## Security defaults

- Passwords and reset codes are stored as hashes only.
- Reset flow uses 6-digit codes, TTL, single active code, attempts limit.
- RBAC is centralized via `requireRole`.
- Login/reset endpoints apply rate limiting.
- No-PII logging policy for sensitive auth data.
- Soft-delete for users (`deletedAt`) with login blocked for deactivated users.

## Roles

- `USER`
- `JUNIOR_ADMIN`
- `ADMIN`

Permissions:

- `ADMIN` and `JUNIOR_ADMIN` can view `/admin/users`.
- Only `ADMIN` can change roles and deactivate users.
- `ADMIN` and `JUNIOR_ADMIN` can issue reset codes, but `JUNIOR_ADMIN` only for `USER` targets.

## Requirements

- Node.js `20.19+`, `22.12+`, or `24+` (Prisma 7 supported ranges)
- pnpm `9+`

## Fresh start (local)

1. Install dependencies:

```bash
pnpm install
```

2. Start local Prisma Postgres and copy `DATABASE_URL`:

```bash
npx prisma dev
```

3. Create env file:

```bash
cp .env.example .env.local
```

4. Set `DATABASE_URL` in `.env.local` from `npx prisma dev` output.

5. Run migrations:

```bash
pnpm db:migrate:dev
```

6. Seed data:

```bash
pnpm db:seed
```

7. Run app:

```bash
pnpm dev
```

8. (Optional) Open Prisma Studio:

```bash
npx prisma studio
```

## Scripts

- `pnpm dev`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm test:smoke`
- `pnpm db:dev`
- `pnpm db:migrate:dev`
- `pnpm db:seed`

## Production safety guard

`db:migrate:dev` and `db:seed` are wrapped by `scripts/guard-env.mjs`.

If `APP_ENV=prod`, destructive commands are blocked unless you explicitly set:

```bash
I_UNDERSTAND_PROD=1
```

## Main routes

Public auth:

- `POST /api/auth/register`
- `POST /api/auth/password/request-code`
- `POST /api/auth/password/confirm`

Admin:

- `GET /api/admin/users`
- `POST /api/admin/users/:id/role`
- `POST /api/admin/users/:id/deactivate`
- `POST /api/admin/users/:id/reset-code`

## Docs

- Process playbook: `docs/skill_dev_playbook.md`
- Implementation tracker: `docs/implementation_plan.md`
