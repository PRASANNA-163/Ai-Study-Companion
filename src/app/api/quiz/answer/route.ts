import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { callLlm } from "@/lib/llm";

const answerSchema = z.object({
  questionId: z.string().uuid(),
  answer: z.string().min(1),
});

// Exponential moving update — recent performance matters more than distant
// history, without a single lucky/unlucky answer swinging mastery wildly.
// Documented as a deliberately simple model per PRD §29 ("not perfect
// measurement... understandable representation").
function updateMastery(oldMastery: number, isCorrect: boolean): number {
  const target = isCorrect ? 100 : 0;
  const next = oldMastery * 0.7 + target * 0.3;
  return Math.max(0, Math.min(100, Math.round(next)));
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = answerSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const question = await db.quizQuestion.findFirst({
    where: { id: parsed.data.questionId },
    include: { concept: { include: { project: { include: { space: true } } } } },
  });
  if (!question || question.concept.project.space.userId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (question.answeredAt) {
    return NextResponse.json({ error: "Question already answered" }, { status: 400 });
  }

  let isCorrect: boolean;
  let feedback: string;

  if (question.type === "MCQ" || question.type === "FILL_BLANK") {
    // Fill-in-the-blank uses simple case-insensitive exact match rather than
    // LLM grading — cheaper/faster, and short-answer blanks are usually
    // unambiguous. Documented as a known limitation: doesn't accept close
    // synonyms (e.g. "quick" vs "fast").
    isCorrect = parsed.data.answer.trim().toLowerCase() === (question.correctAnswer ?? "").trim().toLowerCase();
    feedback = isCorrect ? "Correct." : `Not quite. The correct answer was: ${question.correctAnswer}`;
  } else {
    // Open-ended grading (PRD §28) — assessed by LLM against key points,
    // with structured, validated output rather than trusting free text.
    let keyPoints: string[] = [];
    try {
      keyPoints = JSON.parse(question.correctAnswer ?? "[]");
    } catch {
      keyPoints = [];
    }

    const gradingResult = await callLlm({
      userId: user.id,
      feature: "assessment_grading",
      systemPrompt: `Grade this student answer against the expected key points. Question: "${question.question}". Expected key points: ${JSON.stringify(keyPoints)}. Return JSON only: {"isCorrect": true|false, "feedback": "1-2 sentences, specific about what's right or missing"}. Mark isCorrect true if the answer demonstrates reasonable understanding, even if not word-perfect.`,
      userPrompt: `Student answer: ${parsed.data.answer}`,
      jsonMode: true,
      temperature: 0.2,
    });

    const graded = gradingResult.json as { isCorrect?: boolean; feedback?: string };
    // Validate before trusting (PRD §42) — don't let a malformed LLM
    // response silently corrupt mastery state.
    if (typeof graded?.isCorrect !== "boolean") {
      return NextResponse.json({ error: "Grading failed, please try answering again." }, { status: 502 });
    }
    isCorrect = graded.isCorrect;
    feedback = graded.feedback ?? (isCorrect ? "Good understanding shown." : "Missing some key points.");
  }

  await db.quizQuestion.update({
    where: { id: question.id },
    data: { userAnswer: parsed.data.answer, isCorrect, feedback, answeredAt: new Date() },
  });

  const newMastery = updateMastery(question.concept.masteryPct, isCorrect);
  await db.concept.update({
    where: { id: question.conceptId },
    data: { previousMasteryPct: question.concept.masteryPct, masteryPct: newMastery },
  });

  await db.activityEvent.create({
    data: {
      userId: user.id,
      projectId: question.concept.projectId,
      eventType: "QUESTION_ANSWERED",
      metadata: { questionId: question.id, isCorrect, concept: question.concept.name },
    },
  });

  return NextResponse.json({
    isCorrect,
    feedback,
    explanation: question.explanation,
    concept: question.concept.name,
    masteryBefore: question.concept.masteryPct,
    masteryAfter: newMastery,
  });
}
