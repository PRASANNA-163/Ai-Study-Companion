import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, assertProjectOwnership } from "@/lib/auth";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

// Service-role client for server-side storage writes — never expose this
// key to the browser.
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const projectId = formData.get("projectId") as string | null;

  if (!file || !projectId) {
    return NextResponse.json({ error: "file and projectId are required" }, { status: 400 });
  }
  if (file.type !== "application/pdf") {
    return NextResponse.json({ error: "Only PDF files are supported in this prototype" }, { status: 400 });
  }

  // Enforces PRD §52: a user cannot upload into a project they don't own.
  await assertProjectOwnership(user.id, projectId);

  const storagePath = `${user.id}/${projectId}/${randomUUID()}-${file.name}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabaseAdmin.storage
    .from("materials")
    .upload(storagePath, buffer, { contentType: "application/pdf" });

  if (uploadError) {
    return NextResponse.json({ error: "Upload failed", detail: uploadError.message }, { status: 500 });
  }

  const material = await db.material.create({
    data: {
      projectId,
      filename: file.name,
      storagePath,
      status: "QUEUED",
    },
  });

  // Enqueue background processing rather than parsing the PDF inline —
  // this is PRD §14/§15: long-running work must not block the request.
  await db.job.create({
    data: {
      type: "process_material",
      payload: { materialId: material.id },
    },
  });

  await db.activityEvent.create({
    data: {
      userId: user.id,
      projectId,
      eventType: "MATERIAL_UPLOADED",
      metadata: { materialId: material.id, filename: file.name },
    },
  });

  return NextResponse.json({ material }, { status: 201 });
}

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const projectId = req.nextUrl.searchParams.get("projectId");
  if (!projectId) {
    return NextResponse.json({ error: "projectId required" }, { status: 400 });
  }
  await assertProjectOwnership(user.id, projectId);

  // Polled by the frontend to show live status: Queued -> Processing -> Ready/Failed
  const materials = await db.material.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
    select: { id: true, filename: true, status: true, errorMessage: true, createdAt: true, processedAt: true },
  });

  return NextResponse.json({ materials });
}
