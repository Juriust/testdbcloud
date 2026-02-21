# Skill Dev Playbook

## Scope

This playbook defines the working process for implementing and validating small MVP tasks in this repository.

## Role checklists

### Tech Lead

- Confirm task goal, boundaries, and non-goals.
- Ensure scope fits 1-2 hours.
- Define acceptance criteria and quick checks before implementation starts.
- Reject unnecessary dependencies or architecture sprawl.

### Developer

- Implement only the defined micro-task scope.
- Add minimal tests or smoke checks.
- Keep RBAC checks centralized via `requireRole`.
- Update docs (`README`, `docs/implementation_plan.md`) when behavior changes.

### QA / Tester

- Run quick smoke checklist.
- Validate negative paths (forbidden access, invalid code/password, limits).
- Confirm acceptance criteria exactly.

### Security / Privacy reviewer

- Verify no PII in logs (email/code/password/hash/token/secret).
- Verify reset codes are hash-only in DB.
- Verify anti-enumeration and rate limits in auth/reset flows.
- Verify all `/admin/*` checks use centralized role guard.

### Release manager

- Confirm Definition of Done for the micro-task.
- Confirm fresh start from README on clean setup.
- Confirm scripts and commands are reproducible.

## Definition of Done

A micro-task is Done only when:

1. Tech Lead criteria accepted.
2. Developer implementation and quick tests done.
3. QA smoke and negative checks passed.
4. Security checklist passed.
5. Release reproducibility check passed.

## Mandatory quick smoke checklist

1. Register -> Login success.
2. Request reset -> Confirm reset -> Login with new password success.
3. RBAC: USER forbidden, ADMIN allowed for `/admin/users`.

## Security and privacy hard rules

- Do not log email, phone, name, address, passport data.
- Do not log reset codes, passwords, password hashes, tokens, secrets.
- Store reset code only as hash.
- Use Prisma migrations for schema changes.
- Local database setup only through `npx prisma dev`.
- No `prisma init --db` and no cloud setup steps.

## Prohibited implementation patterns

- Copy-pasted per-route role checks.
- Direct plaintext handling/storage of reset codes in DB.
- Destructive DB commands in `APP_ENV=prod` without guard override.
- Heavy e2e suites for baseline smoke coverage.

## Micro-task template

**Title:**
**Goal:**
**Out of scope:**
**Changes (files/modules):**
**Acceptance criteria (3-5):**
**Quick checks (command + expected):**
**Risks:**
**Commit:** one logical commit per micro-task.
