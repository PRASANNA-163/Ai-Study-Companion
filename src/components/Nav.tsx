"use client";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import { colors } from "@/lib/styles";
import { Home, BarChart3, ShieldCheck, LogOut, GraduationCap } from "lucide-react";

const links = [
  { href: "/spaces", label: "Home", icon: Home },
  { href: "/analytics", label: "My Analytics", icon: BarChart3 },
  { href: "/admin", label: "Admin", icon: ShieldCheck },
];

export default function Nav() {
  const router = useRouter();
  const pathname = usePathname();

  async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <nav
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "12px 20px",
        marginBottom: 28,
        background: colors.glass,
        backdropFilter: "blur(10px)",
        borderRadius: 16,
        border: `1px solid ${colors.border}`,
        boxShadow: "0 4px 20px rgba(109,40,217,0.06)",
        flexWrap: "wrap",
        gap: 12,
      }}
    >
      <a href="/spaces" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none", fontWeight: 800, color: colors.ink, fontSize: 15 }}>
        <div style={{ width: 30, height: 30, borderRadius: 9, background: colors.gradient, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <GraduationCap size={17} color="white" />
        </div>
        StudyMate
      </a>
      <div style={{ display: "flex", gap: 4, alignItems: "center", flexWrap: "wrap" }}>
        {links.map((l) => {
          const active = pathname?.startsWith(l.href);
          return (
            <a
              key={l.href}
              href={l.href}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "7px 12px",
                borderRadius: 10,
                textDecoration: "none",
                fontSize: 13,
                fontWeight: 600,
                color: active ? colors.primary : colors.muted,
                background: active ? "#EDE7FB" : "transparent",
              }}
            >
              <l.icon size={15} />
              {l.label}
            </a>
          );
        })}
        <a
          href="#"
          onClick={(e) => { e.preventDefault(); logout(); }}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 12px", borderRadius: 10, textDecoration: "none", fontSize: 13, fontWeight: 600, color: colors.danger }}
        >
          <LogOut size={15} />
          Log out
        </a>
      </div>
    </nav>
  );
}
