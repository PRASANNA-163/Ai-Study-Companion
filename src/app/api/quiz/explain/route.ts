import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { callLlm } from "@/lib/llm";

const schema = z.object({ questionId: z.string().uuid() });

// Deliberately lazy/on-demand rather than generated for every question up
// front — saves API calls (relevant given Groq's free-tier rate limits) and
// respects that most users won't want an explanation for every question,
// only the ones they got wrong or are curious about.
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const question = await db.quizQuestion.findFirst({
    where: { id: parsed.data.questionId },
    include: { concept: { include: { project: { include: { space: true } } } } },
  });
  if (!question || question.concept.project.space.userId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let correctAnswerText = question.correctAnswer ?? "";
  if (question.type === "OPEN_ENDED") {
    try {
      const points = JSON.parse(question.correctAnswer ?? "[]");
      correctAnswerText = Array.isArray(points) ? points.join(", ") : correctAnswerText;
    } catch {
      /* leave as-is */
    }
  }

  const result = await callLlm({
    userId: user.id,
    feature: "eval",
    systemPrompt:
      "Explain, in 2-4 sentences, why the correct answer to this quiz question is correct. Be clear and educational, as if helping a student understand a concept they got wrong or want to double-check.",
    userPrompt: `Question: ${question.question}\nCorrect answer: ${correctAnswerText}\nStudent's answer: ${question.userAnswer}`,
    temperature: 0.3,
  });

  return NextResponse.json({ explanation: result.text });
}
