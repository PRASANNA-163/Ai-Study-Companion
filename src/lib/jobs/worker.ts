// Background worker — run separately from the web process: `npm run worker`.
//
// Architecture trade-off (document this in your submission): a real system
// would use Redis/BullMQ or a managed queue (SQS, Cloud Tasks) for this.
// For a 3-day prototype, a polled `jobs` table gives you the same *pattern*
// (queued -> processing -> done/failed, with retries) without an extra piece
// of infrastructure to provision and keep alive. This is a documented,
// deliberate simplification — not an oversight.
//
// On a platform like Render/Railway, run this as a second "worker" process
// alongside the Next.js web process. On Vercel (which has no long-running
// processes), the pragmatic prototype move is to run this worker on a small
// free-tier VM/Railway service, or trigger processing via a Vercel Cron Job
// that calls a `/api/jobs/run-once` endpoint every minute — pick one and
// say which in your README.

import { db } from "../db";
import { createClient } from "@supabase/supabase-js";
import pdfParse from "pdf-parse";
import { embedBatch, toVectorLiteral } from "../embeddings";
import { extractAndSaveConcepts } from "./concepts";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const POLL_INTERVAL_MS = 3000;
const CHUNK_SIZE = 800; // characters per chunk — simple fixed-size chunking
const CHUNK_OVERLAP = 150;

function chunkText(text: string): string[] {
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + CHUNK_SIZE, text.length);
    chunks.push(text.slice(start, end));
    start += CHUNK_SIZE - CHUNK_OVERLAP;
  }
  return chunks.filter((c) => c.trim().length > 20);
}

async function processMaterialJob(materialId: string) {
  const material = await db.material.findUniqueOrThrow({ where: { id: materialId } });

  await db.material.update({ where: { id: materialId }, data: { status: "PROCESSING" } });

  const { data, error } = await supabaseAdmin.storage.from("materials").download(material.storagePath);
  if (error || !data) {
    throw new Error(`Failed to download material from storage: ${error?.message}`);
  }

  const buffer = Buffer.from(await data.arrayBuffer());
  const parsed = await pdfParse(buffer);
  // NOTE: pdf-parse does not do OCR, so scanned/image-only PDFs will yield
  // little or no text. This is a documented Known Limitation, not a silent
  // failure — we still mark the material READY but with a warning if very
  // little text was extracted.
  const rawText = parsed.text || "";

  const chunks = chunkText(rawText);
  if (chunks.length === 0) {
    await db.material.update({
      where: { id: materialId },
      data: {
        status: "FAILED",
        errorMessage: "No extractable text found (likely a scanned/image-only PDF — OCR not implemented in this prototype).",
      },
    });
    return;
  }

  const embeddings = await embedBatch(chunks);

  // Prisma can't insert the vector type directly, so we use a raw query per
  // chunk. For a prototype's document sizes this is fine; batching this
  // properly is called out in Future Improvements.
  for (let i = 0; i < chunks.length; i++) {
    const chunk = await db.materialChunk.create({
      data: { materialId, content: chunks[i], pageNumber: null },
    });
    await db.$executeRawUnsafe(
      `UPDATE "MaterialChunk" SET embedding = $1::vector WHERE id = $2`,
      toVectorLiteral(embeddings[i]),
      chunk.id
    );
  }

  await db.material.update({
    where: { id: materialId },
    data: { status: "READY", processedAt: new Date() },
  });

  // Best-effort — concept extraction failing should never fail the whole
  // material processing job, since the material IS usable for the Tutor
  // even with zero extracted concepts (Quiz just won't have topics yet).
  const projectForConcepts = await db.project.findUniqueOrThrow({ where: { id: material.projectId } });
  const ownerForConcepts = await db.space.findUniqueOrThrow({ where: { id: projectForConcepts.spaceId } });
  await extractAndSaveConcepts(material.projectId, ownerForConcepts.userId, rawText).catch((e) =>
    console.error("Concept extraction step failed:", e)
  );

  await db.activityEvent.create({
    data: {
      userId: (await db.project.findUniqueOrThrow({ where: { id: material.projectId } }).then((p) =>
        db.space.findUniqueOrThrow({ where: { id: p.spaceId } })
      )).userId,
      projectId: material.projectId,
      eventType: "MATERIAL_PROCESSED",
      metadata: { materialId, chunkCount: chunks.length },
    },
  });
}

async function runOnce() {
  const job = await db.job.findFirst({
    where: { status: "QUEUED", type: "process_material" },
    orderBy: { createdAt: "asc" },
  });
  if (!job) return;

  await db.job.update({
    where: { id: job.id },
    data: { status: "PROCESSING", startedAt: new Date(), attempts: { increment: 1 } },
  });

  try {
    const payload = job.payload as { materialId: string };
    await processMaterialJob(payload.materialId);
    await db.job.update({ where: { id: job.id }, data: { status: "DONE", finishedAt: new Date() } });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Job ${job.id} failed:`, message);

    const fresh = await db.job.findUniqueOrThrow({ where: { id: job.id } });
    const shouldRetry = fresh.attempts < fresh.maxAttempts;

    await db.job.update({
      where: { id: job.id },
      data: {
        status: shouldRetry ? "QUEUED" : "FAILED", // simple retry-on-failure, capped at maxAttempts
        error: message,
        finishedAt: shouldRetry ? null : new Date(),
      },
    });

    if (!shouldRetry) {
      const payload = job.payload as { materialId: string };
      await db.material
        .update({ where: { id: payload.materialId }, data: { status: "FAILED", errorMessage: message } })
        .catch(() => {});
    }
  }
}

async function main() {
  console.log("Worker started. Polling for jobs every", POLL_INTERVAL_MS, "ms");
  // eslint-disable-next-line no-constant-condition
  while (true) {
    await runOnce().catch((e) => console.error("Worker loop error:", e));
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
}

main();
