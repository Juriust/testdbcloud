# Timeweb App Platform: Docker Compose Rules

Source: `https://timeweb.cloud/docs/apps/deploying-with-docker-compose` (checked on 2026-02-21).

## Hard Constraints

1. Keep `docker-compose.yml` in repository root.

2. Keep `Dockerfile` in repository root for standard builds.
- If Dockerfile is in another location, set explicit build path in compose:

```yaml
services:
  app:
    build:
      context: ./app
      dockerfile: ./docker/Dockerfile.prod
```

3. Do not map host ports `80` or `443`.
- These ports are reserved by the platform web server.

4. Remember service exposure behavior:
- The first service in `services` is connected to the main application domain.
- Additional services with published ports are available at `<technical-domain>:<port>`.

5. Do not use these directives in `docker-compose.yml`:
- `cap_add`
- `cgroup`
- `cgroup_parent`
- `devices`
- `privileged`
- `device_cgroup_rules`
- `volumes`
- `ipc`
- `pid`
- `security_opt`
- `userns_mode`
- `sysctls`

6. Do not use `network_mode: host`.

## Deployment Flow in Timeweb Panel

1. Create an app and choose `Docker` -> `Docker Compose`.
2. Connect repository access (GitHub, GitLab, Bitbucket, or Git URL).
3. Select branch and deployment mode:
- Keep "latest commit" for autodeploy.
- Disable that mode to pin a specific commit.
4. Select region and server configuration.
5. Select private network and assign app IP.
- Private network choice cannot be changed later for that app.
6. Review app settings and variables.
7. Set app name, optional comment, and project.
8. Start deployment and inspect logs.

## Variables and Build Arguments

Pass build arguments through compose:

```yaml
services:
  app:
    build:
      context: .
      args:
        - ARGUMENT_VAR=${example_var}
```

Declare matching `ARG` in Dockerfile:

```dockerfile
ARG ARGUMENT_VAR=${example_var}
```

Use App Platform variables for environment-specific and secret values.

## Operational Notes

- Use deployment logs first when debugging build or runtime failures.
- First deployment may take longer while infrastructure is initialized.
- After deployment, retrieve IP and technical domain in dashboard, then attach custom domain if needed.
