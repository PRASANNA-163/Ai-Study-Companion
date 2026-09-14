"use client";
import { useEffect, useState } from "react";
import Nav from "@/components/Nav";
import StatCard from "@/components/StatCard";
import { styles, colors } from "@/lib/styles";
import { Users, Layers, FolderOpen, FileText, MessageCircle, BrainCog, Cpu, AlertTriangle, Timer, DollarSign, ShieldCheck, ChevronRight } from "lucide-react";

interface Overview {
  users: { total: number; activeLast7Days: number };
  content: { totalSpaces: number; totalProjects: number; materialsUploaded: number };
  activity: { tutorQuestionsAsked: number; quizzesStarted: number };
  aiUsage: { totalRequests: number; errorRate: number; avgLatencyMs: number; estimatedCostUsd: number };
  backgroundJobs: { queued: number; processing: number; done: number; failed: number };
}
interface UserRow { id: string; email: string; isAdmin: boolean; createdAt: string; lastActiveAt: string; spaceCount: number; projectCount: number; }

export default function AdminPage() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/overview").then((r) => { if (r.status === 403) setForbidden(true); return r.json(); }),
      fetch("/api/admin/users").then((r) => r.json()),
    ]).then(([o, u]) => { setOverview(o); setUsers(u.users ?? []); });
  }, []);

  if (forbidden) return <div style={styles.page}><Nav /><p style={styles.error}>🔒 Admin access only — log in with the first account created on this deployment.</p></div>;
  if (!overview) return <div style={styles.page}><Nav /><div className="shimmer" style={{ height: 200, borderRadius: 16 }} /></div>;

  return (
    <div style={styles.page}>
      <Nav />
      <h1 style={styles.h1}><ShieldCheck size={22} style={{ verticalAlign: -3, color: colors.primary }} /> Admin Dashboard</h1>
      <p style={styles.subtitle}>Platform-wide visibility into usage, AI quality, and system health.</p>

      <h2 style={styles.h2}>Platform Overview</h2>
      <div style={styles.statGrid}>
        <StatCard icon={Users} value={overview.users.total} label={`${overview.users.activeLast7Days} active / 7d`} tint={colors.primary} />
        <StatCard icon={Layers} value={overview.content.totalSpaces} label="Spaces" tint={colors.accent} />
        <StatCard icon={FolderOpen} value={overview.content.totalProjects} label="Projects" tint={colors.success} />
        <StatCard icon={FileText} value={overview.content.materialsUploaded} label="Materials" tint={colors.primary} />
        <StatCard icon={MessageCircle} value={overview.activity.tutorQuestionsAsked} label="Tutor Qs" tint={colors.accent} />
        <StatCard icon={BrainCog} value={overview.activity.quizzesStarted} label="Quizzes" tint={colors.success} />
      </div>

      <h2 style={styles.h2}>AI Usage & Quality</h2>
      <div style={styles.statGrid}>
        <StatCard icon={Cpu} value={overview.aiUsage.totalRequests} label="AI Requests" tint={colors.primary} />
        <StatCard icon={AlertTriangle} value={`${overview.aiUsage.errorRate}%`} label="Error Rate" tint={overview.aiUsage.errorRate > 5 ? colors.danger : colors.success} />
        <StatCard icon={Timer} value={`${overview.aiUsage.avgLatencyMs}ms`} label="Avg Latency" tint={colors.accent} />
        <StatCard icon={DollarSign} value={`$${overview.aiUsage.estimatedCostUsd}`} label="Est. Cost" tint={colors.success} />
      </div>

      <h2 style={styles.h2}>System Health</h2>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <span style={styles.badge("#FEF3C7", "#92400E")}>Queued: {overview.backgroundJobs.queued}</span>
        <span style={styles.badge("#DBEAFE", "#1D4ED8")}>Processing: {overview.backgroundJobs.processing}</span>
        <span style={styles.badge("#D1FAE5", "#065F46")}>Done: {overview.backgroundJobs.done}</span>
        <span style={styles.badge("#FEE2E2", "#991B1B")}>Failed: {overview.backgroundJobs.failed}</span>
      </div>

      <h2 style={styles.h2}>Users</h2>
      {users.map((u) => (
        <a key={u.id} href={`/admin/users/${u.id}`} style={{ textDecoration: "none" }}>
          <div style={{ ...styles.card, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {u.email} {u.isAdmin && <span style={styles.badge(colors.gradient as unknown as string, "white")}>ADMIN</span>}
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 10, ...styles.muted }}>
              {u.spaceCount} spaces · {u.projectCount} projects · last active {new Date(u.lastActiveAt).toLocaleDateString()}
              <ChevronRight size={16} />
            </span>
          </div>
        </a>
      ))}
    </div>
  );
}
