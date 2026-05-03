# Architecture

CommitGlow starts as a compact monorepo so the product can grow without introducing unnecessary service boundaries.

## Current Scope

- Landing page
- better-auth setup
- Dashboard shell
- PostgreSQL schema
- Drizzle client
- Shared UI package

## Deliberately Not Included Yet

- Hono backend
- Billing
- AI generation
- GitHub App installation flow
- Webhooks
- Public API

## Package Boundaries

- `apps/web`: Next.js application, route protection, pages, and product UI.
- `packages/db`: Database schema, Drizzle client, and migrations.
- `packages/ui`: Shared accessible components with the CommitGlow visual language.
- `packages/config`: Shared TypeScript configuration.

## Auth

Auth is handled by better-auth through the Next.js API route at `/api/auth/[...all]`. The dashboard layout checks the server session and redirects anonymous users to `/auth/sign-in`.

## Database

PostgreSQL is the source of truth. Drizzle owns the schema for auth tables and future product data including projects, repositories, changelogs, generated outputs, and usage events.
