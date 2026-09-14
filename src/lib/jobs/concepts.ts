// Extracts 3-6 concept names from a material's text so the Quiz and Mastery
// features have something concrete to track (PRD §29). Called once per
// material right after chunking/embedding succeeds.

import { db } from "../db";
import { callLlm } from "../llm";

export async function extractAndSaveConcepts(projectId: string, userId: string, text: string) {
  const truncated = text.slice(0, 6000); // keep prompt small/cheap; first ~6k chars is enough signal

  let concepts: string[] = [];
  try {
    const result = await callLlm({
      userId,
      feature: "concept_extraction",
      systemPrompt:
        'Extract 3 to 6 distinct, specific learning concepts from this text. Respond with JSON only: {"concepts": ["concept 1", "concept 2", ...]}. Keep each concept name short (2-5 words).',
      userPrompt: truncated,
      jsonMode: true,
      temperature: 0.2,
    });
    const parsed = result.json as { concepts?: string[] };
    concepts = Array.isArray(parsed?.concepts) ? parsed.concepts.filter(Boolean) : [];
  } catch (e) {
    console.error("Concept extraction failed, continuing without new concepts:", e);
    return; // non-fatal — material is still READY, just without new concepts from this doc
  }

  for (const name of concepts) {
    const existing = await db.concept.findFirst({
      where: { projectId, name: { equals: name, mode: "insensitive" } },
    });
    if (!existing) {
      await db.concept.create({ data: { projectId, name, masteryPct: 0, previousMasteryPct: 0 } });
    }
  }
}
