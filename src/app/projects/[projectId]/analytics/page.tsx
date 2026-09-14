"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Nav from "@/components/Nav";
import ProgressRing from "@/components/ProgressRing";
import { styles, colors } from "@/lib/styles";
import { ChevronLeft, TrendingUp, TrendingDown, Minus, Sparkles, MessageCircle, BrainCog } from "lucide-react";

interface AnalyticsData {
  overallMastery: number;
  concepts: { name: string; masteryPct: number }[];
  growth: { concept: string; previous: number; current: number; trend: string }[];
  activity: { tutorQuestionsAsked: number; quizQuestionsAnswered: number; quizAccuracy: number | null };
  recentActivity: { type: string; createdAt: string }[];
  recommendedNextStep: string;
}

const trendMeta: Record<string, { icon: any; color: string; bg: string }> = {
  Improving: { icon: TrendingUp, color: "#065F46", bg: "#D1FAE5" },
  Stable: { icon: Minus, color: "#6B6478", bg: "#EDE7FB" },
  "Needs Attention": { icon: TrendingDown, color: "#991B1B", bg: "#FEE2E2" },
};

export default function ProjectAnalyticsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [data, setData] = useState<AnalyticsData | null>(null);
  useEffect(() => { fetch(`/api/analytics/project?projectId=${projectId}`).then((r) => r.json()).then(setData); }, [projectId]);
  if (!data) return <div style={styles.page}><Nav /><div className="shimmer" style={{ height: 200, borderRadius: 16 }} /></div>;

  return (
    <div style={styles.page}>
      <Nav />
      <a href={`/projects/${projectId}`} style={{ display: "inline-flex", alignItems: "center", gap: 4, color: colors.primary, fontSize: 13, fontWeight: 600, textDecoration: "none", marginBottom: 12 }}>
        <ChevronLeft size={15} /> Back to Project
      </a>
      <h1 style={styles.h1}>📈 Growth & Analytics</h1>

      <div style={{ ...styles.card, background: colors.gradient, color: "white", display: "flex", alignItems: "center", gap: 12 }}>
        <Sparkles size={22} />
        <div>
          <div style={{ fontWeight: 700, fontSize: 13, opacity: 0.85, marginBottom: 2 }}>RECOMMENDED NEXT STEP</div>
          <div style={{ fontSize: 14 }}>{data.recommendedNextStep}</div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 24, alignItems: "center", ...styles.card, padding: 24 }}>
        <ProgressRing pct={data.overallMastery} size={90} label="mastery" />
        <div style={{ display: "flex", gap: 20 }}>
          <div><div style={{ fontSize: 20, fontWeight: 800 }}>{data.activity.tutorQuestionsAsked}</div><div style={styles.muted}><MessageCircle size={12} style={{ verticalAlign: -1 }} /> Tutor Qs</div></div>
          <div><div style={{ fontSize: 20, fontWeight: 800 }}>{data.activity.quizQuestionsAnswered}</div><div style={styles.muted}><BrainCog size={12} style={{ verticalAlign: -1 }} /> Quiz answers</div></div>
          {data.activity.quizAccuracy !== null && <div><div style={{ fontSize: 20, fontWeight: 800 }}>{data.activity.quizAccuracy}%</div><div style={styles.muted}>Accuracy</div></div>}
        </div>
      </div>

      <h2 style={styles.h2}>Concept Mastery</h2>
      {data.concepts.length === 0 && <p style={styles.muted}>No concepts extracted yet — upload material and check back once it's processed.</p>}
      {data.concepts.map((c) => (
        <div key={c.name} style={{ marginBottom: 12 }} className="fade-in-up">
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, marginBottom: 4, fontWeight: 600 }}>
            <span>{c.name}</span><span>{c.masteryPct}%</span>
          </div>
          <div style={styles.progressBarOuter}><div style={styles.progressBarInner(c.masteryPct)} /></div>
        </div>
      ))}

      <h2 style={styles.h2}>Growth Trends</h2>
      {data.growth.map((g) => {
        const meta = trendMeta[g.trend];
        const Icon = meta.icon;
        return (
          <div key={g.concept} style={{ ...styles.card, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontWeight: 600 }}>{g.concept}</span>
            <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={styles.muted}>{g.previous}% → {g.current}%</span>
              <span style={styles.badge(meta.bg, meta.color)}><Icon size={12} /> {g.trend}</span>
            </span>
          </div>
        );
      })}

      <h2 style={styles.h2}>Recent Activity</h2>
      {data.recentActivity.map((a, i) => (
        <p key={i} style={styles.muted}>• {a.type.replaceAll("_", " ").toLowerCase()} — {new Date(a.createdAt).toLocaleString()}</p>
      ))}
    </div>
  );
}
