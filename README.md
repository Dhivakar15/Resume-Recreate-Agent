# Resume Recreate Agent AI

A real, working AI-powered resume creation & recreation platform. Enter your personal, educational, technical and career information, let AI organize and professionally improve **your own** content, preview it live against three ATS-friendly templates, analyze it against a target job role, match it against a pasted job description — then export a recruiter-ready **PDF** or **LaTeX** source.

> The AI only improves what you provide. It never invents employers, dates, skills or achievements.

---

## ✨ Features

| Area | What works |
| --- | --- |
| **Landing page** | Modern SaaS marketing page — hero, features, how-it-works, benefits, footer |
| **Authentication** | Register / login / logout, bcrypt password hashing, JWT session in an httpOnly cookie, protected views |
| **Dashboard** | Welcome header, stats, recent resumes, full resume list — view, edit, duplicate, rename, delete, download |
| **Resume builder** | 10-step guided wizard (Personal → Summary → Education → Skills → Experience → Internships → Projects → Certifications → Achievements → Languages) with autosave |
| **Target job role** | Pick (or type) a target role; all AI operations tailor wording to it |
| **AI content improvement** | “Improve with AI” on summaries, objectives, experience, internships, projects and achievements — every rewrite is shown for **accept / reject** review before it is applied |
| **AI skill suggestions** | Category-grouped, checkbox-based suggestions grounded in your resume context and target role — you choose what to add |
| **AI Resume Analyzer** | **AI Estimated ATS Score** (clearly labelled as an estimate — not an official ATS result) with deterministic, explainable scoring: contact, summary, education, keyword match, experience depth, formatting. Plus strengths, improvements, formatting and role-specific recommendations |
| **Job Description Analyzer** | Paste a job description → AI extracts required/preferred skills, technologies, responsibilities, keywords, education & experience requirements → deterministic match score, matched/missing skills, suggested keywords and honest improvement advice. Missing skills are **never** auto-added |
| **Resume recreation** | Upload an existing **PDF or DOCX** → text is extracted server-side → AI reorganizes it into the structured builder (sections, bullets, summary) while preserving facts |
| **Templates** | Three ATS-friendly, single-column templates — **Modern ATS**, **Professional** (serif), **Minimal** — switchable live |
| **Live preview** | A4-style preview updates on every keystroke (editor left, preview right on desktop; editor first, preview below on mobile) |
| **PDF export** | Real server-side PDF generation (pdf-lib): selectable text, proper typography, clean pagination — ATS-parseable, no UI chrome |
| **LaTeX export** | Clean compilable LaTeX (article class, standard packages) — view, copy and download `.tex` |
| **Version management** | Multiple resumes, named version snapshots with one-click restore |

---

## 🧱 Tech Stack

- **Framework:** Next.js 16 (App Router) + TypeScript
- **UI:** Tailwind CSS 4 + shadcn/ui + Lucide icons + Framer Motion
- **State:** Zustand (client state)
- **Database:** Prisma ORM (SQLite for local dev; portable to PostgreSQL — see below)
- **Auth:** bcryptjs + JWT (`jose`) in an httpOnly cookie
- **AI:** Pluggable AI service layer (`src/lib/ai.ts`) over `z-ai-web-dev-sdk`, configured via environment variables
- **PDF:** `pdf-lib` (server-side, real text)
- **File parsing:** `unpdf` (PDF) + `mammoth` (DOCX)

---

## 🏗 Architecture

```
src/
├── app/
│   ├── page.tsx                 # Single-page app entry (renders <AppRoot/>)
│   └── api/                     # Backend route handlers (Node runtime)
│       ├── auth/                # register · login · logout · me
│       ├── resumes/             # CRUD + [id]/duplicate · versions · pdf · latex
│       ├── upload/              # PDF/DOCX text extraction
│       └── ai/                  # improve · suggest-skills · analyze · job-match · recreate
├── components/
│   ├── app/                     # App shell, views (landing, auth, dashboard, builder, analyzer, job match), dialogs
│   ├── resume/                  # Live preview + the 3 templates
│   └── ui/                      # shadcn/ui primitives
├── lib/
│   ├── ai.ts                    # AI service layer (the only module that talks to the AI SDK)
│   ├── ats-score.ts             # Deterministic ATS & job-match scoring
│   ├── pdf.ts / latex.ts        # Document generation
│   ├── auth.ts / validation.ts  # Sessions + zod schemas
│   └── client/                  # Frontend fetch wrapper + hash navigation
├── stores/                      # Zustand stores (auth, resumes)
├── types/resume.ts              # Shared domain types (single source of truth)
└── prisma/schema.prisma         # User · Resume · ResumeVersion · JobDescription · AIAnalysis
```

**Why JSON columns for resume sections?** The builder saves the whole resume atomically (autosave in one `PUT`), keeps the API surface small and makes AI recreation a single structured transaction. Relational entities (`User → Resume → ResumeVersion / AIAnalysis / JobDescription`) are fully modelled with proper cascades.

**Why hash-based SPA navigation?** The app ships as a single route (`/`) with client-side views (`#/dashboard`, `#/builder/<id>`, …) so it runs in any static-friendly preview environment while keeping all backend logic in real API routes. Deploying to Vercel works out of the box.

---

## 🚀 Getting Started (local / VS Code)

### Prerequisites
- Node.js 18+ (or Bun)
- An AI provider API key (see *AI setup*)

### 1. Install

```bash
git clone <your-repo-url> resume-recreate-ai
cd resume-recreate-ai
bun install        # or: npm install
```

### 2. Environment variables

```bash
cp .env.example .env
```

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | ✅ | `file:./db/custom.db` for local SQLite |
| `AUTH_SECRET` | ✅ | Long random string — signs session tokens (`openssl rand -hex 32`) |
| `AI_API_KEY` / provider keys | ✅ | Read by `z-ai-web-dev-sdk` from the environment. **Never hard-code keys** |

### 3. Database setup

```bash
bun run db:push   # creates the SQLite database from prisma/schema.prisma
```

### 4. Run

```bash
bun run dev       # http://localhost:3000
```

Register an account, create a resume (from scratch, by uploading an existing PDF/DOCX, or via **Try sample data** — clearly labelled demo content), and explore.

### Other commands

```bash
bun run lint        # ESLint
bunx tsc --noEmit   # TypeScript check
bun run build       # Production build
bun run start       # Start production server
```

---

## 🗄 Using PostgreSQL (production)

1. In `prisma/schema.prisma`, switch the datasource:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```
2. Point `DATABASE_URL` at your Postgres instance (Neon, Supabase, RDS, …).
3. `bun run db:push` (or generate a migration with `prisma migrate dev`).

Everything else — including the JSON resume payloads — is portable as-is.

---

## ☁️ Deploying to Vercel

1. Push the repo to GitHub.
2. Import it on [Vercel](https://vercel.com/new).
3. Add environment variables (`DATABASE_URL`, `AUTH_SECRET`, AI keys) in **Project → Settings → Environment Variables**.
4. Use a managed PostgreSQL database (Vercel Postgres / Neon / Supabase) — SQLite is for local development only.
5. Deploy. All API routes are standard Next.js route handlers (Node runtime) and work on Vercel serverless functions, including PDF generation and file parsing.

---

## 🔒 Security Notes

- Passwords hashed with bcrypt (never stored or logged in plain text).
- Sessions are signed JWTs in `httpOnly`, `sameSite=lax` cookies.
- Every API route authenticates via the session and scopes queries to the owning user.
- Uploads are validated by type and size (≤ 5 MB, PDF/DOCX only) and parsed in-memory — files are never written to disk.
- Rate limiting on auth, upload and AI endpoints; zod validation on every payload.
- Secrets live only in environment variables — `.env` is git-ignored and `.env.example` documents the contract.

---

## 📄 Disclaimer

The **AI Estimated ATS Score** and job-match scores are heuristic estimates generated from your resume content and the target role/job description. They are **not** official scores from any real Applicant Tracking System and are provided for guidance only.
