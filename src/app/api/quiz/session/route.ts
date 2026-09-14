import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const quizId = req.nextUrl.searchParams.get("quizId");
  if (!quizId) return NextResponse.json({ error: "quizId required" }, { status: 400 });

  const quiz = await db.quiz.findFirst({
    where: { id: quizId, project: { space: { userId: user.id } } },
    include: {
      questions: {
        include: { concept: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!quiz) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const answered = quiz.questions.filter((q) => q.answeredAt !== null);
  const correct = answered.filter((q) => q.isCorrect);

  await db.quiz.update({ where: { id: quizId }, data: { completedAt: new Date() } });
  await db.activityEvent.create({
    data: {
      userId: user.id,
      projectId: quiz.projectId,
      eventType: "QUIZ_COMPLETED",
      metadata: { quizId, totalAnswered: answered.length, correct: correct.length },
    },
  });

  return NextResponse.json({
    quizId: quiz.id,
    totalAnswered: answered.length,
    correctCount: correct.length,
    scorePct: answered.length > 0 ? Math.round((correct.length / answered.length) * 100) : 0,
    questions: quiz.questions
      .filter((q) => q.answeredAt !== null)
      .map((q) => ({
        id: q.id,
        type: q.type,
        question: q.question,
        options: q.options,
        concept: q.concept.name,
        userAnswer: q.userAnswer,
        correctAnswer: q.type === "MCQ" ? q.correctAnswer : null,
        isCorrect: q.isCorrect,
        feedback: q.feedback,
      })),
  });
}
