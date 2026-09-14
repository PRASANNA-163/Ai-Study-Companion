"use client";
import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Nav from "@/components/Nav";
import TutorAvatar from "@/components/TutorAvatar";
import { styles, colors } from "@/lib/styles";
import { ChevronLeft, Upload, FileText, CheckCircle2, Clock, XCircle, Send, BrainCog, BarChart3 } from "lucide-react";

interface Material {
  id: string;
  filename: string;
  status: "QUEUED" | "PROCESSING" | "READY" | "FAILED";
  errorMessage: string | null;
}
interface ChatMsg {
  role: "USER" | "ASSISTANT";
  content: string;
  citedSources?: { filename: string; page: number | null }[];
  isUnsupported?: boolean;
}

const statusMeta: Record<string, { color: string; bg: string; icon: any; label: string }> = {
  QUEUED: { color: "#92400E", bg: "#FEF3C7", icon: Clock, label: "Queued" },
  PROCESSING: { color: "#1D4ED8", bg: "#DBEAFE", icon: Clock, label: "Processing" },
  READY: { color: "#065F46", bg: "#D1FAE5", icon: CheckCircle2, label: "Ready" },
  FAILED: { color: "#991B1B", bg: "#FEE2E2", icon: XCircle, label: "Failed" },
};

export default function ProjectPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [uploading, setUploading] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [question, setQuestion] = useState("");
  const [conversationId, setConversationId] = useState<string | undefined>(undefined);
  const [asking, setAsking] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  async function loadMaterials() {
    const res = await fetch(`/api/materials?projectId=${projectId}`);
    const data = await res.json();
    setMaterials(data.materials ?? []);
  }

  useEffect(() => {
    loadMaterials();
    const interval = setInterval(loadMaterials, 4000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, asking]);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    const file = fileInputRef.current?.files?.[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("projectId", projectId);
    const res = await fetch("/api/materials", { method: "POST", body: formData });
    setUploading(false);
    if (res.ok) {
      if (fileInputRef.current) fileInputRef.current.value = "";
      loadMaterials();
    } else {
      const data = await res.json();
      alert(data.error ?? "Upload failed");
    }
  }

  async function askTutor(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim()) return;
    const q = question;
    setQuestion("");
    setMessages((m) => [...m, { role: "USER", content: q }]);
    setAsking(true);
    const res = await fetch("/api/tutor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, conversationId, question: q }),
    });
    setAsking(false);
    if (!res.ok) {
      setMessages((m) => [...m, { role: "ASSISTANT", content: "Hmm, something went wrong on my end. Try again?", isUnsupported: true }]);
      return;
    }
    const data = await res.json();
    setConversationId(data.conversationId);
    setMessages((m) => [...m, { role: "ASSISTANT", content: data.message.content, citedSources: data.message.citedSources, isUnsupported: data.message.isUnsupported }]);
  }

  const readyMaterials = materials.filter((m) => m.status === "READY").length;

  return (
    <div style={styles.page}>
      <Nav />
      <a href="#" onClick={() => window.history.back()} style={{ display: "inline-flex", alignItems: "center", gap: 4, color: colors.primary, fontSize: 13, fontWeight: 600, textDecoration: "none", marginBottom: 12 }}>
        <ChevronLeft size={15} /> Back
      </a>
      <h1 style={styles.h1}>Project Workspace</h1>

      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        <a href={`/projects/${projectId}/quiz`}>
          <button style={{ ...styles.button, ...(readyMaterials === 0 ? styles.buttonDisabled : {}) }} disabled={readyMaterials === 0}>
            <BrainCog size={16} /> Take Adaptive Quiz
          </button>
        </a>
        <a href={`/projects/${projectId}/analytics`}>
          <button style={styles.buttonSecondary}><BarChart3 size={16} /> Growth & Analytics</button>
        </a>
      </div>
      {readyMaterials === 0 && <p style={styles.muted}>📌 Upload a PDF and wait for it to finish processing before taking a quiz.</p>}

      <h2 style={styles.h2}><FileText size={16} color={colors.primary} /> Learning Materials</h2>
      <form onSubmit={handleUpload} style={{ ...styles.card, border: `2px dashed ${colors.border}`, textAlign: "center", padding: 24 }}>
        <Upload size={22} color={colors.primary} style={{ marginBottom: 8 }} />
        <div style={{ marginBottom: 10 }}>
          <input ref={fileInputRef} type="file" accept="application/pdf" style={{ fontSize: 13 }} />
        </div>
        <button style={{ ...styles.button, ...(uploading ? styles.buttonDisabled : {}) }} disabled={uploading}>
          {uploading ? "Uploading..." : <><Upload size={15} /> Upload PDF</>}
        </button>
      </form>

      {materials.map((m) => {
        const meta = statusMeta[m.status];
        const Icon = meta.icon;
        return (
          <div key={m.id} style={{ ...styles.card, marginBottom: 8, padding: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }} className="fade-in-up">
            <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}><FileText size={15} color={colors.muted} /> {m.filename}</span>
            <span style={styles.badge(meta.bg, meta.color)}><Icon size={12} /> {meta.label}</span>
          </div>
        );
      })}
      {materials.some((m) => m.status === "FAILED") && (
        <p style={styles.error}>{materials.find((m) => m.status === "FAILED")?.errorMessage}</p>
      )}

      <h2 style={styles.h2}><TutorAvatar size={22} /> Ask Nova, Your AI Tutor</h2>
      <div style={{ ...styles.card, minHeight: 220, maxHeight: 440, overflowY: "auto", padding: 16 }}>
        <div style={{ display: "flex", gap: 10, marginBottom: 14 }} className="fade-in-up">
          <TutorAvatar size={32} />
          <div style={{ background: "#F3F0FF", borderRadius: "4px 14px 14px 14px", padding: "10px 14px", fontSize: 14, maxWidth: "80%" }}>
            Hi! I'm <strong>Nova</strong> 👋 Ask me anything about your uploaded materials — I'll always show you exactly where my answer came from.
          </div>
        </div>
        {messages.length === 0 && readyMaterials === 0 && (
          <p style={styles.muted}>Upload material above to start chatting.</p>
        )}
        {messages.map((m, i) => (
          <div key={i} className="fade-in-up" style={{ display: "flex", gap: 10, marginBottom: 14, flexDirection: m.role === "USER" ? "row-reverse" : "row" }}>
            {m.role === "ASSISTANT" && <TutorAvatar size={32} />}
            <div
              style={{
                padding: "10px 14px",
                borderRadius: m.role === "USER" ? "14px 4px 14px 14px" : "4px 14px 14px 14px",
                background: m.role === "USER" ? colors.gradient : m.isUnsupported ? colors.warningBg : "#F3F0FF",
                color: m.role === "USER" ? "white" : colors.ink,
                maxWidth: "78%",
                fontSize: 14,
              }}
            >
              {m.content}
              {m.citedSources && m.citedSources.length > 0 && (
                <div style={{ fontSize: 11, marginTop: 6, opacity: 0.7, display: "flex", alignItems: "center", gap: 4 }}>
                  📄 {m.citedSources.map((s, j) => (
                    <span key={j}>{s.filename}{s.page ? ` (p.${s.page})` : ""}{j < m.citedSources!.length - 1 ? ", " : ""}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {asking && (
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <TutorAvatar size={32} thinking />
            <div style={{ background: "#F3F0FF", borderRadius: "4px 14px 14px 14px", padding: "10px 16px", display: "flex", gap: 4 }}>
              <span className="typing-dot" style={{ animationDelay: "0s" }}>●</span>
              <span className="typing-dot" style={{ animationDelay: "0.15s" }}>●</span>
              <span className="typing-dot" style={{ animationDelay: "0.3s" }}>●</span>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>
      <form onSubmit={askTutor} style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <input style={{ ...styles.input, marginBottom: 0, flex: 1 }} placeholder="Ask Nova a question..." value={question} onChange={(e) => setQuestion(e.target.value)} disabled={readyMaterials === 0} />
        <button style={{ ...styles.button, ...((asking || readyMaterials === 0) ? styles.buttonDisabled : {}) }} disabled={asking || readyMaterials === 0}><Send size={15} /></button>
      </form>
    </div>
  );
}
