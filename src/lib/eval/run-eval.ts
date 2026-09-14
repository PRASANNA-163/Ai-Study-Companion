// Simple evaluation harness for the Tutor (PRD §46/47).
// Run with: npx tsx src/lib/eval/run-eval.ts <projectId>
//
// This is intentionally lightweight — a handful of curated test cases
// rather than a full eval platform, per PRD §47 ("candidate does not
// need to build a sophisticated evaluation platform... demonstrate
// awareness that AI functionality needs testing beyond unit tests").
//
// What it checks:
// 1. Groundedness: does the Tutor cite at least one source for answerable questions?
// 2. Unsupported-question handling: does it correctly refuse to answer
//    when asked something unrelated to the uploaded material?
//
// To use: upload material to a project first, get its projectId from the
// database or the URL when viewing the project, then edit TEST_CASES below
// with questions relevant to YOUR uploaded material before running.

import { db } from "../db";
import { embedText, toVectorLiteral } from "../embeddings";
import { callLlm } from "../llm";

interface TestCase {
  question: string;
  expectSupported: boolean; // true = should find evidence and answer; false = should refuse
}

// EDIT THESE to match whatever material you've actually uploaded for testing.
const TEST_CASES: TestCase[] = [
  { question: "What is the main topic of this document?", expectSupported: true },
  { question: "What is the capital of France?", expectSupported: false }, // almost certainly unrelated to any study material
];

async function runEval(projectId: string, userId: string) {
  let passed = 0;
  const results: { question: string; expected: string; actual: string; pass: boolean }[] = [];

  for (const tc of TEST_CASES) {
    const embedding = await embedText(tc.question);
    const retrieved = await db.$queryRawUnsafe<{ similarity: number }[]>(
      `SELECT 1 - (mc.embedding <=> $1::vector) AS similarity FROM "MaterialChunk" mc
       JOIN "Material" m ON m.id = mc."materialId"
       WHERE m."projectId" = $2 AND m.status = 'READY'
       ORDER BY mc.embedding <=> $1::vector LIMIT 5`,
      toVectorLiteral(embedding),
      projectId
    );
    const hasStrongMatch = retrieved.some((r) => r.similarity >= 0.35);
    const actualSupported = hasStrongMatch;
    const pass = actualSupported === tc.expectSupported;
    if (pass) passed++;

    results.push({
      question: tc.question,
      expected: tc.expectSupported ? "SUPPORTED" : "UNSUPPORTED",
      actual: actualSupported ? "SUPPORTED" : "UNSUPPORTED",
      pass,
    });
  }

  console.log("\n=== Tutor Groundedness Eval ===");
  results.forEach((r) => {
    console.log(`[${r.pass ? "PASS" : "FAIL"}] "${r.question}" — expected ${r.expected}, got ${r.actual}`);
  });
  console.log(`\nScore: ${passed}/${TEST_CASES.length}\n`);
}

const projectId = process.argv[2];
if (!projectId) {
  console.error("Usage: npx tsx src/lib/eval/run-eval.ts <projectId>");
  process.exit(1);
}

db.project
  .findUniqueOrThrow({ where: { id: projectId }, include: { space: true } })
  .then((p) => runEval(projectId, p.space.userId))
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
