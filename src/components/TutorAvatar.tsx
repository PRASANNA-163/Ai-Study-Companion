import { Sparkles } from "lucide-react";
import { colors } from "@/lib/styles";

export default function TutorAvatar({ size = 36, thinking = false }: { size?: number; thinking?: boolean }) {
  return (
    <div
      className={thinking ? "float-slow" : ""}
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: colors.gradient,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        boxShadow: "0 2px 10px rgba(109,40,217,0.35)",
      }}
    >
      <Sparkles size={size * 0.55} color="white" strokeWidth={2.2} />
    </div>
  );
}
