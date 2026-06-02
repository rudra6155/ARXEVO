"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { getUserCards } from "@/lib/auth";
import { useAuth } from "@/components/AuthProvider";

const ARCHETYPE_META: Record<string, { color: string; label: string }> = {
  architect: { color: "#b8960c", label: "ARCHITECT" },
  catalyst:  { color: "#8a7e6e", label: "CATALYST"  },
  anchor:    { color: "#e8e0d0", label: "ANCHOR"    },
  operator:  { color: "#c41e1e", label: "OPERATOR"  },
};

function getMeta(archetype: string) {
  const key = archetype?.toLowerCase().trim();
  return ARCHETYPE_META[key] ?? { color: "#8a7e6e", label: archetype?.toUpperCase() ?? "UNKNOWN" };
}

function ArchetypeSymbol({ archetype, color, size = 24 }: { archetype: string; color: string; size?: number }) {
  const key = archetype?.toLowerCase().trim();
  const base = { stroke: color, strokeWidth: 1.5, fill: "none", strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

  if (key === "architect") return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <rect x="6" y="6" width="8" height="8" {...base} />
      <rect x="18" y="6" width="8" height="8" {...base} />
      <rect x="6" y="18" width="8" height="8" {...base} />
      <rect x="18" y="18" width="8" height="8" {...base} />
    </svg>
  );
  if (key === "catalyst") return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <line x1="8" y1="24" x2="24" y2="8" {...base} />
    </svg>
  );
  if (key === "anchor") return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="10" {...base} />
      <line x1="16" y1="6" x2="16" y2="26" {...base} />
    </svg>
  );
  // operator — gear
  const teeth = Array.from({ length: 8 }, (_, i) => {
    const a = (i / 8) * Math.PI * 2;
    return { x1: 16 + Math.cos(a) * 7, y1: 16 + Math.sin(a) * 7, x2: 16 + Math.cos(a) * 11, y2: 16 + Math.sin(a) * 11 };
  });
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="5" {...base} />
      {teeth.map((t, i) => <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} {...base} />)}
    </svg>
  );
}

export default function ArcIcon() {
  const { user } = useAuth();
  const [recentCard, setRecentCard] = useState<any>(null);
  const [hovered, setHovered] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (user) {
      getUserCards().then(cards => {
        if (cards && cards.length > 0) {
          setRecentCard(cards[0]);
        }
      }).catch(console.error);
    }
  }, [user, pathname]); // Re-fetch on pathname change (in case they just saved a new card)

  if (!user || pathname === "/profile") return null;

  const archetype = recentCard?.archetype || "unknown";
  const meta = recentCard ? getMeta(archetype) : { color: "#8a7e6e", label: "NO ARC YET" };

  return (
    <div
      onClick={() => router.push("/profile")}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title="Your vault"
      style={{
        position: "fixed",
        top: "24px",
        left: "24px",
        zIndex: 1000,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: "12px",
      }}
    >
      <div style={{
        animation: "pulse 3s infinite",
        transition: "transform 0.3s ease",
        transform: hovered ? "scale(1.1)" : "scale(1)",
      }}>
        <ArchetypeSymbol archetype={archetype} color={meta.color} size={24} />
      </div>
      
      <span style={{
        fontFamily: "'DM Mono', monospace",
        fontSize: "9px",
        color: meta.color,
        letterSpacing: "0.15em",
        textTransform: "uppercase",
        opacity: hovered ? 1 : 0,
        transform: hovered ? "translateX(0)" : "translateX(-10px)",
        transition: "all 0.3s ease",
        whiteSpace: "nowrap",
        pointerEvents: "none",
      }}>
        {meta.label}
      </span>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes pulse {
          0% { opacity: 0.6; }
          50% { opacity: 1; }
          100% { opacity: 0.6; }
        }
      `}} />
    </div>
  );
}
