# CommitGlow

<p align="center">
  <strong>Open-source changelog and release-note generation for developers, indie builders, and product teams.</strong>
</p>

<p align="center">
  Turn commits, repositories, and release context into polished changelogs, release notes, launch posts, email updates, and shareable update drafts.
</p>

<p align="center">
  <a href="LICENSE"><img alt="License: AGPL-3.0-or-later" src="https://img.shields.io/badge/license-AGPL--3.0--or--later-violet"></a>
  <img alt="Next.js" src="https://img.shields.io/badge/Next.js-15-black">
  <img alt="React" src="https://img.shields.io/badge/React-19-61dafb">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.8-3178c6">
  <img alt="PostgreSQL" src="https://img.shields.io/badge/PostgreSQL-Drizzle-336791">
  <img alt="Monorepo" src="https://img.shields.io/badge/Monorepo-pnpm%20%2B%20Turborepo-f69220">
</p>

---

## What Is CommitGlow?

CommitGlow is a hosted-ready, self-hostable product for transforming software changes into human-readable release communication.

The app combines a Next.js product experience, Better Auth accounts, workspace and project foundations, Git provider connection flows, repository syncing, AI-assisted changelog generation, saved release history, and Polar billing hooks. It is designed as an open-source core that can run locally, deploy as a SaaS, or evolve into deeper team release workflows.

CommitGlow is for teams that want release notes without turning every release into a writing chore.

## Highlights

| Area | What CommitGlow Provides |
| --- | --- |
| Product | Marketing site, pricing page, authenticated dashboard, workspace views, project views, settings, and HTTP status pages. |
| Auth | Email/password sign-in, optional GitHub OAuth, optional Google OAuth, and Better Auth-backed session storage. |
| Workspaces | Personal workspace foundations, organization schema, member roles, workspace switching, plan-aware limits, and settings screens. |
| Projects | Project creation, project dashboard pages, project settings, repository lists, changelog lists, and saved changelog drafts. |
| Repositories | Repository attachment, provider search, branch selection, commit syncing, public repository support, and provider token storage. |
| AI | Streaming changelog generation through the AI SDK, Vercel AI Gateway configuration, Streamdown rendering, and prompt-injection-resistant changelog prompts. |
| Billing | Free, Pro, and Team plan definitions, Polar checkout integration, billing portal support, webhook-driven plan sync, and Team metered usage hooks. |
| Data | PostgreSQL schema managed with Drizzle ORM and Drizzle Kit migrations. |
| Developer Experience | pnpm workspaces, Turborepo tasks, shared TypeScript config, shared UI package, and compact package boundaries. |

## Feature Overview

### Release Communication

- Generate clean markdown changelogs from selected commits.
- Stream AI output into a focused generation session rather than a generic chat box.
- Show live generation progress for reading commits, reasoning through impact, writing markdown, and saving the final draft.
- Render generated markdown with Streamdown and syntax highlighting support.
- Save generated changelog drafts back to a project.
- Maintain foundations for future release notes, social posts, email updates, and update cards.

### Repository Workflows

- Attach repositories to projects.
- Search connected GitHub and GitLab accounts from the repository attach form.
- Select branches before saving repository connections.
- Sync commits into the database for later changelog generation.
- Track repository provider, owner, name, URL, default branch, privacy state, and integration references.
- Store commit metadata including SHA, message, author, committed timestamp, URL, and provider metadata.

### Account And Authentication

- Email/password authentication through Better Auth.
- Optional GitHub and Google social sign-in when OAuth credentials are configured.
- Server-protected dashboard routes.
- Session persistence in PostgreSQL.
- User plan fields for Free, Pro, and Team billing states.

### Workspaces And Organizations

- Personal and organization workspace data model.
- Organization roles: `owner`, `admin`, and `member`.
- Workspace ownership and membership records.
- Workspace-level project grouping.
- Plan-aware workspace, project, and provider-account limits.
- Dashboard pages for workspaces, organizations, workspace settings, and account settings.

### Billing And Usage

- Pricing model defined in code for Starter, Pro, and Team plans.
- Polar checkout support for paid plans.
- Polar customer creation on sign-up when billing is enabled.
- Billing portal support through the Better Auth Polar plugin.
- Webhook handling for plan synchronization.
- Usage-event table for generation, repository sync, and export events.
- Team metered usage support after included monthly generations.

### Developer-Focused Foundations

- Compact monorepo with clear app and package boundaries.
- Shared UI primitives in `@commitglow/ui`.
- Shared TypeScript configuration in `@commitglow/config`.
- Database schema and migrations in `@commitglow/db`.
- Next.js App Router application in `@commitglow/web`.
- Supabase-compatible PostgreSQL client configuration.

## Product Surface

| Route Area | Purpose |
| --- | --- |
| `/` | Marketing homepage and product positioning. |
| `/pricing` | Free, Pro, and Team plan presentation. |
| `/auth/sign-in` | User sign-in. |
| `/auth/sign-up` | User registration. |
| `/dashboard` | Authenticated workspace overview and metrics. |
| `/dashboard/projects` | Project list and project creation. |
| `/dashboard/projects/[slug]` | Project detail area. |
| `/dashboard/projects/[slug]/repositories` | Project repository management. |
| `/dashboard/projects/[slug]/changelogs` | Changelog generation and saved drafts. |
| `/dashboard/repositories` | Cross-project repository management. |
| `/dashboard/providers` | Git provider connection management. |
| `/dashboard/workspaces` | Workspace selection and creation. |
| `/dashboard/organizations` | Organization foundations. |
| `/dashboard/account` | Account settings. |
| `/dashboard/billing/success` | Post-checkout billing success flow. |
| `/errors` and `/errors/[code]` | Error and status-page previews. |

## Tech Stack

| Layer | Technology |
| --- | --- |
| Framework | Next.js 15 App Router |
| UI Runtime | React 19 |
| Language | TypeScript 5.8 |
| Styling | Tailwind CSS 4 |
| Auth | Better Auth |
| Database | PostgreSQL |
| ORM | Drizzle ORM |
| Migrations | Drizzle Kit |
| AI | AI SDK with Vercel AI Gateway-compatible configuration |
| Markdown Streaming | Streamdown and `@streamdown/code` |
| Billing | Polar and `@polar-sh/better-auth` |
| Package Manager | pnpm 10 |
| Build Orchestration | Turborepo |

## Repository Layout

```txt
commitglow/
+-- apps/
|   +-- web/                 Next.js application, routes, API handlers, components, and product UI
+-- packages/
|   +-- config/              Shared TypeScript configuration
|   +-- db/                  Drizzle schema, database client, and migrations
|   +-- ui/                  Shared CommitGlow UI primitives
+-- docs/
|   +-- ARCHITECTURE.md      Architecture notes
|   +-- ROADMAP.md           Product roadmap
+-- turbo.json              Turborepo task graph
+-- pnpm-workspace.yaml     Workspace package map
+-- README.md               Project guide
```

## Package Boundaries

| Package | Responsibility |
| --- | --- |
| `@commitglow/web` | The product application: marketing pages, auth pages, dashboard pages, API routes, billing screens, repository flows, and changelog UI. |
| `@commitglow/db` | Database schema, Drizzle exports, migration generation, migration execution, and the shared database client. |
| `@commitglow/ui` | Reusable UI primitives such as buttons, cards, and inputs. |
| `@commitglow/config` | Shared TypeScript settings used across packages. |

## Data Model

CommitGlow stores auth, workspace, repository, release, integration, and usage data in PostgreSQL.

| Table | Purpose |
| --- | --- |
| `user` | Better Auth users plus CommitGlow plan and Polar customer fields. |
| `session` | Better Auth sessions. |
| `account` | Better Auth provider and password accounts. |
| `verification` | Better Auth verification records. |
| `organizations` | Personal and team workspaces. |
| `organization_members` | Workspace membership and roles. |
| `projects` | Release projects grouped under organizations. |
| `repositories` | Git repositories attached to projects. |
| `repo_connections` | Connected provider accounts for repository search and sync. |
| `commits` | Synced commit records used for changelog generation. |
| `changelogs` | Saved changelog drafts and release notes. |
| `generated_outputs` | Generated release notes, changelogs, social posts, email updates, and update-card content. |
| `integrations` | Provider integration records and encrypted token references. |
| `usage_events` | Generation, repository sync, and export usage events. |

## Quick Start

### Prerequisites

- Node.js 20 or newer is recommended for Next.js 15.
- pnpm 10.10.0 or newer.
- PostgreSQL database, either local Postgres or a hosted provider such as Supabase.
- Optional OAuth, billing, and AI provider credentials depending on the features you want to test.

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Create Environment File

```bash
cp .env.example .env
```

On Windows PowerShell, use:

```powershell
Copy-Item .env.example .env
```

### 3. Configure Required Variables

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/commitglow"
BETTER_AUTH_SECRET="replace-with-a-strong-random-secret"
BETTER_AUTH_URL="http://localhost:3000"
```

### 4. Generate And Apply Database Migrations

```bash
pnpm db:generate
pnpm db:migrate
```

### 5. Start Development

```bash
pnpm dev
```

The web application is served by Next.js from `apps/web`, typically at `http://localhost:3000`.

## Environment Variables

### Core

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL connection string used by Drizzle and the app. |
| `BETTER_AUTH_SECRET` | Yes | Strong random secret used by Better Auth and provider-token encryption. |
| `BETTER_AUTH_URL` | Yes | Base URL for Better Auth, usually `http://localhost:3000` locally. |

### Social Auth

| Variable | Required | Description |
| --- | --- | --- |
| `GOOGLE_CLIENT_ID` | No | Enables Google OAuth when paired with `GOOGLE_CLIENT_SECRET`. |
| `GOOGLE_CLIENT_SECRET` | No | Google OAuth secret. |
| `GITHUB_CLIENT_ID` | No | Enables GitHub OAuth when paired with `GITHUB_CLIENT_SECRET`. |
| `GITHUB_CLIENT_SECRET` | No | GitHub OAuth secret. |

### Git Providers

| Variable | Required | Description |
| --- | --- | --- |
| `GITLAB_CLIENT_ID` | No | GitLab OAuth client ID used by provider connection flows. |
| `GITLAB_CLIENT_SECRET` | No | GitLab OAuth client secret. |
| `BITBUCKET_API_TOKEN` | No | Bitbucket API token placeholder for provider support. |

### Billing

| Variable | Required | Description |
| --- | --- | --- |
| `POLAR_ACCESS_TOKEN` | No | Enables Polar checkout, portal, customer creation, and usage integration. |
| `POLAR_WEBHOOK_SECRET` | No | Enables signed Polar webhook handling for plan synchronization. |
| `POLAR_SERVER` | No | Use `sandbox` locally or `production` for live billing. |
| `POLAR_PRO_PRODUCT_ID` | No | Polar product ID for the Pro plan. |
| `POLAR_TEAM_PRODUCT_ID` | No | Polar product ID for the Team plan. |

### AI And Public App Settings

| Variable | Required | Description |
| --- | --- | --- |
| `AI_GATEWAY_API_KEY` | No | Enables AI generation through the configured AI Gateway path. |
| `NEXT_PUBLIC_GITHUB_REPO` | No | Public GitHub repository shown in landing-page metadata, for example `carbonelldev/commitglow`. |

Never commit real secrets. Keep local secrets in `.env` and production secrets in your deployment provider's secret manager.

## Supabase PostgreSQL

CommitGlow can use Supabase as the hosted PostgreSQL provider while still using Drizzle for schema and migrations.

Use the pooled Supabase connection string in `.env`:

```env
DATABASE_URL="postgresql://postgres.<project-ref>:<password>@aws-1-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require"
```

The database client disables prepared statements because Supabase transaction pool mode does not support them:

```ts
const client = postgres(connectionString, { prepare: false });
const db = drizzle(client, { schema });
```

After setting `DATABASE_URL`, run:

```bash
pnpm db:generate
pnpm db:migrate
```

## Scripts

| Command | Description |
| --- | --- |
| `pnpm dev` | Start all development tasks through Turborepo. |
| `pnpm build` | Build all workspaces. |
| `pnpm lint` | Run TypeScript-based lint checks across workspaces. |
| `pnpm typecheck` | Run type checks across workspaces. |
| `pnpm db:generate` | Generate Drizzle migrations from `packages/db/src/schema.ts`. |
| `pnpm db:migrate` | Apply Drizzle migrations. |

Package-specific scripts are available with pnpm filters, for example:

```bash
pnpm --filter @commitglow/web dev
pnpm --filter @commitglow/db db:generate
pnpm --filter @commitglow/db db:migrate
```

## AI Generation Flow

CommitGlow treats commit messages as untrusted input. The changelog prompt explicitly defends against prompt injection attempts inside commit messages and only allows a narrow markdown changelog format.

The current flow is:

1. A signed-in user selects synced commits from a repository.
2. The client posts the selected commit SHAs and messages to `/api/changelog/generate`.
3. The API route verifies the Better Auth session.
4. The route validates the commit array and rejects empty requests or requests above 60 commits.
5. `streamText` generates a changelog with the configured model.
6. The client renders live output with Streamdown.
7. The user can save the generated markdown as a changelog draft.

Allowed generated sections are:

- `## Added`
- `## Changed`
- `## Fixed`
- `## Removed`
- `## Breaking Changes`

If no user-facing change can be safely derived, the model is instructed to return exactly:

```txt
No user-facing changes.
```

## Billing Model

CommitGlow ships with plan definitions in `apps/web/lib/plans.ts`.

| Plan | Price | Included Usage | Limits |
| --- | --- | --- | --- |
| Starter | `$0 forever` | 25 generations per month | 2 workspaces, 3 projects per workspace, 1 Git provider account. |
| Pro | `$5 per month` | 300 generations per month | 5 workspaces, unlimited projects, 5 provider accounts. |
| Team | `From $15 per month` | 1,000 included generations, then metered usage | Unlimited workspaces, projects, and provider accounts. |
| Enterprise | Contact us | Custom generation limits | SSO/SAML, security review, invoice billing, dedicated support, and SLA options. |

Billing principles:

- Starter and Pro do not create automatic overage charges.
- Team includes 1,000 generations per month before metered billing starts.
- Extra Team generations are `$0.01` each, billed only after the included monthly allowance.
- A generation is one generated release note, changelog, launch post, email update, or update card.

## Security Notes

- Dashboard routes are protected with server-side Better Auth session checks.
- The changelog generation endpoint requires an authenticated session.
- Commit messages are treated as untrusted data in the AI prompt.
- Provider tokens are encrypted with AES-256-GCM before storage.
- `BETTER_AUTH_SECRET` is also used to derive the token-encryption key, so it must be strong and stable.
- Real secrets should never be committed to the repository.

## Current Status

CommitGlow is an early-stage product foundation. The repository currently includes:

- A polished marketing and dashboard application.
- Auth, account, workspace, project, repository, provider, billing, and changelog foundations.
- Database schema and migrations for the core product model.
- Manual and AI-assisted changelog draft flows.
- Repository attachment and commit syncing foundations.
- Polar billing integration hooks.

Some roadmap items are intentionally still evolving, including deeper private repository automation, export cards, scheduled changelogs, custom branding, GitLab parity, CLI support, and complete team role enforcement.

## Milestones

### Completed

| Status | Milestone | What Shipped |
| --- | --- | --- |
| Complete | v0.1 - Product foundation | Landing page, pricing page, auth pages, dashboard shell, PostgreSQL schema, Drizzle migrations, shared packages, and monorepo structure. |
| Complete | v0.2 - Auth and workspaces | Better Auth email/password login, optional GitHub and Google OAuth, protected dashboard routes, personal workspace foundations, organizations, members, and workspace switching. |
| Complete | v0.3 - Projects and repositories | Project creation, repository attachment, provider-aware repository parsing, branch selection, repository detail pages, and cross-project repository views. |
| Complete | v0.4 - Commit syncing | Git provider commit fetching, commit normalization, commit persistence, repository sync actions, and changelog-ready commit storage. |
| Complete | v0.5 - Saved changelog drafts | Changelog tables, project changelog pages, generated draft saving, version fields, selected commit tracking, and saved release history foundations. |
| Complete | v0.6 - AI generation foundation | Authenticated AI generation endpoint, streaming changelog output, Streamdown rendering, AI session UI, commit-count validation, and prompt-injection-resistant changelog prompts. |
| Complete | v0.7 - Billing foundation | Free, Pro, and Team plan definitions, Polar checkout hooks, billing portal integration, webhook plan sync foundations, usage-event tracking, and Team metered usage logic. |
| Complete | v0.8 - Provider foundations | GitHub, GitLab, Bitbucket, and Gitea provider types, provider search foundations, encrypted token storage, private repository checks, and connected-provider management screens. |
| Complete | v0.9 - Product polish | Account settings, workspace settings, dashboard navigation, HTTP status pages, terminal-style UI details, shared UI primitives, and public app metadata. |

### Next Milestones

| Status | Milestone | Goal |
| --- | --- | --- |
| Planned | v1.0 - Stable self-hosted release | Document a reliable self-hosting path, verify production deployment settings, harden environment validation, polish onboarding, and define the first stable open-source release. |
| Planned | v1.1 - GitHub App workflow | Add GitHub App installation, repository picker, private repository access, webhook setup, automatic sync, and installation management. |
| Planned | v1.2 - Generation limits and plan enforcement | Enforce workspace, project, provider-account, and generation limits in product flows instead of only defining them in plan config. |
| Planned | v1.3 - Release history | Improve saved changelog history with filters, search, release status, publish dates, linked repositories, and selected commit visibility. |
| Planned | v1.4 - Export system | Add markdown download, copy-to-clipboard, PNG export, OpenGraph card export, and branded update-card templates. |
| Planned | v1.5 - Team collaboration | Add invitations, member management, role enforcement, shared team billing, workspace audit trails, and project-level permissions. |
| Planned | v1.6 - GitLab parity | Expand GitLab OAuth, repository selection, private project sync, webhook handling, and provider-specific setup docs. |
| Planned | v1.7 - Scheduled changelogs | Add weekly, biweekly, and monthly scheduled generation for selected projects and repositories. |
| Planned | v1.8 - Public changelog pages | Publish shareable changelog pages with project branding, SEO metadata, RSS feeds, and version archives. |
| Planned | v1.9 - CLI | Add a `commitglow` CLI for local commit scanning, changelog preview, markdown export, and CI usage. |
| Planned | v2.0 - Hosted SaaS launch | Finish hosted onboarding, billing, plan enforcement, provider automation, team workspaces, and production observability. |

### Future Ideas

| Theme | Ideas |
| --- | --- |
| AI quality | Tone presets, audience presets, product-area detection, breaking-change detection, release risk summaries, hallucination checks, and generated-output scoring. |
| Developer workflows | GitHub Actions integration, release PR comments, commit range selection, tag comparison, semantic version suggestions, and conventional commit grouping. |
| Publishing | One-click publishing to GitHub Releases, GitLab Releases, Slack, Discord, Linear, Notion, Hashnode, Medium, and email platforms. |
| Collaboration | Draft review, approval flows, inline comments, assignees, internal release briefs, and team notification rules. |
| Branding | Custom public changelog domains, logo uploads, theme presets, custom fonts, release-card templates, and white-label exports. |
| Analytics | Changelog views, click tracking, subscriber analytics, team usage dashboards, generation cost tracking, and repository activity trends. |
| Platform | Public API, webhooks, OAuth app marketplace, integration SDK, background jobs, queue-based sync, and durable scheduled workflows. |
| Enterprise | SAML/SSO, SCIM, audit logs, data retention controls, self-hosted admin panel, custom AI provider settings, and compliance exports. |
| Open source | Contribution guide, issue templates, local seed data, demo project, screenshots, architecture diagrams, and example deployment guides. |

## Development Guidelines

- Keep package boundaries small and intentional.
- Put application behavior in `apps/web` unless it is truly shared.
- Put database changes in `packages/db/src/schema.ts` and generate migrations with Drizzle Kit.
- Keep shared UI primitives in `packages/ui` only when they are reusable across product surfaces.
- Prefer markdown-first output formats for generated release communication.
- Avoid committing secrets, generated local files, or environment-specific configuration.

## Useful Docs

- `docs/ARCHITECTURE.md`: architecture notes and package boundaries.
- `docs/ROADMAP.md`: high-level product roadmap.
- `.env.example`: supported local environment variables.
- `packages/db/src/schema.ts`: source of truth for the PostgreSQL data model.
- `apps/web/lib/plans.ts`: plan limits, pricing, and usage definitions.
- `apps/web/lib/ai.ts`: changelog model, system prompt, and prompt-injection guardrails.

## License

CommitGlow is licensed under the `AGPL-3.0-or-later` license.

You may self-host, modify, and contribute to the project. If you modify CommitGlow and provide it as a network service, the source code of your modified version must also be made available under the AGPL-3.0 license.
