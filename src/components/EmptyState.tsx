import { LucideIcon } from "lucide-react";
import { colors } from "@/lib/styles";

export default function EmptyState({ icon: Icon, title, subtitle }: { icon: LucideIcon; title: string; subtitle?: string }) {
  return (
    <div style={{ textAlign: "center", padding: "36px 20px", color: colors.muted }} className="fade-in-up">
      <div className="float-slow" style={{ display: "inline-flex", width: 56, height: 56, borderRadius: "50%", background: "#EDE7FB", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
        <Icon size={26} color={colors.primary} />
      </div>
      <div style={{ fontWeight: 700, color: colors.ink, marginBottom: 4 }}>{title}</div>
      {subtitle && <div style={{ fontSize: 13 }}>{subtitle}</div>}
    </div>
  );
}
