import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET(req: NextRequest, { params }: { params: { quizId: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const quiz = await db.quiz.findFirst({
    where: { id: params.quizId, project: { space: { userId: user.id } } },
    include: {
      questions: {
        include: { concept: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!quiz) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Mark complete on first summary fetch — this is what "End Quiz" triggers.
  if (!quiz.completedAt) {
    await db.quiz.update({ where: { id: quiz.id }, data: { completedAt: new Date() } });
  }

  const answered = quiz.questions.filter((q) => q.answeredAt !== null);
  const correct = answered.filter((q) => q.isCorrect);
  const score = answered.length > 0 ? Math.round((correct.length / answered.length) * 100) : 0;

  return NextResponse.json({
    score,
    totalAnswered: answered.length,
    totalCorrect: correct.length,
    questions: quiz.questions
      .filter((q) => q.answeredAt !== null) // only show questions actually answered — skip in-flight/abandoned ones
      .map((q) => ({
        id: q.id,
        type: q.type,
        concept: q.concept.name,
        question: q.question,
        options: q.options,
        correctAnswer: q.type === "OPEN_ENDED" ? null : q.correctAnswer, // open-ended has no single correct answer, only key points
        userAnswer: q.userAnswer,
        isCorrect: q.isCorrect,
        feedback: q.feedback,
        explanation: q.explanation,
      })),
  });
}
