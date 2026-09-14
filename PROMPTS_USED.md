# AI Prompts Used During Development

Organized by purpose, per the PRD's request. These are paraphrased summaries of the actual conversational prompts used with Claude during development — the real conversation was iterative and conversational rather than a fixed prompt list, so each entry below represents the substance of a real exchange.

## 1. Architecture prompts
- "Here's the full PRD for an AI Study Companion. Given a 3-day timeline, help me scope what's actually achievable, pick a tech stack that's fast to build and deploy, and cut features deliberately rather than trying to build everything shallowly."
- "I don't want a second paid API just for embeddings — what's a free, local alternative that still works reasonably well for a prototype?"
- "Recommend a background job pattern that demonstrates the queued→processing→done pattern without me having to stand up Redis/BullMQ in 3 days."

## 2. Database prompts
- "Design a Prisma schema covering Users, Spaces, Projects, Materials, Concepts, Conversations/Messages, Quiz/QuizQuestion, ActivityEvent, and an AI usage log table, with ownership relationships that make data isolation straightforward to enforce."
- "How do I store a pgvector column in Prisma, given it doesn't have native vector type support?"

## 3. Backend development prompts
- "Build the Spaces and Projects CRUD API routes with ownership checks on every request."
- "Build the material upload route — it needs to store the PDF in Supabase Storage and enqueue a background job rather than processing the PDF inline."
- "Build the background worker: pull a job, download the PDF, extract text, chunk it, embed each chunk, store the embeddings, and handle retries on failure."
- "Build the AI Tutor route: retrieve relevant chunks scoped to the current project only, generate a grounded answer with citations, and explicitly refuse to answer if retrieval confidence is too low — don't let the model invent an answer."
- "Build the adaptive quiz: pick a concept weighted toward weaker mastery (not exclusively the weakest), generate a question grounded in the actual uploaded material, and support both MCQ and open-ended grading."
- "Build the mastery update logic — keep it simple and explainable, an exponential moving average is fine, this isn't meant to be a real psychometric model."
- "Build the admin routes: platform overview, user list, and a per-user detail view with an activity timeline and AI usage stats."

## 4. Frontend development prompts
- "I need working frontend pages for the full loop — Spaces, Projects, material upload with live status polling, a Tutor chat interface, the quiz flow, and analytics pages. Keep styling minimal/functional given the time constraint, but make sure every feature is actually clickable for a demo video."

## 5. Debugging prompts
- "npm install is failing on Windows with EPERM/EBUSY errors and a Prisma engine download ECONNRESET — what's going on and how do I fix it?"
- "Prisma db push is failing with a literal 'host'/'dbname' error even though my .env looks correct — help me figure out why."
- "Next.js is warning that `serverExternalPackages` isn't a recognized config key — what's the correct option name for this Next.js version?"
- "npm flagged 7 vulnerabilities including 2 critical after install — which of these actually matter for a local prototype, and should I run `npm audit fix --force`?"

## 6. Documentation prompts
- "Write the architecture documentation, including a Mermaid diagram, explaining the major trade-offs I made and why."
- "Write the known limitations and future improvements sections honestly — I'd rather document what I cut deliberately than have it look like an oversight."

## [Add any prompts from other tools you used, if any, in the same format]
