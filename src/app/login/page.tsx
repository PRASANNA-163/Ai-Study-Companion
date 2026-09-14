"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import { colors } from "@/lib/styles";
import { GraduationCap, Sparkles, BookOpen, TrendingUp } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error } = mode === "signup"
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) { setError(error.message); return; }
    router.push("/spaces");
    router.refresh();
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div style={{ display: "flex", maxWidth: 860, width: "100%", borderRadius: 24, overflow: "hidden", boxShadow: "0 20px 60px rgba(109,40,217,0.18)" }}>

        <div style={{ flex: 1, background: colors.gradient, padding: 40, color: "white", display: "flex", flexDirection: "column", justifyContent: "center", minWidth: 280 }} className="fade-in-up">
          <div className="float-slow" style={{ width: 56, height: 56, borderRadius: 16, background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
            <GraduationCap size={30} />
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 10, lineHeight: 1.2 }}>Learn smarter with StudyMate</h1>
          <p style={{ opacity: 0.9, fontSize: 14, marginBottom: 28 }}>Your AI-powered learning workspace — upload material, chat with your tutor, and track real growth.</p>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13 }}><Sparkles size={16} /> AI Tutor grounded in your own materials</div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13 }}><BookOpen size={16} /> Adaptive quizzes that target your weak spots</div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13 }}><TrendingUp size={16} /> Real growth tracking, concept by concept</div>
          </div>
        </div>

        <div style={{ flex: 1, background: "white", padding: 40, minWidth: 280 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>{mode === "login" ? "Welcome back" : "Create your account"}</h2>
          <p style={{ color: colors.muted, fontSize: 13, marginBottom: 24 }}>{mode === "login" ? "Log in to continue learning." : "Start your learning journey today."}</p>

          <form onSubmit={handleSubmit}>
            {error && <div style={{ color: colors.danger, fontSize: 13, marginBottom: 12, background: colors.dangerBg, padding: "8px 12px", borderRadius: 10 }}>{error}</div>}
            <input style={{ display: "block", width: "100%", padding: "11px 14px", marginBottom: 10, border: `1.5px solid ${colors.border}`, borderRadius: 12, fontSize: 14, boxSizing: "border-box" }} type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <input style={{ display: "block", width: "100%", padding: "11px 14px", marginBottom: 16, border: `1.5px solid ${colors.border}`, borderRadius: 12, fontSize: 14, boxSizing: "border-box" }} type="password" placeholder="Password (min 6 characters)" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
            <button style={{ width: "100%", padding: "12px 20px", background: colors.gradient, color: "white", border: "none", borderRadius: 12, cursor: "pointer", fontSize: 14, fontWeight: 700, boxShadow: "0 4px 14px rgba(109,40,217,0.28)" }} disabled={loading}>
              {loading ? "..." : mode === "signup" ? "Sign up" : "Log in"}
            </button>
          </form>
          <p style={{ marginTop: 16, fontSize: 13, color: colors.muted }}>
            {mode === "login" ? (
              <>No account? <a href="#" style={{ color: colors.primary, fontWeight: 600 }} onClick={(e) => { e.preventDefault(); setMode("signup"); }}>Sign up</a></>
            ) : (
              <>Have an account? <a href="#" style={{ color: colors.primary, fontWeight: 600 }} onClick={(e) => { e.preventDefault(); setMode("login"); }}>Log in</a></>
            )}
          </p>
          <p style={{ ...{ color: colors.muted, fontSize: 12 }, marginTop: 20 }}>Note: the first account created becomes the admin account for this deployment.</p>
        </div>
      </div>
    </div>
  );
}
