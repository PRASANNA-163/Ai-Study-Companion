# AI Study Companion — Prototype

Built for the AI.Prof Full Stack AI Engineer Intern project assignment.

## Feature status

**Fully implemented:**
- Auth (Supabase), Spaces, Projects, ownership-based data isolation
- Material upload → background job → PDF text extraction → local embeddings → pgvector storage → concept extraction
- AI Tutor: grounded retrieval, citations, confidence-gated unsupported-question handling, prompt-injection guard
- Adaptive Quiz: weighted concept/difficulty selection, MCQ + open-ended (LLM-graded), mastery updates
- Growth tracking (previous vs current mastery per concept)
- Project Analytics + Global Analytics
- Admin Dashboard: platform overview, AI usage/cost/error tracking, system health, user list + detail with activity timeline
- Full AI observability (every LLM call logged: latency, tokens, cost, status)
- Simple eval script for Tutor groundedness

See `KNOWN_LIMITATIONS.md` for what was deliberately cut and why, and `ARCHITECTURE.md` for the full system diagram and trade-off rationale.

## Setup

1. **Supabase**: create a free project at supabase.com.
2. Run `db/enable_pgvector.sql` in the Supabase SQL Editor.
3. Create a Storage bucket named exactly `materials` (private).
4. **Important — disable email confirmation for this prototype**: Supabase Dashboard → Authentication → Sign In / Providers → Email → turn OFF "Confirm email". Without this, signup won't let you log in immediately (it'll wait for an email confirmation link), which adds unnecessary friction for a demo/evaluation.
5. Copy `.env.example` to `.env`. Fill in:
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (use the **Publishable** key), `SUPABASE_SERVICE_ROLE_KEY` (use the **Secret** key) — all from Project Settings → API Keys.
   - `DATABASE_URL` — Project Settings → Database → Connection String → Direct connection, with your real password and `?sslmode=require` appended.
   - `GROQ_API_KEY` — free key from console.groq.com.
6. `npm install`
7. `npm run db:generate && npm run db:push`
8. Run in two terminals: `npm run dev` and `npm run worker`

## Using the app

1. Go to `/login`, sign up with any email/password (the **first account created becomes the admin account**).
2. Create a Space → create a Project → upload a PDF → wait for status to show READY (polls automatically).
3. Ask the Tutor a question about the material — you'll see a grounded answer with citations, or an honest "not supported" response if you ask something unrelated.
4. Click "Take Adaptive Quiz" to generate and answer questions against the material.
5. View Growth & Analytics on the project, and My Analytics for the global view.
6. Visit `/admin` (only works for the first/admin account) to see platform-wide usage and user detail.

## Running the eval script

```
npm run eval <projectId>
```

Get a `projectId` from the URL when viewing a project (e.g. `/projects/abc-123` → `abc-123`). Edit the test cases in `src/lib/eval/run-eval.ts` to match whatever material you've actually uploaded.

## Deployment (both free)

- **App**: Vercel — connect your GitHub repo, add the same env vars, deploy.
- **Worker**: Vercel doesn't run long-lived processes. Deploy the same repo to Railway.app or Render (free tier), overriding the start command to `npm run worker`.
- **Database + Auth + Storage**: stays on Supabase free tier.

## Documentation index

- `ARCHITECTURE.md` — system diagram, layer responsibilities, trade-offs
- `AI_TOOLS_USED.md` — which AI tools were used where, dev-time vs product-time
- `PROMPTS_USED.md` — actual development prompts, organized by purpose
- `KNOWN_LIMITATIONS.md` — what was cut and why
- `FUTURE_IMPROVEMENTS.md` — what's next given more time
