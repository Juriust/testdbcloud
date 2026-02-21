---
name: timeweb-compose-deploy
description: Configure and validate deployments to Timeweb Cloud App Platform from Docker Compose repositories. Use when preparing or troubleshooting deploys with docker-compose.yml and Dockerfile, checking Timeweb Compose restrictions, mapping environment or build variables, or guiding panel deployment steps.
---

# Timeweb Compose Deploy

Deploy applications on Timeweb App Platform from `docker-compose.yml` with platform-specific validation and rollout guidance.

## Quick Start

1. Run `scripts/check_timeweb_compose.py <path-to-compose>`.
2. Fix blocking violations first.
3. Follow `references/timeweb-compose-rules.md` to complete panel setup and deployment.

## Workflow

1. Collect deployment inputs:
- Repository URL and provider access method.
- Branch and whether autodeploy should remain enabled.
- Region, server size, private network selection, and target project.
- Required runtime variables and build arguments.

2. Validate manifest compatibility:
- Keep `docker-compose.yml` in repository root.
- Keep `Dockerfile` in root, or set explicit `build.dockerfile`.
- Reject host ports `80` and `443`.
- Keep the primary public app as the first service in `services`.
- Reject forbidden directives and `network_mode: host`.
- Use `scripts/check_timeweb_compose.py` for a fast pre-check.

3. Patch compose safely:
- Keep public service first and support services later.
- Publish non-primary services only on explicit custom ports when needed.
- Prefer explicit `build.context` and `build.dockerfile` when layout is non-standard.

4. Configure variables:
- Keep shared defaults in compose when safe.
- Keep secrets and environment-specific values in App Platform variables.
- Pass build-time values via `build.args`, then declare matching `ARG` in Dockerfile.

5. Execute deployment in the Timeweb panel:
- Follow the 8-step flow in `references/timeweb-compose-rules.md`.
- Use deployment logs as first-line diagnostics for failures.

## References

- Load `references/timeweb-compose-rules.md` when exact platform constraints or panel steps are needed.
