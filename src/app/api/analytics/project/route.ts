import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, assertProjectOwnership } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const projectId = req.nextUrl.searchParams.get("projectId");
  if (!projectId) return NextResponse.json({ error: "projectId required" }, { status: 400 });
  await assertProjectOwnership(user.id, projectId);

  const [concepts, tutorQuestions, quizQuestions, recentActivity] = await Promise.all([
    db.concept.findMany({ where: { projectId } }),
    db.message.count({ where: { conversation: { projectId }, role: "USER" } }),
    db.quizQuestion.findMany({ where: { concept: { projectId } } }),
    db.activityEvent.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
      take: 15,
    }),
  ]);

  const answered = quizQuestions.filter((q) => q.answeredAt !== null);
  const correct = answered.filter((q) => q.isCorrect);

  const overallMastery =
    concepts.length > 0 ? Math.round(concepts.reduce((sum, c) => sum + c.masteryPct, 0) / concepts.length) : 0;

  const growth = concepts.map((c) => ({
    concept: c.name,
    previous: c.previousMasteryPct,
    current: c.masteryPct,
    trend: c.masteryPct > c.previousMasteryPct ? "Improving" : c.masteryPct < c.previousMasteryPct ? "Needs Attention" : "Stable",
  }));

  const weakConcepts = [...concepts].sort((a, b) => a.masteryPct - b.masteryPct).slice(0, 3);
  const recommendedNextStep =
    weakConcepts.length > 0 && weakConcepts[0].masteryPct < 70
      ? `Your understanding of "${weakConcepts[0].name}" could use more work (${weakConcepts[0].masteryPct}% mastery). Consider reviewing the related material and taking another quiz on it.`
      : "You're doing well across all tracked concepts — consider uploading more material to keep learning.";

  return NextResponse.json({
    overallMastery,
    conceptCount: concepts.length,
    concepts: concepts.map((c) => ({ name: c.name, masteryPct: c.masteryPct })),
    growth,
    activity: {
      tutorQuestionsAsked: tutorQuestions,
      quizQuestionsAnswered: answered.length,
      quizAccuracy: answered.length > 0 ? Math.round((correct.length / answered.length) * 100) : null,
    },
    recentActivity: recentActivity.map((e) => ({
      type: e.eventType,
      metadata: e.metadata,
      createdAt: e.createdAt,
    })),
    recommendedNextStep,
  });
}
