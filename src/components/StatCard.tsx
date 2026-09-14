import { LucideIcon } from "lucide-react";
import { styles, colors } from "@/lib/styles";

export default function StatCard({ icon: Icon, value, label, tint = colors.primary }: { icon: LucideIcon; value: string | number; label: string; tint?: string }) {
  return (
    <div style={{ ...styles.card, marginBottom: 0 }} className="fade-in-up">
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
        <div style={{ width: 32, height: 32, borderRadius: 10, background: `${tint}1A`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon size={17} color={tint} />
        </div>
      </div>
      <div style={{ fontSize: 22, fontWeight: 800 }}>{value}</div>
      <div style={styles.muted}>{label}</div>
    </div>
  );
}
