import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, assertAdmin } from "@/lib/auth";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    await assertAdmin(user);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const targetUser = await db.user.findUnique({
    where: { id: params.id },
    include: {
      spaces: { include: { projects: { include: { concepts: true } } } },
    },
  });
  if (!targetUser) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const activity = await db.activityEvent.findMany({
    where: { userId: params.id },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  const aiUsage = await db.aiRequest.findMany({ where: { userId: params.id } });

  const allConcepts = targetUser.spaces.flatMap((s) => s.projects.flatMap((p) => p.concepts));
  const overallMastery =
    allConcepts.length > 0 ? Math.round(allConcepts.reduce((s, c) => s + c.masteryPct, 0) / allConcepts.length) : 0;

  return NextResponse.json({
    user: {
      id: targetUser.id,
      email: targetUser.email,
      isAdmin: targetUser.isAdmin,
      createdAt: targetUser.createdAt,
      lastActiveAt: targetUser.lastActiveAt,
    },
    learningOverview: {
      spaces: targetUser.spaces.length,
      projects: targetUser.spaces.reduce((s, sp) => s + sp.projects.length, 0),
      overallMastery,
    },
    activityTimeline: activity.map((a) => ({ type: a.eventType, metadata: a.metadata, createdAt: a.createdAt })),
    aiUsage: {
      totalRequests: aiUsage.length,
      totalCostUsd: Number(aiUsage.reduce((s, r) => s + (r.costEstimate ?? 0), 0).toFixed(4)),
    },
  });
}
