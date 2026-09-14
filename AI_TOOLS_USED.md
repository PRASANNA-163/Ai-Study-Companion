# AI Tools & Usage Documentation

Per the PRD's transparency requirement, this documents which AI tools were used, where, why, and what they contributed.

## Development AI (used to build the product)

### Claude (Anthropic)
- **Where used**: Architecture design, full backend implementation (Prisma schema, all API routes, background worker, embeddings pipeline), full frontend implementation (all pages and components), debugging (npm/Windows environment issues, Prisma connection errors, Next.js config), and this documentation set.
- **Why used**: Primary development tool for this project given the compressed timeline. Used conversationally — I described the PRD requirements and my technical decisions, and iterated with Claude on architecture trade-offs (e.g., choosing pgvector over a separate vector DB, choosing local embeddings over a paid API) before generating code.
- **What it contributed**: The majority of the initial code scaffold across the stack — schema design, API route implementations, the worker/job-queue pattern, the frontend pages, and the documentation files (this one, ARCHITECTURE.md, KNOWN_LIMITATIONS.md, FUTURE_IMPROVEMENTS.md).
- **Used during development, not inside the final product** — Claude is not called by the running application at any point.



## Product AI (used by the deployed application)

### Groq (`llama-3.3-70b-versatile`)
- **Where used**: AI Tutor response generation, Quiz question generation, open-ended assessment grading, concept extraction from uploaded materials.
- **Why used**: Fast inference speed, free tier suitable for a prototype's usage volume, prior familiarity with the API from an earlier personal project (HalluciGuard).
- **What it contributed**: All natural-language generation and judgment calls in the running product — every Tutor answer, every quiz question, every grading decision passes through this model.
- **Used inside the final product** — every call is logged via `src/lib/llm.ts` to the `AiRequest` table for cost/latency/observability tracking (visible in the Admin Dashboard).

### Xenova/transformers (`all-MiniLM-L6-v2`)
- **Where used**: Generating embeddings for material chunks (on upload) and for questions (Tutor retrieval, Quiz question grounding).
- **Why used**: Runs locally with no API key and no per-call cost — avoided needing a second paid provider for a student prototype.
- **What it contributed**: The vector representations that power all retrieval-grounded features (Tutor citations, Quiz grounding).
- **Used inside the final product** — runs as part of the Node.js process (both the web server and the worker).

## Distinction summary

| Tool | Used to build | Used by the running product |
|---|---|---|
| Claude | Yes | No |
| Groq LLM | No | Yes |
| Local embeddings (Xenova) | No | Yes |
