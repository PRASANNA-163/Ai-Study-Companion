"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Nav from "@/components/Nav";
import EmptyState from "@/components/EmptyState";
import { styles, colors } from "@/lib/styles";
import { Plus, FolderOpen, ChevronRight, ChevronLeft, FileText, BrainCircuit } from "lucide-react";

interface ProjectItem {
  id: string;
  name: string;
  description: string | null;
  goal: string | null;
  _count: { materials: number; concepts: number };
}

export default function SpaceDetailPage() {
  const { spaceId } = useParams<{ spaceId: string }>();
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [name, setName] = useState("");
  const [goal, setGoal] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  async function load() {
    const res = await fetch(`/api/projects?spaceId=${spaceId}`);
    const data = await res.json();
    setProjects(data.projects ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spaceId]);

  async function createProject(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ spaceId, name, goal: goal || undefined }),
    });
    if (!res.ok) { const data = await res.json(); setError(JSON.stringify(data.error)); return; }
    setName(""); setGoal(""); setShowForm(false);
    load();
  }

  return (
    <div style={styles.page}>
      <Nav />
      <a href="/spaces" style={{ display: "inline-flex", alignItems: "center", gap: 4, color: colors.primary, fontSize: 13, fontWeight: 600, textDecoration: "none", marginBottom: 12 }}>
        <ChevronLeft size={15} /> All Spaces
      </a>
      <h1 style={styles.h1}>📁 Projects</h1>
      <p style={styles.subtitle}>Each project is its own focused learning journey.</p>

      {!showForm ? (
        <button style={{ ...styles.button, marginBottom: 20 }} onClick={() => setShowForm(true)}><Plus size={16} /> New Project</button>
      ) : (
        <form onSubmit={createProject} style={styles.card} className="pop-in">
          {error && <div style={styles.error}>{error}</div>}
          <input style={styles.input} placeholder="Project name" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
          <input style={styles.input} placeholder="Learning goal (optional)" value={goal} onChange={(e) => setGoal(e.target.value)} />
          <div style={{ display: "flex", gap: 8 }}>
            <button style={styles.button}><Plus size={16} /> Create</button>
            <button type="button" style={styles.buttonSecondary} onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </form>
      )}

      {loading ? (
        <p style={styles.muted}>Loading...</p>
      ) : projects.length === 0 ? (
        <EmptyState icon={FolderOpen} title="No projects yet" subtitle="Create a project to start uploading material and learning." />
      ) : (
        projects.map((p) => (
          <a key={p.id} href={`/projects/${p.id}`} style={{ textDecoration: "none" }}>
            <div
              style={{ ...styles.card, display: "flex", alignItems: "center", justifyContent: "space-between" }}
              className="fade-in-up"
              onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-2px)")}
              onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: "#FEF3C7", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <FolderOpen size={19} color={colors.accent} />
                </div>
                <div>
                  <strong>{p.name}</strong>
                  <div style={{ ...styles.muted, display: "flex", gap: 12, marginTop: 2 }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}><FileText size={12} /> {p._count.materials}</span>
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}><BrainCircuit size={12} /> {p._count.concepts}</span>
                    {p.goal && <span>🎯 {p.goal}</span>}
                  </div>
                </div>
              </div>
              <ChevronRight size={18} color={colors.muted} />
            </div>
          </a>
        ))
      )}
    </div>
  );
}
