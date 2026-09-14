"use client";
import { useState } from "react";
import { useParams } from "next/navigation";
import Nav from "@/components/Nav";
import { styles, colors } from "@/lib/styles";
import { ChevronLeft, Flame, CheckCircle2, XCircle, ArrowRight, Sparkles, StopCircle, Lightbulb, Trophy, RotateCcw } from "lucide-react";

interface Question {
  id: string;
  type: "MCQ" | "OPEN_ENDED" | "FILL_BLANK";
  difficulty: number;
  question: string;
  options: string[] | null;
  concept: string;
}
interface Feedback {
  isCorrect: boolean; feedback: string; explanation: string | null;
  masteryBefore: number; masteryAfter: number; concept: string;
}
interface SummaryQuestion {
  id: string; type: string; concept: string; question: string; options: string[] | null;
  correctAnswer: string | null; userAnswer: string | null; isCorrect: boolean | null;
  feedback: string | null; explanation: string | null;
}
interface Summary { score: number; totalAnswered: number; totalCorrect: number; questions: SummaryQuestion[]; }

const typeOptions = [
  { value: "MIXED", label: "Mixed" },
  { value: "MCQ", label: "Multiple Choice" },
  { value: "FILL_BLANK", label: "Fill in the Blank" },
  { value: "OPEN_ENDED", label: "Open-Ended" },
];
const countOptions = [5, 10, 15];

export default function QuizPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [phase, setPhase] = useState<"setup" | "quiz" | "results">("setup");
  const [typePreference, setTypePreference] = useState("MIXED");
  const [targetCount, setTargetCount] = useState<number | null>(10);

  const [quizId, setQuizId] = useState<string | undefined>(undefined);
  const [question, setQuestion] = useState<Question | null>(null);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [loading, setLoading] = useState(false);
  const [questionCount, setQuestionCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [streak, setStreak] = useState(0);
  const [showExplanation, setShowExplanation] = useState(false);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [expandedReview, setExpandedReview] = useState<string | null>(null);

  async function startQuiz() {
    setPhase("quiz");
    await nextQuestion(true);
  }

  async function nextQuestion(isFirst = false) {
    setLoading(true); setFeedback(null); setAnswer(""); setError(null); setShowExplanation(false);
    const res = await fetch("/api/quiz/start", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        isFirst
          ? { projectId, typePreference, targetCount: targetCount ?? undefined }
          : { projectId, quizId }
      ),
    });
    setLoading(false);
    if (!res.ok) { const data = await res.json(); setError(data.error ?? "Failed to load question"); return; }
    const data = await res.json();
    if (data.done) { await endQuiz(); return; }
    setQuizId(data.quizId); setQuestion(data.question); setQuestionCount((c) => c + 1);
  }

  async function submitAnswer(e: React.FormEvent) {
    e.preventDefault();
    if (!question || !answer.trim()) return;
    setLoading(true);
    const res = await fetch("/api/quiz/answer", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionId: question.id, answer }),
    });
    setLoading(false);
    if (!res.ok) { const data = await res.json(); setError(data.error ?? "Grading failed"); return; }
    const data: Feedback = await res.json();
    setFeedback(data);
    setStreak((s) => (data.isCorrect ? s + 1 : 0));
  }

  async function endQuiz() {
    if (!quizId) { setPhase("setup"); return; }
    setLoading(true);
    const res = await fetch(`/api/quiz/${quizId}/summary`);
    setLoading(false);
    if (!res.ok) return;
    const data: Summary = await res.json();
    setSummary(data);
    setPhase("results");
  }

  function restartQuiz() {
    setPhase("setup"); setQuizId(undefined); setQuestion(null); setFeedback(null);
    setQuestionCount(0); setStreak(0); setSummary(null); setError(null);
  }

  return (
    <div style={styles.page}>
      <Nav />
      <a href={`/projects/${projectId}`} style={{ display: "inline-flex", alignItems: "center", gap: 4, color: colors.primary, fontSize: 13, fontWeight: 600, textDecoration: "none", marginBottom: 12 }}>
        <ChevronLeft size={15} /> Back to Project
      </a>

      {phase === "setup" && (
        <div className="fade-in-up">
          <h1 style={styles.h1}>🧠 Adaptive Quiz</h1>
          <p style={styles.subtitle}>Set up your quiz — Nova will pick questions based on what you're weakest at.</p>
          {error && <div style={styles.error}>{error}</div>}

          <div style={styles.card}>
            <div style={{ fontWeight: 700, marginBottom: 10, fontSize: 14 }}>Question type</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
              {typeOptions.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setTypePreference(t.value)}
                  style={typePreference === t.value ? styles.button : styles.buttonSecondary}
                  type="button"
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div style={{ fontWeight: 700, marginBottom: 10, fontSize: 14 }}>Number of questions</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
              {countOptions.map((c) => (
                <button key={c} onClick={() => setTargetCount(c)} style={targetCount === c ? styles.button : styles.buttonSecondary} type="button">{c}</button>
              ))}
              <button onClick={() => setTargetCount(null)} style={targetCount === null ? styles.button : styles.buttonSecondary} type="button">Until I stop</button>
            </div>

            <button style={styles.button} onClick={startQuiz}><Sparkles size={16} /> Start Quiz</button>
          </div>
        </div>
      )}

      {phase === "quiz" && (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <h1 style={{ ...styles.h1, marginBottom: 0 }}>🧠 Adaptive Quiz</h1>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {streak > 1 && <span style={styles.badge("#FEF3C7", "#92400E")} className="pop-in"><Flame size={13} /> {streak} streak</span>}
              <button style={{ ...styles.buttonSecondary, padding: "7px 12px", fontSize: 12 }} onClick={endQuiz}><StopCircle size={14} /> End Quiz</button>
            </div>
          </div>
          {targetCount && <p style={styles.muted}>Question {questionCount} of {targetCount}</p>}
          {error && <div style={styles.error}>{error}</div>}

          {loading && <div className="shimmer" style={{ height: 140, borderRadius: 16 }} />}

          {question && !feedback && !loading && (
            <div style={styles.card} className="fade-in-up">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <span style={styles.badge("#EDE7FB", colors.primary)}>{question.concept} · {question.type.replace("_", " ")}</span>
                <span style={{ display: "flex", gap: 2 }}>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Flame key={i} size={14} color={i < question.difficulty ? colors.accent : "#E5E0F5"} fill={i < question.difficulty ? colors.accent : "none"} />
                  ))}
                </span>
              </div>
              <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 16 }}>{question.question}</h2>
              <form onSubmit={submitAnswer}>
                {question.type === "MCQ" && question.options ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
                    {question.options.map((opt, i) => (
                      <label key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 12, cursor: "pointer", border: `1.5px solid ${answer === opt ? colors.primary : colors.border}`, background: answer === opt ? "#F3F0FF" : "white", fontSize: 14 }}>
                        <input type="radio" name="answer" value={opt} checked={answer === opt} onChange={() => setAnswer(opt)} style={{ accentColor: colors.primary }} /> {opt}
                      </label>
                    ))}
                  </div>
                ) : question.type === "FILL_BLANK" ? (
                  <input style={styles.input} value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Fill in the blank..." autoFocus />
                ) : (
                  <textarea style={{ ...styles.input, minHeight: 100 }} value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Type your answer..." />
                )}
                <button style={{ ...styles.button, ...(!answer.trim() ? styles.buttonDisabled : {}) }} disabled={!answer.trim()}>Submit Answer <ArrowRight size={15} /></button>
              </form>
            </div>
          )}

          {feedback && (
            <div style={{ ...styles.card, textAlign: "center", padding: 28 }} className="pop-in">
              {feedback.isCorrect ? <CheckCircle2 size={44} color={colors.success} style={{ marginBottom: 8 }} /> : <XCircle size={44} color={colors.danger} style={{ marginBottom: 8 }} />}
              <p style={{ fontWeight: 800, fontSize: 18, color: feedback.isCorrect ? colors.success : colors.danger, marginBottom: 6 }}>
                {feedback.isCorrect ? ["Nice work! 🎉", "Correct! 🔥", "You got it! ✨"][questionCount % 3] : "Not quite"}
              </p>
              <p style={{ color: colors.muted, marginBottom: 10 }}>{feedback.feedback}</p>

              {feedback.explanation && (
                <div style={{ marginBottom: 14 }}>
                  {!showExplanation ? (
                    <button type="button" style={{ ...styles.buttonSecondary, padding: "6px 14px", fontSize: 12 }} onClick={() => setShowExplanation(true)}>
                      <Lightbulb size={13} /> Show explanation
                    </button>
                  ) : (
                    <div className="fade-in-up" style={{ background: "#F3F0FF", borderRadius: 10, padding: 12, fontSize: 13, textAlign: "left", display: "flex", gap: 8 }}>
                      <Lightbulb size={15} color={colors.primary} style={{ flexShrink: 0, marginTop: 1 }} />
                      <span>{feedback.explanation}</span>
                    </div>
                  )}
                </div>
              )}

              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#F3F0FF", padding: "6px 14px", borderRadius: 999, fontSize: 13, fontWeight: 600, marginBottom: 18 }}>
                {feedback.concept}: {feedback.masteryBefore}% <ArrowRight size={13} /> <span style={{ color: colors.primary }}>{feedback.masteryAfter}%</span>
              </div>
              <br />
              <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                <button style={styles.button} onClick={() => nextQuestion(false)}>Next Question <ArrowRight size={15} /></button>
                <button style={styles.buttonSecondary} onClick={endQuiz}><StopCircle size={15} /> End Quiz</button>
              </div>
            </div>
          )}
        </>
      )}

      {phase === "results" && summary && (
        <div className="fade-in-up">
          <div style={{ ...styles.card, textAlign: "center", padding: 32, background: colors.gradient, color: "white" }}>
            <Trophy size={40} style={{ marginBottom: 10 }} />
            <div style={{ fontSize: 34, fontWeight: 800 }}>{summary.score}%</div>
            <div style={{ opacity: 0.9 }}>{summary.totalCorrect} of {summary.totalAnswered} correct</div>
          </div>

          <button style={{ ...styles.button, margin: "16px 0" }} onClick={restartQuiz}><RotateCcw size={15} /> Take Another Quiz</button>

          <h2 style={styles.h2}>Review Your Answers</h2>
          {summary.questions.map((q) => (
            <div key={q.id} style={styles.card}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", cursor: "pointer" }} onClick={() => setExpandedReview(expandedReview === q.id ? null : q.id)}>
                <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  {q.isCorrect ? <CheckCircle2 size={18} color={colors.success} style={{ flexShrink: 0, marginTop: 2 }} /> : <XCircle size={18} color={colors.danger} style={{ flexShrink: 0, marginTop: 2 }} />}
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{q.question}</div>
                    <div style={styles.muted}>{q.concept}</div>
                  </div>
                </div>
              </div>
              {expandedReview === q.id && (
                <div className="fade-in-up" style={{ marginTop: 12, paddingLeft: 28, fontSize: 13 }}>
                  <p><strong>Your answer:</strong> {q.userAnswer}</p>
                  {q.correctAnswer && !q.isCorrect && <p><strong>Correct answer:</strong> {q.correctAnswer}</p>}
                  {q.feedback && <p style={styles.muted}>{q.feedback}</p>}
                  {q.explanation && (
                    <div style={{ background: "#F3F0FF", borderRadius: 10, padding: 10, marginTop: 8, display: "flex", gap: 8 }}>
                      <Lightbulb size={14} color={colors.primary} style={{ flexShrink: 0, marginTop: 1 }} />
                      <span>{q.explanation}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
