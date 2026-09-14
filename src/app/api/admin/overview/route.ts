import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, assertAdmin } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    await assertAdmin(user);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [
    totalUsers,
    activeUsers,
    totalSpaces,
    totalProjects,
    materialsUploaded,
    tutorQuestions,
    quizzesTaken,
    aiRequests,
    jobCounts,
  ] = await Promise.all([
    db.user.count(),
    db.user.count({ where: { lastActiveAt: { gte: sevenDaysAgo } } }),
    db.space.count(),
    db.project.count(),
    db.material.count(),
    db.message.count({ where: { role: "USER" } }),
    db.quiz.count(),
    db.aiRequest.findMany({ select: { latencyMs: true, status: true, costEstimate: true } }),
    db.job.groupBy({ by: ["status"], _count: true }),
  ]);

  const totalAiRequests = aiRequests.length;
  const aiErrors = aiRequests.filter((r) => r.status === "error").length;
  const avgLatency =
    totalAiRequests > 0 ? Math.round(aiRequests.reduce((s, r) => s + r.latencyMs, 0) / totalAiRequests) : 0;
  const totalCost = aiRequests.reduce((s, r) => s + (r.costEstimate ?? 0), 0);

  const jobHealth = Object.fromEntries(jobCounts.map((j) => [j.status, j._count]));

  return NextResponse.json({
    users: { total: totalUsers, activeLast7Days: activeUsers },
    content: { totalSpaces, totalProjects, materialsUploaded },
    activity: { tutorQuestionsAsked: tutorQuestions, quizzesStarted: quizzesTaken },
    aiUsage: {
      totalRequests: totalAiRequests,
      errorRate: totalAiRequests > 0 ? Math.round((aiErrors / totalAiRequests) * 100) : 0,
      avgLatencyMs: avgLatency,
      estimatedCostUsd: Number(totalCost.toFixed(4)),
    },
    backgroundJobs: {
      queued: jobHealth.QUEUED ?? 0,
      processing: jobHealth.PROCESSING ?? 0,
      done: jobHealth.DONE ?? 0,
      failed: jobHealth.FAILED ?? 0,
    },
  });
}
