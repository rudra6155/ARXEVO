"use client";

import React from "react";

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

function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
    : "138, 126, 110";
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

function TraitBar({ label, value, color, delay, triggered }: { label: string; value: number; color: string; delay: number; triggered: boolean }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "100px 1fr 30px", gap: "12px", alignItems: "center", marginBottom: "8px" }}>
      <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", color: "#8a7e6e", textTransform: "uppercase" }}>
        {label}
      </span>
      <div style={{ height: "1px", background: "#1a1a16", position: "relative", width: "100%" }}>
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            height: "1px",
            background: color,
            width: triggered ? `${value}%` : "0%",
            transition: `width 1s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`,
            boxShadow: triggered ? `0 0 8px ${color}` : "none",
          }}
        />
      </div>
      <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", color: triggered ? "#e8e0d0" : "#4a4438", textAlign: "right", transition: `color 0.5s ease ${delay + 500}ms` }}>
        {value}
      </span>
    </div>
  );
}

interface CharacterCardProps {
  archetype: string;
  secondaryArchetype?: string | null;
  traits: Record<string, number>;
  confidence?: number;
  originStory: string;
  traitsFilled?: boolean;
}

export default function CharacterCard({
  archetype,
  secondaryArchetype,
  traits,
  originStory,
  traitsFilled = true
}: CharacterCardProps) {
  const meta = getMeta(archetype);
  const traitsArray = Object.entries(traits || {}).sort((a, b) => b[1] - a[1]);

  return (
    <div
      style={{
        width: "480px",
        height: "auto",
        minHeight: "600px",
        maxWidth: "100%",
        backgroundColor: "#111109",
        backgroundImage: `radial-gradient(circle at 50% 0%, rgba(${hexToRgb(meta.color)}, 0.15) 0%, transparent 60%)`,
        border: "1px solid #2a2820",
        borderRadius: 0,
        position: "relative",
        margin: "0 auto",
        overflow: "hidden"
      }}
    >
      {/* Top accent bar */}
      <div style={{ height: "4px", width: "100%", backgroundColor: meta.color }} />

      {/* Card header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 28px 0" }}>
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", letterSpacing: "0.18em", color: "#e8e0d0" }}>ARXEVO</span>
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "9px", letterSpacing: "0.12em", color: "#4a4438" }}>ARC PROFILE</span>
      </div>

      {/* Card body */}
      <div style={{ padding: "24px 28px 32px", display: "flex", flexDirection: "column" }}>

        <div style={{ marginBottom: "20px" }}>
          <ArchetypeSymbol archetype={archetype} color={meta.color} size={32} />
        </div>

        <h1
          style={{
            fontFamily: "var(--font-cormorant)",
            fontWeight: 700,
            fontSize: "56px",
            color: "var(--cream)",
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            lineHeight: 0.9,
            marginBottom: "12px",
          }}
        >
          {meta.label}
        </h1>

        {secondaryArchetype && (
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "9px", letterSpacing: "0.2em", color: "#4a4438", marginBottom: "24px", display: "block" }}>
            SECONDARY / {getMeta(secondaryArchetype).label}
          </span>
        )}

        <div style={{ borderLeft: "2px solid #2a2820", paddingLeft: "20px", marginBottom: "24px" }}>
          <p
            style={{
              fontFamily: "var(--font-cormorant)",
              fontWeight: 400,
              fontStyle: "italic",
              fontSize: "18px",
              color: "var(--cream)",
              lineHeight: 1.9,
            }}
          >
            {originStory}
          </p>
        </div>

        {/* Traits */}
        <div style={{ marginTop: "4px" }}>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "9px", letterSpacing: "0.25em", color: "#4a4438", textTransform: "uppercase", display: "block", marginBottom: "12px" }}>
            TRAIT ANALYSIS
          </span>
          {traitsArray.map(([label, raw], i) => {
            const value = typeof raw === "number" ? raw : parseFloat(String(raw)) || 0;
            return (
              <TraitBar key={label} label={label} value={Math.round(value)} color={meta.color} delay={i * 150} triggered={traitsFilled} />
            );
          })}
        </div>

        {/* Stats row */}
        <div style={{ borderTop: "1px solid #1a1a16", paddingTop: "20px", marginTop: "16px", display: "grid", gridTemplateColumns: "repeat(3, 1fr)" }}>
          {[
            { k: "ARCHETYPE", v: meta.label.slice(0, 4) },
            { k: "SQUAD", v: "—" },
            { k: "RANK", v: "—" },
          ].map(({ k, v }) => (
            <div key={k} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
              <span style={{ fontFamily: "var(--font-dm-mono)", fontSize: "11px", letterSpacing: "0.14em", color: "#b0a390", textTransform: "uppercase" }}>{k}</span>
              <span style={{ fontFamily: "var(--font-cormorant)", fontWeight: 600, fontSize: "14px", color: "var(--cream)", letterSpacing: "0.04em" }}>{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
