import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

const createProjectSchema = z.object({
  spaceId: z.string().uuid(),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  goal: z.string().max(500).optional(),
});

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = createProjectSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  // Ownership check on the SPACE before allowing a project inside it —
  // otherwise a user could create a project under a space id that isn't
  // theirs just by guessing/enumerating uuids.
  const space = await db.space.findFirst({
    where: { id: parsed.data.spaceId, userId: user.id },
  });
  if (!space) {
    return NextResponse.json({ error: "Space not found" }, { status: 404 });
  }

  const project = await db.project.create({ data: parsed.data });

  await db.activityEvent.create({
    data: {
      userId: user.id,
      projectId: project.id,
      eventType: "PROJECT_CREATED",
      metadata: { projectId: project.id },
    },
  });

  return NextResponse.json({ project }, { status: 201 });
}

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const spaceId = req.nextUrl.searchParams.get("spaceId");
  if (!spaceId) {
    return NextResponse.json({ error: "spaceId query param required" }, { status: 400 });
  }

  const projects = await db.project.findMany({
    where: { spaceId, space: { userId: user.id } }, // userId filter = the isolation check
    include: { _count: { select: { materials: true, concepts: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ projects });
}
