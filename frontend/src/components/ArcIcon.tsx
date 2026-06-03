"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { getUserCards, signInWithGoogle } from "@/lib/auth";
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

// ─── Compass Rune Sigil — login entry point ───────────────────────────────────
// A geometric compass-rune that signals "vault entry" for unauthenticated users.
// Design: outer ring with quadrant ticks + crosshair + 45° diagonal wings + center pip.
function CompassRune({ color, size = 28, spinning }: { color: string; size?: number; spinning?: boolean }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      style={{
        animation: spinning ? "sigilSpin 20s linear infinite" : undefined,
        transformOrigin: "center",
      }}
    >
      {/* Outer ring */}
      <circle cx="16" cy="16" r="13" stroke={color} strokeWidth="0.75" opacity={0.6} />

      {/* Inner ring */}
      <circle cx="16" cy="16" r="8" stroke={color} strokeWidth="0.5" opacity={0.35} />

      {/* Cardinal tick marks (12/3/6/9) */}
      <line x1="16" y1="3" x2="16" y2="6"   stroke={color} strokeWidth="1.2" strokeLinecap="round" />
      <line x1="29" y1="16" x2="26" y2="16" stroke={color} strokeWidth="1.2" strokeLinecap="round" />
      <line x1="16" y1="29" x2="16" y2="26" stroke={color} strokeWidth="1.2" strokeLinecap="round" />
      <line x1="3"  y1="16" x2="6"  y2="16" stroke={color} strokeWidth="1.2" strokeLinecap="round" />

      {/* Diagonal corner ticks (45°) */}
      <line x1="25.2" y1="6.8"  x2="23.1" y2="8.9"  stroke={color} strokeWidth="0.75" opacity={0.5} />
      <line x1="6.8"  y1="6.8"  x2="8.9"  y2="8.9"  stroke={color} strokeWidth="0.75" opacity={0.5} />
      <line x1="25.2" y1="25.2" x2="23.1" y2="23.1" stroke={color} strokeWidth="0.75" opacity={0.5} />
      <line x1="6.8"  y1="25.2" x2="8.9"  y2="23.1" stroke={color} strokeWidth="0.75" opacity={0.5} />

      {/* Crosshair arms (from inner ring to outer) */}
      <line x1="16" y1="8"  x2="16" y2="3"  stroke={color} strokeWidth="0.5" opacity={0.3} />
      <line x1="16" y1="24" x2="16" y2="29" stroke={color} strokeWidth="0.5" opacity={0.3} />
      <line x1="8"  y1="16" x2="3"  y2="16" stroke={color} strokeWidth="0.5" opacity={0.3} />
      <line x1="24" y1="16" x2="29" y2="16" stroke={color} strokeWidth="0.5" opacity={0.3} />

      {/* Center pip */}
      <circle cx="16" cy="16" r="1.5" fill={color} opacity={0.9} />

      {/* Needle pointing up — the "arc" pointer */}
      <path d="M16 12 L14.5 16 L16 14.5 L17.5 16 Z" fill={color} opacity={0.8} />
    </svg>
  );
}

export default function ArcIcon() {
  const { user, loading } = useAuth();
  const [recentCard, setRecentCard] = useState<any>(null);
  const [hovered, setHovered] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (user) {
      getUserCards().then(cards => {
        if (cards && cards.length > 0) {
          setRecentCard(cards[0]);
        }
      }).catch(console.error);
    } else {
      setRecentCard(null);
    }
  }, [user, pathname]);

  // Hide on profile page entirely
  if (pathname === "/profile") return null;
  // Don't render until auth is resolved (prevents flash)
  if (loading) return null;

  // ─── Unauthenticated: show compass-rune sigil ─────────────────────────────
  if (!user) {
    const handleVaultEntry = async () => {
      if (signingIn) return;
      setSigningIn(true);
      try {
        await signInWithGoogle();
        // OAuth redirect takes over — no further action needed
      } catch (err) {
        console.error("Sign-in error:", err);
        setSigningIn(false);
      }
    };

    return (
      <div
        onClick={handleVaultEntry}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        title="Enter your vault"
        style={{
          position: "fixed",
          top: "24px",
          left: "24px",
          zIndex: 1000,
          cursor: signingIn ? "wait" : "pointer",
          display: "flex",
          alignItems: "center",
          gap: "10px",
        }}
      >
        {/* Glow halo behind sigil */}
        <div style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}>
          {/* Animated glow ring */}
          <div style={{
            position: "absolute",
            inset: "-6px",
            borderRadius: "50%",
            background: `radial-gradient(circle, rgba(184,150,12,${hovered ? 0.2 : 0.06}) 0%, transparent 70%)`,
            transition: "all 0.4s ease",
          }} />
          <div style={{
            transform: hovered ? "scale(1.15)" : "scale(1)",
            transition: "transform 0.3s ease",
            opacity: signingIn ? 0.5 : 1,
          }}>
            <CompassRune color="#b8960c" size={26} spinning={!signingIn} />
          </div>
        </div>

        {/* Slide-in label */}
        <div style={{
          opacity: hovered ? 1 : 0,
          transform: hovered ? "translateX(0)" : "translateX(-8px)",
          transition: "all 0.3s ease",
          pointerEvents: "none",
          whiteSpace: "nowrap",
        }}>
          <div style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: "8px",
            color: "#b8960c",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            lineHeight: 1.4,
          }}>
            {signingIn ? "ENTERING..." : "ENTER YOUR VAULT"}
          </div>
          <div style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: "7px",
            color: "#4a4438",
            letterSpacing: "0.1em",
            marginTop: "2px",
          }}>
            Sign in with Google
          </div>
        </div>

        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes sigilSpin {
            from { transform: rotate(0deg); }
            to   { transform: rotate(360deg); }
          }
        `}} />
      </div>
    );
  }

  // ─── Authenticated: show archetype symbol ─────────────────────────────────
  const archetype = recentCard?.archetype || "unknown";
  const meta = recentCard ? getMeta(archetype) : { color: "#8a7e6e", label: "YOUR VAULT" };

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
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}>
        <div style={{
          position: "absolute",
          inset: "-8px",
          borderRadius: "50%",
          background: `radial-gradient(circle, ${meta.color}${hovered ? "22" : "0a"} 0%, transparent 70%)`,
          transition: "all 0.4s ease",
        }} />
        <div style={{
          animation: "arcPulse 3s infinite",
          transition: "transform 0.3s ease",
          transform: hovered ? "scale(1.1)" : "scale(1)",
        }}>
          <ArchetypeSymbol archetype={archetype} color={meta.color} size={24} />
        </div>
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
        @keyframes arcPulse {
          0%   { opacity: 0.6; }
          50%  { opacity: 1; }
          100% { opacity: 0.6; }
        }
        @keyframes sigilSpin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}} />
    </div>
  );
}
