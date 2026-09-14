# Future Improvements

If given more time beyond the 3-4 day prototype window, in rough priority order:

1. **Streaming Tutor responses** — token-by-token streaming would make the Tutor feel significantly more responsive, especially with a 70B model's generation time.
2. **Row Level Security policies** — add RLS as a second enforcement layer beneath the application-level ownership checks, for real defense-in-depth.
3. **OCR support** for scanned/image-only PDFs, likely via Tesseract or a hosted document-understanding API.
4. **Better mastery modeling** — move toward something like Bayesian Knowledge Tracing, which accounts for question difficulty and forgetting curves rather than a flat exponential moving average.
5. **A real job queue** (Redis/BullMQ or a managed queue) to replace the polled table, enabling multiple worker instances safely.
6. **A proper regression-testing harness** for AI behavior — comparing Tutor/Quiz outputs before and after a prompt or model change against a larger curated test set, with automated pass/fail thresholds.
7. **Structure-aware document chunking** — respecting headers, tables, and page boundaries instead of fixed-character chunking, and extracting page numbers accurately for citations (currently citations show filename but not always a reliable page number, since `pdf-parse` doesn't preserve per-chunk page boundaries in this implementation).
8. **Hybrid retrieval** (keyword + vector search) to improve recall on exact terms/names that embedding similarity alone sometimes misses.
9. **Notifications** for background job completion, so users don't need to poll the materials page manually.
10. **Multi-modal learning support** — diagrams and images within PDFs are currently ignored; a vision-capable model pass could extract useful content from them.
