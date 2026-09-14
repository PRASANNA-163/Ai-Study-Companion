"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Nav from "@/components/Nav";
import StatCard from "@/components/StatCard";
import { styles, colors } from "@/lib/styles";
import { ChevronLeft, Layers, FolderOpen, Cpu, DollarSign } from "lucide-react";

interface UserDetail {
  user: { email: string; createdAt: string; lastActiveAt: string };
  learningOverview: { spaces: number; projects: number; overallMastery: number };
  activityTimeline: { type: string; createdAt: string }[];
  aiUsage: { totalRequests: number; totalCostUsd: number };
}

export default function AdminUserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<UserDetail | null>(null);
  useEffect(() => { fetch(`/api/admin/users/${id}`).then((r) => r.json()).then(setData); }, [id]);
  if (!data) return <div style={styles.page}><Nav /><div className="shimmer" style={{ height: 200, borderRadius: 16 }} /></div>;

  return (
    <div style={styles.page}>
      <Nav />
      <a href="/admin" style={{ display: "inline-flex", alignItems: "center", gap: 4, color: colors.primary, fontSize: 13, fontWeight: 600, textDecoration: "none", marginBottom: 12 }}>
        <ChevronLeft size={15} /> All Users
      </a>
      <h1 style={styles.h1}>{data.user.email}</h1>
      <p style={styles.subtitle}>Joined {new Date(data.user.createdAt).toLocaleDateString()} · Last active {new Date(data.user.lastActiveAt).toLocaleString()}</p>

      <div style={styles.statGrid}>
        <StatCard icon={Layers} value={data.learningOverview.spaces} label="Spaces" tint={colors.primary} />
        <StatCard icon={FolderOpen} value={data.learningOverview.projects} label="Projects" tint={colors.accent} />
        <StatCard icon={Cpu} value={data.aiUsage.totalRequests} label="AI Requests" tint={colors.success} />
        <StatCard icon={DollarSign} value={`$${data.aiUsage.totalCostUsd}`} label="AI Cost" tint={colors.success} />
      </div>

      <h2 style={styles.h2}>Activity Timeline</h2>
      {data.activityTimeline.map((a, i) => (
        <p key={i} style={styles.muted}>• {a.type.replaceAll("_", " ").toLowerCase()} — {new Date(a.createdAt).toLocaleString()}</p>
      ))}
    </div>
  );
}
