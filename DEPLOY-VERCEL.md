# Deploying Resume Recreate Agent AI to Vercel

## ⚡ Quick answer: Root Directory

When Vercel asks for **Root Directory**:

- If your GitHub repo contains `package.json` **directly at the top level**
  (you pushed the *contents* of the extracted zip) → leave it as the default:
  **`./`** (or just leave the field empty)
- If your repo contains the extracted project as a subfolder (e.g. the repo
  has a folder `resume-recreate-agent-ai-source/` inside it) → set Root
  Directory to that folder name: **`resume-recreate-agent-ai-source`**

> Rule: Root Directory = the folder that contains `package.json`. Nothing else.

---

## ⚠️ IMPORTANT: one change required before the app will work

This project was built with **SQLite** (`db/custom.db`). Vercel's serverless
platform has a **read-only filesystem**, so SQLite cannot run there. You must
switch the database to a cloud Postgres (free tiers work fine).

### Option A — Neon (recommended, free, 2 minutes)

1. Create a free account at https://neon.tech → create a project → copy the
   connection string (looks like
   `postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require`)

### Option B — Vercel Postgres

1. In your Vercel project → **Storage** tab → **Create Database** → Postgres
   (free tier) → copy `DATABASE_URL` from the `.env.local` tab it offers.

### Option C — Supabase

1. Create a project at https://supabase.com → Settings → Database → Connection
   string (URI). Use the "Connection pooling" URI for serverless.

### Then switch Prisma to Postgres (30 seconds)

1. Open `prisma/schema.prisma` and change ONE line:

   ```prisma
   datasource db {
     provider = "postgresql"   // was: "sqlite"
     url      = env("DATABASE_URL")
   }
   ```

2. Push the schema to your cloud database (run locally with the cloud
   `DATABASE_URL` set in `.env` or as an env var):

   ```bash
   npx prisma db push
   ```

   This creates all tables (User, Resume, ResumeVersion, AIAnalysis,
   Application, Notification, CoverLetter, Activity, ...) in your cloud DB.

> Note: your existing `db/custom.db` data won't auto-migrate. Either start
> fresh (register a new account on the deployed app), or export/import your
> data (ask me and I'll generate a migration script).

---

## Environment variables (Vercel → Settings → Environment Variables)

| Name | Value |
|---|---|
| `DATABASE_URL` | your Postgres connection string |
| `AI_API_KEY` | your z-ai key (AI features; app works without it, AI endpoints return a friendly error) |

---

## Step-by-step: GitHub → Vercel

1. **Extract the zip** on your computer.

2. **Push to GitHub:**

   ```bash
   cd resume-recreate-agent-ai-source   # the folder containing package.json
   git init
   git add .
   git commit -m "Resume Recreate Agent AI"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO.git
   git push -u origin main
   ```

   (Or drag-and-drop upload via github.com → "uploading an existing file".)

3. **Import in Vercel:** https://vercel.com/new → select your repo.

4. **Configure the import screen:**
   - Framework Preset: **Next.js** (auto-detected)
   - **Root Directory: `./`** (see Quick answer above)
   - Build Command: leave default (`next build`)
   - Output Directory: leave default
   - Install Command: leave default

5. **Add the environment variables** (`DATABASE_URL`, `AI_API_KEY`) in the
   import screen, or later under Settings → Environment Variables.

6. **Don't forget** the Prisma provider switch + `npx prisma db push`
   (section above) — do it BEFORE the first deploy or the build will fail
   with `Provider sqlite is not supported` / runtime errors.

7. Click **Deploy** → wait ~2 minutes → your app gets a permanent URL like
   `https://your-project.vercel.app` that never expires. 🎉

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| Build error: `prisma` / `Provider sqlite not supported` | You didn't switch `provider` to `"postgresql"` in schema.prisma |
| Deploys fine but 500 on every API call | `DATABASE_URL` missing/wrong in Vercel env vars, or tables not created (`npx prisma db push`) |
| AI features say unavailable | `AI_API_KEY` env var not set (or quota) |
| "No such column" / schema drift errors | Run `npx prisma db push` again against the cloud DB |
| Login cookie issues | Vercel serves over HTTPS — cookies work out of the box; the app also supports Bearer-token fallback |
