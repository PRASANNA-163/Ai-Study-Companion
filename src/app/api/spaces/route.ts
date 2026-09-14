import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

const createSpaceSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
});

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Owner-scoped by construction — impossible to leak another user's spaces
  // because userId comes from the session, never from the request.
  const spaces = await db.space.findMany({
    where: { userId: user.id },
    include: { _count: { select: { projects: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ spaces });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = createSpaceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const space = await db.space.create({
    data: { userId: user.id, ...parsed.data },
  });

  await db.activityEvent.create({
    data: { userId: user.id, eventType: "SPACE_CREATED", metadata: { spaceId: space.id } },
  });

  return NextResponse.json({ space }, { status: 201 });
}
