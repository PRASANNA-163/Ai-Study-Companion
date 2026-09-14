"use client";
import { useEffect, useState } from "react";
import Nav from "@/components/Nav";
import EmptyState from "@/components/EmptyState";
import { styles, colors } from "@/lib/styles";
import { Plus, Layers, FolderOpen, ChevronRight } from "lucide-react";

interface Space {
  id: string;
  name: string;
  description: string | null;
  _count: { projects: number };
}

export default function SpacesPage() {
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  async function load() {
    const res = await fetch("/api/spaces");
    if (res.status === 401) { window.location.href = "/login"; return; }
    const data = await res.json();
    setSpaces(data.spaces ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function createSpace(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/spaces", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description: description || undefined }),
    });
    if (!res.ok) { const data = await res.json(); setError(JSON.stringify(data.error)); return; }
    setName(""); setDescription(""); setShowForm(false);
    load();
  }

  return (
    <div style={styles.page}>
      <Nav />
      <h1 style={styles.h1}>👋 Your Learning Spaces</h1>
      <p style={styles.subtitle}>Organize everything you're learning into focused spaces.</p>

      {!showForm ? (
        <button style={{ ...styles.button, marginBottom: 20 }} onClick={() => setShowForm(true)}>
          <Plus size={16} /> New Space
        </button>
      ) : (
        <form onSubmit={createSpace} style={styles.card} className="pop-in">
          {error && <div style={styles.error}>{error}</div>}
          <input style={styles.input} placeholder="Space name (e.g. 'Machine Learning')" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
          <input style={styles.input} placeholder="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} />
          <div style={{ display: "flex", gap: 8 }}>
            <button style={styles.button}><Plus size={16} /> Create</button>
            <button type="button" style={styles.buttonSecondary} onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </form>
      )}

      {loading ? (
        <p style={styles.muted}>Loading...</p>
      ) : spaces.length === 0 ? (
        <EmptyState icon={Layers} title="No spaces yet" subtitle="Create your first space to start organizing your learning." />
      ) : (
        spaces.map((s, i) => (
          <a key={s.id} href={`/spaces/${s.id}`} style={{ textDecoration: "none" }}>
            <div
              style={{ ...styles.card, ...styles.cardHover, display: "flex", alignItems: "center", justifyContent: "space-between" }}
              className="fade-in-up"
              onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-2px)")}
              onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: "#EDE7FB", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Layers size={19} color={colors.primary} />
                </div>
                <div>
                  <strong>{s.name}</strong>
                  <div style={styles.muted}>{s._count.projects} project{s._count.projects !== 1 ? "s" : ""}{s.description ? ` · ${s.description}` : ""}</div>
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
