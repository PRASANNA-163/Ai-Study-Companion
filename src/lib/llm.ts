// Central LLM access point. Every call in the app should go through this file,
// not call the Groq SDK directly — this is what makes AI usage tracking
// (PRD §43) and observability (PRD §44) possible without threading logging
// code through every feature separately.
//
// This is also the seam for "AI model & provider abstraction" (PRD §41):
// if you swap providers later, only this file changes.

import Groq from "groq-sdk";
import { db } from "./db";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-120b";

// Groq pricing changes; keep this rough estimate simple and documented as
// approximate in your Known Limitations section rather than treating it as
// billing-accurate.
const COST_PER_1K_INPUT = 0.00059;
const COST_PER_1K_OUTPUT = 0.00079;

interface LlmCallOptions {
  userId: string;
  feature: "tutor" | "quiz_generation" | "assessment_grading" | "concept_extraction" | "recommendation" | "eval";
  systemPrompt: string;
  userPrompt: string;
  jsonMode?: boolean;
  temperature?: number;
}

interface LlmResult {
  text: string;
  json?: unknown;
}

export async function callLlm(opts: LlmCallOptions): Promise<LlmResult> {
  const start = Date.now();
  let status: "success" | "error" | "timeout" = "success";
  let errorMessage: string | undefined;
  let inputTokens: number | undefined;
  let outputTokens: number | undefined;
  let resultText = "";

  try {
    const completion = await groq.chat.completions.create({
      model: MODEL,
      temperature: opts.temperature ?? 0.3,
      messages: [
        { role: "system", content: opts.systemPrompt },
        { role: "user", content: opts.userPrompt },
      ],
      response_format: opts.jsonMode ? { type: "json_object" } : undefined,
      // GPT-OSS models (Groq's current free-tier default) show their internal
      // reasoning by default, which breaks JSON.parse on the response. Hiding
      // it is required when using JSON mode — see Groq's reasoning_format docs.
      ...(opts.jsonMode ? ({ reasoning_format: "hidden" } as Record<string, unknown>) : {}),
    });

    resultText = completion.choices[0]?.message?.content ?? "";
    inputTokens = completion.usage?.prompt_tokens;
    outputTokens = completion.usage?.completion_tokens;
  } catch (err) {
    status = "error";
    errorMessage = err instanceof Error ? err.message : String(err);
    throw err; // caller decides fallback behavior — see tutor route for the pattern
  } finally {
    const latencyMs = Date.now() - start;
    const costEstimate =
      inputTokens && outputTokens
        ? (inputTokens / 1000) * COST_PER_1K_INPUT + (outputTokens / 1000) * COST_PER_1K_OUTPUT
        : null;

    // Fire-and-forget logging — a failed log write should never break the
    // user-facing request. This is the row that powers Admin > AI Usage.
    db.aiRequest
      .create({
        data: {
          userId: opts.userId,
          feature: opts.feature,
          model: MODEL,
          latencyMs,
          inputTokens: inputTokens ?? null,
          outputTokens: outputTokens ?? null,
          costEstimate,
          status,
          errorMessage,
        },
      })
      .catch((e) => console.error("Failed to log AI request:", e));
  }

  if (opts.jsonMode) {
    try {
      return { text: resultText, json: JSON.parse(resultText) };
    } catch {
      // Model didn't return valid JSON despite json_mode — caller must
      // validate and handle this (PRD §42: validate structured output
      // before persisting or acting on it).
      throw new Error("LLM did not return valid JSON");
    }
  }

  return { text: resultText };
}
