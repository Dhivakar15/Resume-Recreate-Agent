# Resume Recreate Agent AI — Setup Guide

An AI resume creation & career assistant platform built with Next.js 16 (App Router),
TypeScript, Tailwind CSS 4, shadcn/ui, Prisma (SQLite) and the z-ai-web-dev-sdk.

## What's in this archive

```
src/            → all application code (App Router pages, API routes, components, libs)
prisma/         → database schema (Prisma)
db/custom.db    → your existing database (users, resumes, analyses, etc.)
public/         → static assets
package.json    → dependencies & scripts
.env            → local DATABASE_URL
```

## Requirements

- Node.js 20+ (or Bun 1.1+)
- npm / pnpm / bun (any works)

## Run locally

```bash
# 1. install dependencies
npm install          # or: bun install

# 2. create/update the database from the Prisma schema
npm run db:push      # or: bun run db:push

# 3. start the dev server
npm run dev          # or: bun run dev

# 4. open http://localhost:3000
```

Your existing `db/custom.db` is included, so all accounts and resumes are
already there. If you'd rather start fresh, delete `db/custom.db` and run
`npm run db:push` again.

## AI features

AI features (resume recreation, analyzer, cover letters, chat assistant, …)
use the `z-ai-web-dev-sdk` package and read the API key from the
`AI_API_KEY` environment variable. Create a `.env.local` file:

```
AI_API_KEY=your-key-here
```

Without a key the app runs fine — only the AI-powered endpoints will return
a friendly "AI is unavailable" style error.

## Key endpoints

| Endpoint | Purpose |
|---|---|
| POST /api/upload | Resume upload (PDF/DOCX ≤ 5 MB) → extracted text |
| POST /api/ai/recreate | Rebuild a resume with AI from raw text |
| GET /api/dashboard/summary | Dashboard stats & scores |
| POST /api/auth/login · /api/auth/register | Session auth (cookie + Bearer) |

## Deploying to a permanent host

The sandbox preview URL rotates; for a stable URL deploy to Vercel, Railway,
Render, or a VPS:

1. Switch Prisma from SQLite to Postgres (change `provider` + `url` in
   `prisma/schema.prisma`, update `DATABASE_URL`, run `db:push`).
2. Set `AI_API_KEY` in the host's environment variables.
3. Build & start: `npm run build && npm run start`.
