# Todo Tracker (Next.js + Prisma + PostgreSQL)

## 1) Environment

Create local env from `.env.example`:

```bash
cp .env.example .env.local
```

Set `POSTGRESQL_PASSWORD` in `.env.local`, then URL-encode it:

```bash
node -e "console.log(encodeURIComponent('YOUR_PASSWORD'))"
```

Put encoded password into `DATABASE_URL`:

```env
DATABASE_URL="postgresql://AI_agent:URL_ENCODED_PASSWORD@77.232.135.105:5432/dev_db?sslmode=require"
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
