# Todo Tracker (Next.js + Prisma + PostgreSQL)

## 1) Environment

### Timeweb Cloud SSL certificate (one-time)

```bash
mkdir -p ~/.cloud-certs && \
curl -o ~/.cloud-certs/root.crt "https://st.timeweb.com/cloud-static/ca.crt" && \
chmod 0600 ~/.cloud-certs/root.crt
```

Export for the current shell (or add to `.env.local`, see below):

```bash
export PGSSLROOTCERT=$HOME/.cloud-certs/root.crt
```

### Local env

Create local env from `.env.example`:

```bash
cp .env.example .env.local
```

Set `POSTGRESQL_PASSWORD` in `.env.local`, then URL-encode it:

```bash
node -e "console.log(encodeURIComponent('YOUR_PASSWORD'))"
```

Put encoded password into `DATABASE_URL` in `.env.local`. Optionally set `PGSSLROOTCERT` so Prisma/Next.js use the CA cert (use `$HOME`, not `~`):

```env
PGSSLROOTCERT=/Users/YOUR_USERNAME/.cloud-certs/root.crt
DATABASE_URL="postgresql://AI_agent:URL_ENCODED_PASSWORD@e04e3afa27491e34d1a72107.twc1.net:5432/dev_db?sslmode=verify-full"
```

Connect with psql:

```bash
psql 'postgresql://AI_agent:URL_ENCODED_PASSWORD@e04e3afa27491e34d1a72107.twc1.net:5432/dev_db?sslmode=verify-full'
```

## 2) Apply schema

```bash
npm run db:migrate
```

## 3) Seed data

```bash
npm run db:seed
```

## 4) Run app

```bash
npm run dev
```

Open [http://localhost:3000/projects](http://localhost:3000/projects).

## 5) DB health check

```bash
npm run db:check
```

## 6) Safe reset

```bash
npm run db:reset
```

`db:reset` runs only when `APP_ENV=test` and fails if `DATABASE_URL` contains `default_db`, `prod`, or `production`.
