# Known Limitations

Documented honestly and deliberately, per the PRD's request to demonstrate critical self-evaluation rather than exhaustive feature coverage.

## Document processing
- Only PDF is supported (as the PRD allows for the prototype).
- No OCR — scanned/image-only PDFs will fail processing with a clear error message rather than silently producing no content. Implementing OCR (e.g. via Tesseract) was cut given the 3-day timeline.
- Chunking is fixed-size (800 characters, 150 overlap) rather than structure-aware (it doesn't specially handle tables, headers, or diagrams).

## Retrieval & AI quality
- Embeddings are generated locally using a small, distilled model (`all-MiniLM-L6-v2`, 384 dimensions) rather than a larger hosted embedding model. This keeps the prototype free to run but means retrieval quality is a notch below what a production system using e.g. OpenAI's or Cohere's embedding models would achieve.
- The "supported vs. unsupported" threshold for Tutor answers (cosine similarity ≥ 0.35) is a fixed, hand-picked value, not tuned against a labeled evaluation set.
- The LLM (`llama-3.3-70b-versatile` via Groq) is a strong general-purpose model but not top-tier for nuanced open-ended grading compared to larger frontier models.

## Mastery & evaluation
- Mastery is computed via a simple exponential moving average, not a real psychometric model (e.g. Item Response Theory or Bayesian Knowledge Tracing). This is explicitly acceptable per PRD §29 ("the purpose is not to claim perfect measurement"), but it's worth being upfront that it's a simplification.
- The AI evaluation script (`npm run eval`) covers a small, illustrative set of test cases for Tutor groundedness — it is not a comprehensive regression suite.

## Background processing & scaling
- The job queue is a polled Postgres table, not a dedicated queue system (Redis/BullMQ/SQS). This works correctly for a prototype's load but would not scale to high job throughput or multiple worker instances without additional coordination logic (e.g. row-level locking to prevent two workers picking up the same job).
- Retry logic is a simple capped retry (3 attempts) rather than exponential backoff or a dead-letter queue.

## Security
- Row Level Security (RLS) is not configured on the Supabase tables directly — all data isolation is enforced at the application layer (every API route checks ownership before touching data), since the backend always connects using the service-role key. This is a reasonable prototype trade-off but is a real gap compared to defense-in-depth with RLS as a second enforcement layer.
- Rate limiting is not implemented on any API route.
- The prompt-injection guard on the Tutor is a single instruction embedded in the system prompt, not a dedicated content-filtering layer — it reduces but doesn't eliminate the risk of malicious instructions embedded in uploaded material.

## UI / UX
- Frontend styling is minimal and functional rather than visually polished — the priority was making every PRD-required feature actually work end-to-end within the timeline, rather than investing time in visual design.
- No mobile-responsive design pass was done.
- The Tutor chat doesn't stream responses token-by-token (PRD's "Should Have" list) — it waits for the full response before displaying it.

## Admin & operations
- The "first user becomes admin" rule is a prototype convenience, not a real role-assignment system.
- Cost estimates in AI usage tracking use a hardcoded approximate per-token rate, not live pricing from Groq's API.
