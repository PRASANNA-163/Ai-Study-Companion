"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      router.replace(data.user ? "/spaces" : "/login");
    });
  }, [router]);

  return <div style={{ padding: 40, fontFamily: "system-ui" }}>Loading...</div>;
}
