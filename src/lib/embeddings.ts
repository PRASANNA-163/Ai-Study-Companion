// Local embeddings — runs entirely on your own machine/server, no API key,
// no per-call cost. This matters for a 3-day student prototype: retrieval
// quality doesn't need to be state-of-the-art, it needs to actually work
// without you burning money or hitting a second provider's rate limits.
//
// Model: Xenova/all-MiniLM-L6-v2 (384-dim), a distilled sentence-transformer
// ported to run via transformers.js (ONNX runtime, pure JS/WASM).
//
// Trade-off to note in your architecture doc: local embeddings are slower
// per-call than a hosted embeddings API and the model quality is smaller-scale,
// but for a bounded prototype with a handful of PDFs per project, this is a
// completely reasonable engineering choice — and it's honest to say so.

import { pipeline, type FeatureExtractionPipeline } from "@xenova/transformers";

let extractor: FeatureExtractionPipeline | null = null;

async function getExtractor() {
  if (!extractor) {
    extractor = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
  }
  return extractor;
}

export async function embedText(text: string): Promise<number[]> {
  const model = await getExtractor();
  const output = await model(text, { pooling: "mean", normalize: true });
  return Array.from(output.data as Float32Array);
}

export async function embedBatch(texts: string[]): Promise<number[][]> {
  const model = await getExtractor();
  const results: number[][] = [];
  // Sequential on purpose — keeps memory bounded on small hosting tiers.
  // If material sizes grow, batch this properly; documented as a known
  // limitation for the prototype.
  for (const text of texts) {
    const output = await model(text, { pooling: "mean", normalize: true });
    results.push(Array.from(output.data as Float32Array));
  }
  return results;
}

// Formats a JS number array as a pgvector literal for raw SQL queries,
// since Prisma doesn't have native vector type support yet.
export function toVectorLiteral(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}
