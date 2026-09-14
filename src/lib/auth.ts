// Auth helper — wraps Supabase Auth so every API route can get the current
// user in one line, and so data-isolation checks (PRD §52) are impossible
// to accidentally skip.

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { db } from "./db";

export async function getCurrentUser() {
  const cookieStore = cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) return null;

  // Mirror the Supabase auth user into our own `User` table on first sight.
  // This keeps our schema's foreign keys simple (User.id = Supabase auth uid)
  // while letting us store app-specific fields (isAdmin, lastActiveAt) that
  // Supabase's auth table doesn't have.
  //
  // Prototype convenience: the very first user to ever sign up becomes
  // admin automatically, so there's no separate admin-provisioning step
  // needed for a demo/evaluation. Document this in Known Limitations —
  // a real system would use an explicit invite/role-assignment flow.
  const isFirstUser = (await db.user.count()) === 0;

  const user = await db.user.upsert({
    where: { id: authUser.id },
    update: { lastActiveAt: new Date() },
    create: {
      id: authUser.id,
      email: authUser.email ?? "unknown@example.com",
      isAdmin: isFirstUser,
    },
  });

  return user;
}

export async function assertAdmin(user: { isAdmin: boolean }) {
  if (!user.isAdmin) {
    throw new Error("FORBIDDEN_NOT_ADMIN");
  }
}

// Every route handler that touches project-scoped data should call this
// instead of trusting a projectId from the request body/query directly —
// this is the actual enforcement point for PRD §52 data isolation.
export async function assertProjectOwnership(userId: string, projectId: string) {
  const project = await db.project.findFirst({
    where: { id: projectId, space: { userId } },
  });
  if (!project) {
    throw new Error("NOT_FOUND_OR_FORBIDDEN");
  }
  return project;
}
