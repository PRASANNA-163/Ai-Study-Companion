// Design system — "Nova" theme: violet/indigo primary with warm amber accent,
// soft gradient background, glassmorphism cards. Chosen deliberately to feel
// distinct from generic teal/blue SaaS templates, fitting for a study/learning product.

export const colors = {
  primary: "#6D28D9",       // violet-700
  primaryLight: "#8B5CF6",  // violet-500
  gradient: "linear-gradient(135deg, #7C3AED 0%, #4F46E5 100%)",
  gradientWarm: "linear-gradient(135deg, #F59E0B 0%, #EF4444 100%)",
  accent: "#F59E0B",        // amber-500
  success: "#10B981",
  successBg: "#D1FAE5",
  danger: "#EF4444",
  dangerBg: "#FEE2E2",
  warning: "#F59E0B",
  warningBg: "#FEF3C7",
  ink: "#1E1B2E",
  muted: "#6B6478",
  border: "rgba(109, 40, 217, 0.12)",
  glass: "rgba(255, 255, 255, 0.72)",
};

export const styles = {
  page: { maxWidth: 920, margin: "0 auto", padding: "28px 20px 60px", fontFamily: "'Plus Jakarta Sans', sans-serif", color: colors.ink },

  h1: { fontSize: 26, fontWeight: 800, marginBottom: 6, letterSpacing: -0.5 },
  h2: { fontSize: 17, fontWeight: 700, marginTop: 28, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 },
  subtitle: { color: colors.muted, fontSize: 14, marginBottom: 20 },
  muted: { color: colors.muted, fontSize: 13 },
  error: { color: colors.danger, fontSize: 14, marginBottom: 8, background: colors.dangerBg, padding: "8px 12px", borderRadius: 10 },

  card: {
    background: colors.glass,
    backdropFilter: "blur(10px)",
    border: `1px solid ${colors.border}`,
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    boxShadow: "0 4px 24px rgba(109, 40, 217, 0.06)",
    transition: "transform 0.15s ease, box-shadow 0.15s ease",
  },
  cardHover: {
    cursor: "pointer",
  },

  input: {
    display: "block",
    width: "100%",
    padding: "10px 14px",
    marginBottom: 10,
    border: `1.5px solid ${colors.border}`,
    borderRadius: 12,
    fontSize: 14,
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    boxSizing: "border-box" as const,
    background: "white",
    outline: "none",
  },

  button: {
    padding: "10px 20px",
    background: colors.gradient,
    color: "white",
    border: "none",
    borderRadius: 12,
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 700,
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    boxShadow: "0 4px 14px rgba(109, 40, 217, 0.28)",
  },
  buttonSecondary: {
    padding: "10px 20px",
    background: "white",
    color: colors.primary,
    border: `1.5px solid ${colors.border}`,
    borderRadius: 12,
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 700,
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
  },
  buttonDisabled: { opacity: 0.5, cursor: "not-allowed" },

  badge: (bg: string, fg: string = "white") => ({
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    padding: "3px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 700,
    background: bg,
    color: fg,
  }),

  progressBarOuter: { background: "#EDE7FB", borderRadius: 8, height: 10, width: "100%", overflow: "hidden" },
  progressBarInner: (pct: number, gradient = colors.gradient) => ({
    background: gradient,
    height: "100%",
    width: `${pct}%`,
    borderRadius: 8,
    transition: "width 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)",
  }),

  statGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 },
};
