# APEX OS — Setup Guide

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Copy `.env.local.example` to `.env.local` and fill in:

```
NEXT_PUBLIC_SUPABASE_URL=       # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=  # Supabase anon key
ANTHROPIC_API_KEY=              # Claude API key (for AI insights)
```

### 3. Set up Supabase

1. Create a project at supabase.com
2. In the SQL Editor, run `supabase/migrations/001_initial_schema.sql`
3. Optionally run `supabase/seed.sql` to seed the exercise library
4. Enable Email Auth in Authentication > Providers

### 4. Run locally

```bash
npm run dev
```

Open http://localhost:3000

---

## Deploy to Vercel

```bash
npx vercel --prod
```

Set the same environment variables in Vercel dashboard.

---

## Architecture

- **Framework**: Next.js 15 App Router
- **Database**: Supabase (PostgreSQL + Auth)
- **Styling**: Tailwind CSS with custom APEX design tokens
- **Charts**: Recharts
- **State**: Zustand + React Query

## Domains

| Domain | Route | Description |
|--------|-------|-------------|
| Command | `/command` | Daily brief, system status, non-negotiables |
| Physical | `/physical` | Workouts, sleep, running, body composition |
| Mental | `/mental` | Deep work, reading, journal |
| Financial | `/financial` | Net worth, income, savings rate |
| Skills | `/skills` | Competency tracking with evidence |
| Discipline | `/discipline` | Habits, integrity score, discomfort log |
| Vision | `/vision` | Goals, identity, values |
| SITREP | `/sitrep` | Weekly mandatory review |
