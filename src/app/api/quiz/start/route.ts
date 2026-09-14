import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getCurrentUser, assertProjectOwnership } from "@/lib/auth";
import { embedText, toVectorLiteral } from "@/lib/embeddings";
import { callLlm } from "@/lib/llm";

const startSchema = z.object({
  projectId: z.string().uuid(),
  quizId: z.string().uuid().optional(),
  // Only meaningful on the FIRST call (no quizId yet) — ignored on subsequent calls.
  typePreference: z.enum(["MCQ", "OPEN_ENDED", "FILL_BLANK", "MIXED"]).optional(),
  targetCount: z.number().int().min(1).max(50).optional(), // omit for "unlimited, I'll end it myself"
});

function pickConceptWeighted(concepts: { id: string; name: string; masteryPct: number }[]) {
  const weights = concepts.map((c) => Math.max(100 - c.masteryPct, 15));
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < concepts.length; i++) {
    r -= weights[i];
    if (r <= 0) return concepts[i];
  }
  return concepts[concepts.length - 1];
}

function difficultyForMastery(masteryPct: number): number {
  if (masteryPct < 30) return 1;
  if (masteryPct < 60) return 2;
  if (masteryPct < 80) return 3;
  return 4;
}

function resolveQuestionType(pref: string | null): "MCQ" | "OPEN_ENDED" | "FILL_BLANK" {
  if (pref === "MIXED" || !pref) {
    const r = Math.random();
    return r < 0.5 ? "MCQ" : r < 0.8 ? "FILL_BLANK" : "OPEN_ENDED";
  }
  return pref as "MCQ" | "OPEN_ENDED" | "FILL_BLANK";
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = startSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { projectId } = parsed.data;

  await assertProjectOwnership(user.id, projectId);

  const concepts = await db.concept.findMany({ where: { projectId } });
  if (concepts.length === 0) {
    return NextResponse.json(
      { error: "No concepts found yet — upload and wait for a material to finish processing first." },
      { status: 400 }
    );
  }

  const quiz = parsed.data.quizId
    ? await db.quiz.findFirstOrThrow({ where: { id: parsed.data.quizId, projectId } })
    : await db.quiz.create({
        data: {
          projectId,
          typePreference: parsed.data.typePreference ?? "MIXED",
          targetCount: parsed.data.targetCount ?? null,
        },
      });

  // Enforce the user's chosen question count server-side, not just client-side.
  if (quiz.targetCount) {
    const answeredCount = await db.quizQuestion.count({ where: { quizId: quiz.id, answeredAt: { not: null } } });
    if (answeredCount >= quiz.targetCount) {
      return NextResponse.json({ done: true, quizId: quiz.id });
    }
  }

  const concept = pickConceptWeighted(concepts);
  const difficulty = difficultyForMastery(concept.masteryPct);
  const type = resolveQuestionType(quiz.typePreference);

  const conceptEmbedding = await embedText(concept.name);
  const context = await db.$queryRawUnsafe<{ content: string }[]>(
    `
    SELECT mc.content FROM "MaterialChunk" mc
    JOIN "Material" m ON m.id = mc."materialId"
    WHERE m."projectId" = $1 AND m.status = 'READY'
    ORDER BY mc.embedding <=> $2::vector
    LIMIT 3
    `,
    projectId,
    toVectorLiteral(conceptEmbedding)
  );
  const contextText = context.map((c) => c.content).join("\n\n");

  const alreadyAsked = await db.quizQuestion.findMany({
    where: { conceptId: concept.id },
    select: { question: true },
    take: 10,
    orderBy: { createdAt: "desc" },
  });
  const avoidList = alreadyAsked.map((a) => a.question).join(" | ") || "none";

  const prompts: Record<string, string> = {
    MCQ: `Generate one multiple-choice question testing understanding of "${concept.name}" at difficulty ${difficulty}/5, based ONLY on the material below. Return JSON only: {"question": "...", "options": ["A","B","C","D"], "correctAnswer": "the exact matching option text", "explanation": "1-2 sentences explaining why this is correct"}. Avoid repeating: ${avoidList}.\n\nMATERIAL:\n${contextText}`,
    FILL_BLANK: `Generate one fill-in-the-blank question testing understanding of "${concept.name}" at difficulty ${difficulty}/5, based ONLY on the material below. The question should be a sentence with a key term or phrase replaced by "_____". Return JSON only: {"question": "sentence with _____ in it", "correctAnswer": "the missing word or short phrase", "explanation": "1-2 sentences explaining the answer"}. Avoid repeating: ${avoidList}.\n\nMATERIAL:\n${contextText}`,
    OPEN_ENDED: `Generate one open-ended question testing understanding of "${concept.name}" at difficulty ${difficulty}/5, based ONLY on the material below. Return JSON only: {"question": "...", "modelAnswerKeyPoints": ["point 1","point 2"], "explanation": "1-2 sentence model answer summary"}. Avoid repeating: ${avoidList}.\n\nMATERIAL:\n${contextText}`,
  };

  const result = await callLlm({
    userId: user.id,
    feature: "quiz_generation",
    systemPrompt: prompts[type],
    userPrompt: "Generate the question now.",
    jsonMode: true,
    temperature: 0.6,
  });

  const questionData = result.json as {
    question: string;
    options?: string[];
    correctAnswer?: string;
    modelAnswerKeyPoints?: string[];
    explanation?: string;
  };

  if (!questionData?.question) {
    return NextResponse.json({ error: "Failed to generate a valid question, try again." }, { status: 502 });
  }

  const quizQuestion = await db.quizQuestion.create({
    data: {
      quizId: quiz.id,
      conceptId: concept.id,
      type,
      difficulty,
      question: questionData.question,
      options: questionData.options ?? Prisma.JsonNull,
      correctAnswer:
        type === "OPEN_ENDED" ? JSON.stringify(questionData.modelAnswerKeyPoints ?? []) : questionData.correctAnswer,
      explanation: questionData.explanation ?? null,
    },
  });

  return NextResponse.json({
    quizId: quiz.id,
    question: {
      id: quizQuestion.id,
      type: quizQuestion.type,
      difficulty: quizQuestion.difficulty,
      question: quizQuestion.question,
      options: quizQuestion.options,
      concept: concept.name,
    },
  });
}
