-- Run this ONCE against your Supabase/Postgres database BEFORE running
-- `npm run db:push`, otherwise Prisma will fail on the `vector` column type.
--
-- Supabase: Dashboard -> SQL Editor -> paste this -> Run.
-- Plain Postgres/Neon: psql $DATABASE_URL -f db/enable_pgvector.sql

CREATE EXTENSION IF NOT EXISTS vector;

-- Optional but recommended once you have real data volume: an approximate
-- nearest-neighbor index speeds up retrieval significantly. Skip this on
-- day 1 (needs data in the table first) and add it once things work.
-- CREATE INDEX ON "MaterialChunk" USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
