import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const spaces = await db.space.findMany({
    where: { userId: user.id },
    include: { projects: { include: { concepts: true } } },
  });

  const allProjects = spaces.flatMap((s) => s.projects);
  const allConcepts = allProjects.flatMap((p) => p.concepts);

  const [tutorQuestions, quizQuestions, activeDaysRaw] = await Promise.all([
    db.message.count({ where: { role: "USER", conversation: { project: { space: { userId: user.id } } } } }),
    db.quizQuestion.findMany({ where: { concept: { project: { space: { userId: user.id } } } } }),
    db.activityEvent.findMany({ where: { userId: user.id }, select: { createdAt: true } }),
  ]);

  const answered = quizQuestions.filter((q) => q.answeredAt !== null);
  const correct = answered.filter((q) => q.isCorrect);
  const activeDaySet = new Set(activeDaysRaw.map((a) => a.createdAt.toISOString().slice(0, 10)));
  const activeDays = activeDaySet.size;

  // Current streak: count consecutive days with activity ending today (or
  // yesterday, so a streak isn't lost just because today hasn't happened yet).
  let currentStreak = 0;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  const todayStr = cursor.toISOString().slice(0, 10);
  if (!activeDaySet.has(todayStr)) cursor.setDate(cursor.getDate() - 1); // allow "yesterday" to still count as ongoing
  while (activeDaySet.has(cursor.toISOString().slice(0, 10))) {
    currentStreak++;
    cursor.setDate(cursor.getDate() - 1);
  }

  const overallMastery =
    allConcepts.length > 0 ? Math.round(allConcepts.reduce((s, c) => s + c.masteryPct, 0) / allConcepts.length) : 0;

  const improving = allConcepts.filter((c) => c.masteryPct > c.previousMasteryPct).length;
  const needsAttention = allConcepts.filter((c) => c.masteryPct < c.previousMasteryPct).length;

  return NextResponse.json({
    overallLearning: {
      totalSpaces: spaces.length,
      totalProjects: allProjects.length,
      activeDays,
      currentStreak,
    },
    performance: {
      overallMastery,
      quizAccuracy: answered.length > 0 ? Math.round((correct.length / answered.length) * 100) : null,
      conceptsImproving: improving,
      conceptsNeedingAttention: needsAttention,
    },
    aiUsage: {
      tutorQuestionsAsked: tutorQuestions,
      quizQuestionsAnswered: answered.length,
    },
  });
}
