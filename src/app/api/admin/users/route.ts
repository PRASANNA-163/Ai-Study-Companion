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

  const users = await db.user.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { spaces: true } } },
  });

  const withProjectCounts = await Promise.all(
    users.map(async (u) => {
      const projectCount = await db.project.count({ where: { space: { userId: u.id } } });
      return {
        id: u.id,
        email: u.email,
        isAdmin: u.isAdmin,
        createdAt: u.createdAt,
        lastActiveAt: u.lastActiveAt,
        spaceCount: u._count.spaces,
        projectCount,
      };
    })
  );

  return NextResponse.json({ users: withProjectCounts });
}
