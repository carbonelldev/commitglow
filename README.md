# CommitGlow

Open-source changelog and release-note generator for developers and teams.

CommitGlow turns commits, pull requests, issues, and releases into clean release notes, changelogs, launch posts, email updates, and shareable update cards. The current app focuses on a hosted-ready Next.js product with auth, workspaces, projects, repository tracking, billing hooks, and a Drizzle/PostgreSQL data model.

## Current Scope

- Marketing site with pricing and product positioning
- Email/password auth plus optional Google and GitHub OAuth through Better Auth
- Auth-protected dashboard with workspace metrics
- Personal and team workspace foundations
- Organization/member schema and workspace switching
- Project, repository, changelog, generated output, integration, and usage-event tables
- Manual changelog flow and repository attachment UI foundations
- Polar billing integration for Pro and Team plans
- Shared UI and TypeScript config packages

## Stack

- Next.js 15 App Router
- React 19
- TypeScript
- Tailwind CSS 4
- PostgreSQL
- Drizzle ORM and Drizzle Kit
- Better Auth
- Polar billing
- pnpm workspaces
- Turborepo

## Repository Layout

```txt
apps/web         Next.js application, routes, auth, dashboard, pricing, and product UI
packages/db      Drizzle schema, database client, and migration scripts
packages/ui      Shared UI primitives
packages/config  Shared TypeScript configuration
docs             Architecture and roadmap notes
```

## Local Setup

Install dependencies:

```bash
pnpm install
```

Create your environment file:

```bash
cp .env.example .env
```

Set the required local values in `.env`:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/commitglow"
BETTER_AUTH_SECRET="replace-with-a-strong-random-secret"
BETTER_AUTH_URL="http://localhost:3000"
```

Generate and apply database migrations:

```bash
pnpm db:generate
pnpm db:migrate
```

Start the development server:

```bash
pnpm dev
```

The web app runs from `apps/web` and is served by Next.js, typically at `http://localhost:3000`.

## Scripts

```bash
pnpm dev          Start all workspace dev tasks through Turborepo
pnpm build        Build all workspaces
pnpm lint         Run TypeScript-based lint checks
pnpm typecheck    Run type checks
pnpm db:generate  Generate Drizzle migrations from the schema
pnpm db:migrate   Apply Drizzle migrations
```

## Environment Variables

Required for core local development:

- `DATABASE_URL`: PostgreSQL connection string
- `BETTER_AUTH_SECRET`: secure random auth secret
- `BETTER_AUTH_URL`: app URL, usually `http://localhost:3000` locally

Optional auth providers:

- `GOOGLE_CLIENT_ID`: Google OAuth client ID
- `GOOGLE_CLIENT_SECRET`: Google OAuth client secret
- `GITHUB_CLIENT_ID`: GitHub OAuth client ID
- `GITHUB_CLIENT_SECRET`: GitHub OAuth client secret

Optional Polar billing:

- `POLAR_ACCESS_TOKEN`: Polar API token; enables the Better Auth Polar plugin
- `POLAR_WEBHOOK_SECRET`: webhook signing secret for plan sync events
- `POLAR_SERVER`: `sandbox` locally or `production` for live billing
- `POLAR_PRO_PRODUCT_ID`: Polar product ID for the Pro plan
- `POLAR_TEAM_PRODUCT_ID`: Polar product ID for the Team plan

Optional public app settings:

- `NEXT_PUBLIC_GITHUB_REPO`: public GitHub repo used for landing-page repository metadata, for example `carbonelldev/commitglow`

Do not commit real secrets. Keep them in `.env` locally or in your deployment provider's secret manager.

## Supabase Postgres

CommitGlow can use Supabase as the hosted PostgreSQL provider while still using Drizzle as the ORM and migration layer.

Use the pooled Supabase connection string in `.env`:

```env
DATABASE_URL="postgresql://postgres.<project-ref>:<password>@aws-1-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require"
```

The database client uses `prepare: false` because Supabase transaction pool mode does not support prepared statements:

```ts
const client = postgres(connectionString, { prepare: false });
const db = drizzle(client, { schema });
```

After setting `DATABASE_URL`, generate and apply migrations:

```bash
pnpm db:generate
pnpm db:migrate
```

## Product Direction

The open-source core includes the landing page, auth, dashboard, workspace/project foundations, basic changelog generation, repository support, and markdown-first outputs.

The hosted SaaS direction includes paid plans, team workspaces, usage metering, private repository workflows, saved release history at scale, export cards, scheduled changelogs, custom branding, and AI generation limits.

## Roadmap

- v0.1: Landing page, auth, dashboard shell, PostgreSQL schema, and monorepo structure
- v0.2: Manual commit paste to generated changelog
- v0.3: Public GitHub repository URL to fetch commits
- v0.4: Save changelog history per project
- v0.5: GitHub App integration and private repository access
- v0.6: AI-generated release notes, social posts, and email updates
- v0.7: Export markdown, PNG, and OpenGraph images
- v0.8: GitLab support
- v0.9: CLI
- v1.0: Paid hosted plan

## License

CommitGlow is licensed under the AGPL-3.0-or-later license.

You may self-host, modify, and contribute to the project. If you modify CommitGlow and provide it as a network service, the source code of your modified version must also be made available under the AGPL-3.0 license.
