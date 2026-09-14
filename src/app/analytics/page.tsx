"use client";
import { useEffect, useState } from "react";
import Nav from "@/components/Nav";
import StatCard from "@/components/StatCard";
import ProgressRing from "@/components/ProgressRing";
import { styles, colors } from "@/lib/styles";
import { Flame, Layers, FolderOpen, Target, MessageCircle, BrainCog } from "lucide-react";

interface GlobalData {
  overallLearning: { totalSpaces: number; totalProjects: number; activeDays: number; currentStreak: number };
  performance: { overallMastery: number; quizAccuracy: number | null; conceptsImproving: number; conceptsNeedingAttention: number };
  aiUsage: { tutorQuestionsAsked: number; quizQuestionsAnswered: number };
}

export default function GlobalAnalyticsPage() {
  const [data, setData] = useState<GlobalData | null>(null);
  useEffect(() => { fetch("/api/analytics/global").then((r) => r.json()).then(setData); }, []);
  if (!data) return <div style={styles.page}><Nav /><div className="shimmer" style={{ height: 200, borderRadius: 16 }} /></div>;

  return (
    <div style={styles.page}>
      <Nav />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={styles.h1}>📊 Your Learning Journey</h1>
          <p style={styles.subtitle}>A bird's-eye view across everything you're learning.</p>
        </div>
        {data.overallLearning.currentStreak > 0 && (
          <div className="pop-in" style={{ ...styles.card, marginBottom: 0, display: "flex", alignItems: "center", gap: 10, background: colors.gradientWarm, color: "white" }}>
            <Flame size={26} />
            <div>
              <div style={{ fontSize: 20, fontWeight: 800 }}>{data.overallLearning.currentStreak} day{data.overallLearning.currentStreak !== 1 ? "s" : ""}</div>
              <div style={{ fontSize: 12, opacity: 0.9 }}>current streak</div>
            </div>
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 24, alignItems: "center", ...styles.card, padding: 24, marginTop: 16 }}>
        <ProgressRing pct={data.performance.overallMastery} size={100} label="mastery" />
        <div>
          <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 4 }}>Overall Mastery</div>
          <p style={styles.muted}>
            {data.performance.conceptsImproving} concept{data.performance.conceptsImproving !== 1 ? "s" : ""} improving,{" "}
            {data.performance.conceptsNeedingAttention} need{data.performance.conceptsNeedingAttention !== 1 ? "" : "s"} attention.
          </p>
          {data.performance.quizAccuracy !== null && <p style={styles.muted}>Quiz accuracy: <strong>{data.performance.quizAccuracy}%</strong></p>}
        </div>
      </div>

      <h2 style={styles.h2}>Overview</h2>
      <div style={styles.statGrid}>
        <StatCard icon={Layers} value={data.overallLearning.totalSpaces} label="Spaces" tint={colors.primary} />
        <StatCard icon={FolderOpen} value={data.overallLearning.totalProjects} label="Projects" tint={colors.accent} />
        <StatCard icon={Target} value={data.overallLearning.activeDays} label="Active days" tint={colors.success} />
        <StatCard icon={MessageCircle} value={data.aiUsage.tutorQuestionsAsked} label="Tutor questions" tint={colors.primary} />
        <StatCard icon={BrainCog} value={data.aiUsage.quizQuestionsAnswered} label="Quiz answers" tint={colors.accent} />
      </div>
    </div>
  );
}
