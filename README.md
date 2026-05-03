# CommitGlow

Open-source changelog and release-note generator for developers.

CommitGlow turns commits, pull requests, issues, and releases into clean release notes, changelogs, launch posts, email updates, and shareable update cards.

## Stack

- Next.js App Router
- TypeScript
- PostgreSQL
- Drizzle ORM
- better-auth
- Tailwind CSS
- pnpm workspaces
- Turborepo
- GitHub API first
- OpenAI/Gemini later for AI summaries

## Apps And Packages

```txt
apps/web        Next.js app
packages/db     Drizzle schema and PostgreSQL client
packages/ui     Shared UI primitives
packages/config Shared TypeScript config
docs            Architecture and roadmap notes
```

## Local Setup

```bash
pnpm install
cp .env.example .env
pnpm db:generate
pnpm dev
```

Set `DATABASE_URL`, `BETTER_AUTH_SECRET`, and OAuth credentials before using auth providers.

## Supabase Postgres

CommitGlow can use Supabase as the hosted PostgreSQL provider while still using Drizzle as the ORM and migration layer.

Use the pooled Supabase connection string in `.env`:

```env
DATABASE_URL="postgresql://postgres.<project-ref>:<password>@aws-1-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require"
```

This repo already installs `drizzle-orm`, `drizzle-kit`, and `postgres` in `packages/db`. The database client uses `prepare: false` because Supabase transaction pool mode does not support prepared statements.

```ts
const client = postgres(connectionString, { prepare: false });
const db = drizzle(client, { schema });
```

After setting `DATABASE_URL`, generate and apply migrations:

```bash
pnpm db:generate
pnpm db:migrate
```

Do not commit a real Supabase password. Keep it only in `.env` or your deployment provider's secret manager.

## Environment Variables

- `DATABASE_URL`: PostgreSQL connection string
- `BETTER_AUTH_SECRET`: secure random auth secret
- `BETTER_AUTH_URL`: app URL, usually `http://localhost:3000` locally
- `GOOGLE_CLIENT_ID`: Google OAuth client ID
- `GOOGLE_CLIENT_SECRET`: Google OAuth client secret
- `GITHUB_CLIENT_ID`: GitHub OAuth client ID
- `GITHUB_CLIENT_SECRET`: GitHub OAuth client secret
- `NEXT_PUBLIC_GITHUB_REPO`: public GitHub repo for landing-page star count, for example `owner/commitglow`

## Roadmap

- v0.1: Landing + auth + dashboard shell
- v0.2: Manual commit paste to generated changelog
- v0.3: Public GitHub repo URL to fetch commits
- v0.4: Save changelog history per project
- v0.5: GitHub App integration
- v0.6: AI-generated release notes, tweets, email updates
- v0.7: Export markdown, PNG, OpenGraph image
- v0.8: GitLab support
- v0.9: CLI
- v1.0: Paid hosted plan

## Open Core Direction

The open-source core includes the landing page, auth, dashboard foundation, basic changelog generation, and public repository support. A hosted SaaS may later include paid features such as private repos, team workspaces, saved history at scale, export cards, scheduled changelogs, custom branding, and AI generation limits.

## License

CommitGlow is licensed under the AGPL-3.0-or-later license.

You may self-host, modify, and contribute to the project. If you modify CommitGlow and provide it as a network service, the source code of your modified version must also be made available under the AGPL-3.0 license.
