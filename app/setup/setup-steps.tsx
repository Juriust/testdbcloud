import { CodeBlock } from "./code-block";

export default function SetupSteps() {
  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-2xl font-semibold mb-4 text-gray-800">Getting Started</h2>
        <p className="text-gray-600 mb-4">
          Follow these steps to set up your local Next.js + Prisma Postgres auth starter.
        </p>
      </section>

      <section>
        <h3 className="text-xl font-semibold mb-3 text-gray-800">1. Install dependencies</h3>
        <CodeBlock code="pnpm install" />
      </section>

      <section>
        <h3 className="text-xl font-semibold mb-3 text-gray-800">2. Start local Prisma Postgres</h3>
        <p className="text-gray-600 mb-3">
          Start a local Prisma Postgres instance and copy the printed <code>DATABASE_URL</code>.
        </p>
        <CodeBlock code="npx prisma dev" />
      </section>

      <section>
        <h3 className="text-xl font-semibold mb-3 text-gray-800">3. Configure env vars</h3>
        <CodeBlock code="cp .env.example .env.local" />
        <p className="text-gray-600 mb-3 mt-3">
          Set <code>DATABASE_URL</code> in <code>.env.local</code> and add a secure auth secret.
        </p>
        <CodeBlock code={`AUTH_SECRET="RANDOM_32_CHARACTER_STRING"`} />
      </section>

      <section>
        <h3 className="text-xl font-semibold mb-3 text-gray-800">4. Run migrations</h3>
        <CodeBlock code="pnpm db:migrate:dev" />
      </section>

      <section>
        <h3 className="text-xl font-semibold mb-3 text-gray-800">5. Seed data</h3>
        <CodeBlock code="pnpm db:seed" />
      </section>

      <section>
        <h3 className="text-xl font-semibold mb-3 text-gray-800">6. Run the app</h3>
        <CodeBlock code="pnpm dev" />
        <p className="text-gray-600 mt-3">
          Open <code>http://localhost:3000</code> after startup.
        </p>
      </section>
    </div>
  );
}
