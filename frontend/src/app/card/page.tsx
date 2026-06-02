"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import gsap from "gsap";
import SplitType from "split-type";
import Link from "next/link";
import { saveCard, signInWithGoogle, saveToWaitlist } from "@/lib/auth";
import { useAuth } from "@/components/AuthProvider";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

// ─── Types ─────────────────────────────────────────────────────
interface ArxevoProfile {
  archetype: string;
  secondary_archetype?: string;
  origin_story: string;
  traits: Record<string, number>;
  confidence?: number;
}

// ─── Archetype meta — muted, sophisticated palette ─────────────
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
  return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : "184, 150, 12";
}

// ─── Minimal SVG archetype symbols ─────────────────────────────
function ArchetypeSymbol({ archetype, color, size = 32 }: { archetype: string; color: string; size?: number }) {
  const key = archetype?.toLowerCase().trim();
  const base = { stroke: color, strokeWidth: 1, fill: "none", strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

  if (key === "architect") return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <rect x="4" y="4" width="10" height="10" {...base} />
      <rect x="18" y="4" width="10" height="10" {...base} />
      <rect x="4" y="18" width="10" height="10" {...base} />
      <rect x="18" y="18" width="10" height="10" {...base} />
    </svg>
  );
  if (key === "catalyst") return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <line x1="6" y1="26" x2="26" y2="6" {...base} />
    </svg>
  );
  if (key === "anchor") return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="11" {...base} />
      <line x1="16" y1="5" x2="16" y2="27" {...base} />
    </svg>
  );
  // operator — gear
  const teeth = Array.from({ length: 6 }, (_, i) => {
    const a = (i / 6) * Math.PI * 2;
    return { x1: 16 + Math.cos(a) * 8, y1: 16 + Math.sin(a) * 8, x2: 16 + Math.cos(a) * 12, y2: 16 + Math.sin(a) * 12 };
  });
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="5" {...base} />
      {teeth.map((t, i) => <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} {...base} />)}
    </svg>
  );
}

// ─── TraitBar — 1px track, archetype color fill ─────────────────
function TraitBar({ label, value, color, delay, triggered }: {
  label: string; value: number; color: string; delay: number; triggered: boolean;
}) {
  const fillRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!fillRef.current || !triggered) return;
    const t = setTimeout(() => {
      if (fillRef.current) fillRef.current.style.width = `${Math.min(value, 100)}%`;
    }, delay);
    return () => clearTimeout(t);
  }, [triggered, value, delay]);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
      <span style={{
        fontFamily: "'DM Mono', monospace",
        fontSize: "10px",
        letterSpacing: "0.1em",
        color: "#8a7e6e",
        textTransform: "uppercase",
        width: "120px",
        flexShrink: 0,
      }}>
        {label}
      </span>
      <div style={{ flex: 1, height: "1px", background: "#1a1a16", overflow: "hidden" }}>
        <div
          ref={fillRef}
          style={{
            height: "100%",
            width: "0%",
            background: color,
            transition: "width 1.1s cubic-bezier(0.22,1,0.36,1)",
          }}
        />
      </div>
      <span style={{
        fontFamily: "'DM Mono', monospace",
        fontSize: "10px",
        color: "#8a7e6e",
        width: "34px",
        textAlign: "right",
        flexShrink: 0,
      }}>
        {value}%
      </span>
    </div>
  );
}

// ─── Page states ────────────────────────────────────────────────
type Phase = "loading" | "missing" | "running" | "done";

export default function CardPage() {
  const [phase, setPhase] = useState<Phase>("loading");
  const [profile, setProfile] = useState<ArxevoProfile | null>(null);
  const [traitsFilled, setTraitsFilled] = useState(false);

  // Waitlist
  const [waitlistEmail, setWaitlistEmail] = useState("");
  const [waitlistSubmitting, setWaitlistSubmitting] = useState(false);
  const [waitlistDone, setWaitlistDone] = useState(false);
  const [waitlistPosition, setWaitlistPosition] = useState<number | null>(null);

  // Auth & Save
  const { user } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const cardRef    = useRef<HTMLDivElement>(null);
  const cardWrapRef = useRef<HTMLDivElement>(null);
  const archetypeNameRef = useRef<HTMLHeadingElement>(null);
  const originRef  = useRef<HTMLParagraphElement>(null);
  const pageRef    = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const overlayContentRef = useRef<HTMLDivElement>(null);

  const router = useRouter();

  // Load from localStorage
  useEffect(() => {
    const raw = localStorage.getItem("arxevo_profile");
    if (!raw) { setPhase("missing"); return; }
    try {
      setProfile(JSON.parse(raw));
      setPhase("running");
    } catch {
      setPhase("missing");
    }
  }, []);

  // Reveal timeline — card fades up with scale, no particle burst
  useEffect(() => {
    if (phase !== "running" || !profile) return;

    gsap.set(cardWrapRef.current, { y: 40, scale: 0.98, opacity: 0 });
    gsap.set(archetypeNameRef.current, { opacity: 0 });
    gsap.set(originRef.current, { opacity: 0 });
    gsap.set(".share-btn", { y: 20, opacity: 0 });

    const tl = gsap.timeline();

    // Overlay text
    tl.fromTo(".reveal-text", { opacity: 0 }, { opacity: 1, duration: 0.5 }, 0);
    tl.call(() => {
      const el = document.querySelector(".reveal-text");
      if (el) el.textContent = "ARCHETYPE DETECTED.";
    }, undefined, 0.8);

    // Card slides up + fade in
    tl.to(cardWrapRef.current, { y: 0, scale: 1, opacity: 1, duration: 0.8, ease: "power3.out" }, 1.0);
    tl.to(overlayContentRef.current, { opacity: 0, duration: 0.4 }, 1.0);
    tl.to(overlayRef.current, { opacity: 0, duration: 0.3, onComplete: () => {
      if (overlayRef.current) overlayRef.current.style.pointerEvents = "none";
    }}, 1.4);

    // Archetype name — letters, 0.06s stagger
    tl.call(() => {
      const el = archetypeNameRef.current;
      if (!el) return;
      gsap.set(el, { opacity: 1 });
      const split = new SplitType(el, { types: "chars" });
      gsap.fromTo(
        split.chars ?? [],
        { y: 30, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5, stagger: 0.06, ease: "power2.out" }
      );
    }, undefined, 1.8);

    // Trait bars
    tl.call(() => setTraitsFilled(true), undefined, 2.3);

    // Origin story
    tl.to(originRef.current, { opacity: 1, duration: 0.7, ease: "power2.out" }, 2.8);

    // Share buttons
    tl.to(".share-btn", { y: 0, opacity: 1, duration: 0.4, stagger: 0.08, ease: "power2.out" }, 3.3);

    tl.call(() => setPhase("done"), undefined, 3.8);

    return () => { tl.kill(); };
  }, [phase, profile]);

  // ─── Auto-save on OAuth redirect ────────────────────────────────
  useEffect(() => {
    if (user && profile && saveStatus === "idle") {
      const pending = sessionStorage.getItem("arxevo_pending_save");
      if (pending === "true") {
        sessionStorage.removeItem("arxevo_pending_save");
        
        const doSave = async () => {
          setSaveStatus("saving");
          try {
            await saveCard(profile);
            setSaveStatus("saved");
            showToast("Arc saved to your vault.");
          } catch (err) {
            console.error(err);
            setSaveStatus("idle");
          }
        };
        doSave();
      }
    }
  }, [user, profile, saveStatus]);

  const handleSaveClick = async () => {
    if (!profile) return;
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    
    setSaveStatus("saving");
    try {
      await saveCard(profile);
      setSaveStatus("saved");
      showToast("Arc saved to your vault.");
    } catch (err) {
      console.error(err);
      setSaveStatus("idle");
    }
  };

  // ─── Save card as Instagram-ready image ─────────────────────
  const handleSaveImage = useCallback(async () => {
    if (!cardRef.current || !profile) return;
    const meta = getMeta(profile.archetype);

    await document.fonts.ready;
    const { default: h2c } = await import("html2canvas");

    // Temporarily show watermark and capture border
    const watermark = document.getElementById("arxevo-watermark");
    const border = document.getElementById("arxevo-capture-border");
    if (watermark) watermark.style.opacity = "1";
    if (border) border.style.opacity = "1";

    // ── FIX: temporarily expand the card to show ALL content ──
    const cardEl = cardRef.current;
    const originalHeight = cardEl.style.height;
    const originalMinHeight = cardEl.style.minHeight;
    const originalOverflow = cardEl.style.overflow;
    const originalPaddingBottom = cardEl.style.paddingBottom;

    cardEl.style.height = "auto";
    cardEl.style.minHeight = "600px";
    cardEl.style.overflow = "visible";
    cardEl.style.paddingBottom = "60px";

    // Allow reflow before measuring
    await new Promise(resolve => requestAnimationFrame(resolve));
    await new Promise(resolve => requestAnimationFrame(resolve));

    const captureHeight = Math.max(cardEl.scrollHeight, 1350);

    const canvas = await h2c(cardEl, {
      backgroundColor: "#111109",
      scale: 2.25,          // 480 × 2.25 = 1080px wide
      useCORS: true,
      logging: false,
      height: captureHeight,
      windowHeight: captureHeight,
    });

    // Restore original styles
    cardEl.style.height = originalHeight;
    cardEl.style.minHeight = originalMinHeight;
    cardEl.style.overflow = originalOverflow;
    cardEl.style.paddingBottom = originalPaddingBottom;

    if (watermark) watermark.style.opacity = "0";
    if (border) border.style.opacity = "0";

    // Add 8px border in archetype accent color
    const final = document.createElement("canvas");
    final.width = canvas.width;
    final.height = canvas.height;
    const ctx = final.getContext("2d");
    if (ctx) {
      ctx.fillStyle = meta.color;
      ctx.fillRect(0, 0, final.width, final.height);
      const pad = Math.round(8 * 2.25);
      ctx.drawImage(canvas, pad, pad, canvas.width - pad * 2, canvas.height - pad * 2);
    }

    const link = document.createElement("a");
    link.download = `arxevo-${profile.archetype}-card.png`;
    link.href = final.toDataURL("image/png");
    link.click();
  }, [profile]);

  const handleWhatsApp = useCallback(() => {
    if (!profile) return;
    const meta = getMeta(profile.archetype);
    const text = `I just discovered my ARXEVO archetype: ${meta.label}.\n\n"${profile.origin_story.slice(0, 120)}..."\n\nDiscover yours: https://arxevo.filtree.in`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  }, [profile]);

  const handleInstagram = useCallback(async () => {
    await handleSaveImage();
  }, [handleSaveImage]);

  const handleTwitter = useCallback(() => {
    if (!profile) return;
    const meta = getMeta(profile.archetype);
    const text = `Just discovered I'm a ${meta.label} on ARXEVO.\n\n"${profile.origin_story.slice(0, 100)}..."\n\nhttps://arxevo.filtree.in #ARXEVO`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, "_blank");
  }, [profile]);

  // ─── Waitlist submit ────────────────────────────────────────
  const handleWaitlistSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!waitlistEmail || waitlistSubmitting || !profile) return;
    setWaitlistSubmitting(true);

    try {
      const res = await saveToWaitlist(waitlistEmail, profile.archetype);
      setWaitlistPosition(res.position);
      setWaitlistDone(true);
    } catch (err: any) {
      if (err.message === "Email already registered.") {
        setWaitlistDone(true);
      } else {
        console.error(err);
      }
    }

    setWaitlistSubmitting(false);
  }, [waitlistEmail, waitlistSubmitting, profile]);

  // ─── Missing state ───────────────────────────────────────────
  if (phase === "missing") {
    return (
      <div style={{ minHeight: "100vh", backgroundColor: "#0a0a08", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "20px", padding: "48px 24px" }}>
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", letterSpacing: "0.15em", color: "#8a7e6e", border: "1px solid #2a2820", padding: "6px 14px" }}>
          NO ARC DATA FOUND
        </span>
        <button
          onClick={() => router.push("/onboard")}
          style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", letterSpacing: "0.15em", textTransform: "uppercase", color: "#e8e0d0", background: "transparent", border: "1px solid #e8e0d0", padding: "14px 32px", cursor: "pointer" }}
        >
          Submit Your Origin
        </button>
      </div>
    );
  }

  // ─── Loading state ───────────────────────────────────────────
  if (phase === "loading" || !profile) {
    return (
      <div style={{ minHeight: "100vh", backgroundColor: "#0a0a08", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", letterSpacing: "0.15em", color: "#4a4438" }}>
          LOADING ARC DATA...
        </span>
      </div>
    );
  }

  const meta = getMeta(profile.archetype);
  const traits = Object.entries(profile.traits ?? {});

  return (

    <div
      ref={pageRef}
      style={{ minHeight: "100vh", backgroundColor: "#0a0a08", color: "#e8e0d0", padding: "0 0 120px", position: "relative" }}
    >
      {showAuthModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 2000, background: "rgba(10,10,8,0.95)", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
          <div style={{ background: "#111109", border: "1px solid #2a2820", padding: "48px 32px", display: "flex", flexDirection: "column", alignItems: "center", maxWidth: "400px", width: "100%", textAlign: "center" }}>
            <h2 style={{ fontFamily: "var(--font-cormorant)", fontStyle: "italic", fontSize: "28px", color: "var(--cream)", marginBottom: "16px" }}>Save your arc permanently.</h2>
            <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "13px", color: "#8a7e6e", marginBottom: "32px", lineHeight: 1.6 }}>Sign in to keep it. Your card belongs to you.</p>
            <button
              onClick={() => {
                if (profile) {
                  sessionStorage.setItem("pending_card", JSON.stringify({
                    archetype: profile.archetype,
                    secondary_archetype: profile.secondary_archetype,
                    origin_story: profile.origin_story,
                    traits: profile.traits,
                    confidence: profile.confidence
                  }));
                }
                sessionStorage.setItem("arxevo_pending_save", "true");
                signInWithGoogle();
              }}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: "12px",
                width: "100%", background: "#e8e0d0", color: "#0a0a08", border: "none", borderRadius: 0, padding: "16px", cursor: "pointer", outline: "none", transition: "opacity 0.2s ease"
              }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.9"; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "13px", fontWeight: 500 }}>Continue with Google</span>
            </button>
            <button onClick={() => setShowAuthModal(false)} style={{ marginTop: "24px", fontFamily: "'DM Mono', monospace", fontSize: "10px", color: "#4a4438", background: "none", border: "none", cursor: "pointer", letterSpacing: "0.1em", textTransform: "uppercase" }}>Cancel</button>
          </div>
        </div>
      )}
      {/* Reveal overlay */}
      <div
        ref={overlayRef}
        style={{ position: "fixed", inset: 0, zIndex: 1000, background: "#0a0a08", display: "flex", alignItems: "center", justifyContent: "center" }}
      >
        <div ref={overlayContentRef} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "20px" }}>
          <span
            className="reveal-text"
            style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", letterSpacing: "0.25em", color: "#8a7e6e", textTransform: "uppercase" }}
          >
            ANALYZING ORIGIN DATA...
          </span>
          <div style={{ width: "40px", height: "1px", background: meta.color }} />
        </div>
      </div>

      {/* Nav */}
      <nav style={{ position: "sticky", top: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 48px", backgroundColor: "#0a0a08", borderBottom: "1px solid #1a1a16" }}>
        <Link
          href="/"
          style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "16px", letterSpacing: "0.05em", color: "#e8e0d0", textDecoration: "none" }}
        >
          ARXEVO
        </Link>
        <button
          onClick={() => router.push("/onboard")}
          style={{ fontFamily: "'DM Mono', monospace", fontSize: "9px", letterSpacing: "0.15em", textTransform: "uppercase", color: "#8a7e6e", background: "transparent", border: "1px solid #2a2820", padding: "10px 20px", cursor: "pointer", outline: "none" }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#b8960c"; e.currentTarget.style.color = "#e8e0d0"; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#2a2820"; e.currentTarget.style.color = "#8a7e6e"; }}
          onFocus={(e) => { e.currentTarget.style.outline = "1px solid #b8960c"; e.currentTarget.style.outlineOffset = "3px"; }}
          onBlur={(e) => { e.currentTarget.style.outline = "none"; }}
        >
          New Arc
        </button>
      </nav>

      {/* Main */}
      <div style={{ maxWidth: "560px", margin: "0 auto", padding: "80px 24px 0", display: "flex", flexDirection: "column", alignItems: "center", gap: "0" }}>

        {/* Card wrap — GSAP target */}
        <div
          ref={cardWrapRef}
          style={{ width: "100%", opacity: 0 }}
        >
          {/* THE CARD — height: auto so origin story never clips */}
          <div
            ref={cardRef}
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
            }}
          >
            {/* Archetype accent border (hidden — shown during capture) */}
            <div
              id="arxevo-capture-border"
              style={{
                position: "absolute",
                inset: 0,
                border: `8px solid ${meta.color}`,
                zIndex: 10,
                pointerEvents: "none",
                opacity: 0,
              }}
            />

            {/* Top accent bar — 4px */}
            <div style={{ height: "4px", width: "100%", backgroundColor: meta.color }} />

            {/* Card header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 28px 0" }}>
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", letterSpacing: "0.18em", color: "#e8e0d0" }}>ARXEVO</span>
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "9px", letterSpacing: "0.12em", color: "#4a4438" }}>ARC PROFILE</span>
            </div>

            {/* Card body */}
            <div style={{ padding: "24px 28px 32px", display: "flex", flexDirection: "column" }}>

              {/* Archetype symbol + name */}
              <div style={{ marginBottom: "20px" }}>
                <ArchetypeSymbol archetype={profile.archetype} color={meta.color} size={32} />
              </div>

              <h1
                ref={archetypeNameRef}
                style={{
                  fontFamily: "var(--font-cormorant)",
                  fontWeight: 700,
                  fontSize: "56px",
                  color: "var(--cream)",
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                  lineHeight: 0.9,
                  marginBottom: "12px",
                  opacity: 0,
                }}
              >
                {meta.label}
              </h1>

              {profile.secondary_archetype && (
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "9px", letterSpacing: "0.2em", color: "#4a4438", marginBottom: "24px", display: "block" }}>
                  SECONDARY / {getMeta(profile.secondary_archetype).label}
                </span>
              )}

              {/* Origin story — no height restriction, no overflow hidden */}
              <div style={{ borderLeft: "2px solid #2a2820", paddingLeft: "20px", marginBottom: "24px" }}>
                <p
                  ref={originRef}
                  style={{
                    fontFamily: "var(--font-cormorant)",
                    fontWeight: 400,
                    fontStyle: "italic",
                    fontSize: "18px",
                    color: "var(--cream)",
                    lineHeight: 1.9,
                    opacity: 0,
                    // No max-height, no overflow restrictions
                  }}
                >
                  {profile.origin_story}
                </p>
              </div>

              {/* Traits — 1px bars */}
              <div style={{ marginTop: "4px" }}>
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "9px", letterSpacing: "0.25em", color: "#4a4438", textTransform: "uppercase", display: "block", marginBottom: "12px" }}>
                  TRAIT ANALYSIS
                </span>
                {traits.slice(0, 4).map(([label, raw], i) => {
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

            {/* ARXEVO watermark — hidden, shown during capture */}
            <div
              id="arxevo-watermark"
              style={{
                position: "absolute",
                bottom: "12px",
                right: "16px",
                fontFamily: "'DM Mono', monospace",
                fontSize: "9px",
                letterSpacing: "0.15em",
                color: "#4a4438",
                opacity: 0,
                pointerEvents: "none",
                zIndex: 9,
              }}
            >
              ARXEVO
            </div>
          </div>
        </div>

        {/* Full trait analysis — outside card */}
        {traits.length > 4 && (
          <div style={{ width: "480px", maxWidth: "100%", margin: "40px auto 0" }}>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "9px", letterSpacing: "0.25em", color: "#4a4438", textTransform: "uppercase", display: "block", marginBottom: "20px" }}>
              TRAIT ANALYSIS — FULL
            </span>
            {traits.map(([label, raw], i) => {
              const value = typeof raw === "number" ? raw : parseFloat(String(raw)) || 0;
              return (
                <TraitBar key={label} label={label} value={Math.round(value)} color={meta.color} delay={i * 100} triggered={traitsFilled} />
              );
            })}
          </div>
        )}

        {/* Share buttons */}
        <div style={{ width: "480px", maxWidth: "100%", margin: "40px auto 0", display: "flex", gap: "12px", flexWrap: "wrap" }}>
          {[
            { key: "save", label: saveStatus === "saved" ? "ARC SAVED." : saveStatus === "saving" ? "SAVING..." : "SAVE", fn: handleSaveClick },
            { key: "download", label: "DOWNLOAD", fn: handleSaveImage },
            { key: "whatsapp", label: "WHATSAPP", fn: handleWhatsApp },
            { key: "instagram", label: "INSTAGRAM", fn: handleInstagram },
            { key: "twitter", label: "X", fn: handleTwitter },
          ].map(({ key, label, fn }) => (
            <button
              key={key}
              className="share-btn"
              onClick={fn}
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: "9px",
                letterSpacing: "0.15em",
                color: "#8a7e6e",
                background: "transparent",
                border: "1px solid #2a2820",
                padding: "10px 20px",
                cursor: "pointer",
                transition: "border-color 0.3s ease, color 0.3s ease",
                opacity: 0,
                outline: "none",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#b8960c"; e.currentTarget.style.color = "#e8e0d0"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#2a2820"; e.currentTarget.style.color = "#8a7e6e"; }}
              onFocus={(e) => { e.currentTarget.style.outline = "1px solid #b8960c"; e.currentTarget.style.outlineOffset = "3px"; }}
              onBlur={(e) => { e.currentTarget.style.outline = "none"; }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ─── Nav links below share buttons (Polish 4) ─── */}
        <div style={{ width: "480px", maxWidth: "100%", margin: "24px auto 0", display: "flex", flexDirection: "column", gap: "0" }}>
          <div style={{ height: "1px", backgroundColor: "#1a1a16", marginBottom: "20px" }} />
          <div style={{ display: "flex", gap: "32px" }}>
            <Link
              href="/onboard"
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: "11px",
                letterSpacing: "0.1em",
                color: "#8a7e6e",
                textDecoration: "none",
                transition: "color 0.2s ease",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "#e8e0d0"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "#8a7e6e"; }}
            >
              Analyze another essay →
            </Link>
            <Link
              href="/faq"
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: "11px",
                letterSpacing: "0.1em",
                color: "#8a7e6e",
                textDecoration: "none",
                transition: "color 0.2s ease",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "#e8e0d0"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "#8a7e6e"; }}
            >
              What does this mean? →
            </Link>
          </div>
        </div>

        {/* Divider + Waitlist */}
        <div style={{ width: "480px", maxWidth: "100%", margin: "48px auto 0" }}>
          <div style={{ height: "1px", backgroundColor: "#1a1a16", marginBottom: "48px" }} />

          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", letterSpacing: "0.2em", color: "#4a4438", textTransform: "uppercase", display: "block", marginBottom: "20px" }}>
            WHAT COMES NEXT
          </span>

          <h2 style={{
            fontFamily: "var(--font-cormorant)",
            fontWeight: 400,
            fontStyle: "italic",
            fontSize: "var(--text-h2)",
            color: "var(--cream)",
            marginBottom: "16px",
            lineHeight: 1.2,
          }}>
            Your squad is being assembled.
          </h2>

          <p style={{
            fontFamily: "var(--font-dm-mono)",
            fontSize: "var(--text-small)",
            color: "#b0a390",
            lineHeight: 1.8,
            marginBottom: "28px",
            maxWidth: "420px",
          }}>
            Three people with complementary archetypes are being matched to you based on your city, energy, and compatibility score. Enter your email to be notified when your squad is ready.
          </p>

          {waitlistDone ? (
            <div style={{ paddingTop: "8px" }}>
              <p style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 300, fontStyle: "italic", fontSize: "22px", color: "#e8e0d0", marginBottom: "8px" }}>
                You are #{waitlistPosition || "—"} in the queue.
              </p>
              <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", letterSpacing: "0.1em", color: "#4a4438" }}>
                We will find your squad.
              </p>
            </div>
          ) : (
            <form onSubmit={handleWaitlistSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <input
                type="email"
                value={waitlistEmail}
                onChange={(e) => setWaitlistEmail(e.target.value)}
                placeholder="your@email.com"
                required
                style={{
                  fontFamily: "var(--font-cormorant)",
                  fontWeight: 400,
                  fontSize: "var(--text-body)",
                  color: "var(--cream)",
                  background: "#111109",
                  border: "1px solid #2a2820",
                  padding: "14px 18px",
                  outline: "none",
                  borderRadius: 0,
                  transition: "border-color 0.3s ease",
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = "#b8960c"; e.currentTarget.style.outline = "1px solid #b8960c"; e.currentTarget.style.outlineOffset = "3px"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "#2a2820"; e.currentTarget.style.outline = "none"; }}
              />
              <button
                type="submit"
                disabled={waitlistSubmitting}
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: "10px",
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  color: waitlistSubmitting ? "#4a4438" : "#e8e0d0",
                  background: "transparent",
                  border: `1px solid ${waitlistSubmitting ? "#2a2820" : "#e8e0d0"}`,
                  padding: "14px 24px",
                  cursor: waitlistSubmitting ? "not-allowed" : "pointer",
                  transition: "all 0.3s ease",
                  alignSelf: "flex-start",
                  outline: "none",
                }}
                onMouseEnter={(e) => {
                  if (!waitlistSubmitting) { e.currentTarget.style.backgroundColor = "#e8e0d0"; e.currentTarget.style.color = "#0a0a08"; }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent";
                  e.currentTarget.style.color = waitlistSubmitting ? "#4a4438" : "#e8e0d0";
                }}
                onFocus={(e) => { e.currentTarget.style.outline = "1px solid #b8960c"; e.currentTarget.style.outlineOffset = "3px"; }}
                onBlur={(e) => { e.currentTarget.style.outline = "none"; }}
              >
                {waitlistSubmitting ? "Joining..." : "JOIN THE WAITLIST"}
              </button>
            </form>
          )}
        </div>

        {/* Bottom actions */}
        <div style={{ width: "480px", maxWidth: "100%", margin: "48px auto 0", display: "flex", gap: "16px", alignItems: "center" }}>
          <button
            onClick={() => router.push("/onboard")}
            style={{ fontFamily: "'DM Mono', monospace", fontSize: "9px", letterSpacing: "0.15em", textTransform: "uppercase", color: "#8a7e6e", background: "transparent", border: "1px solid #2a2820", padding: "12px 20px", cursor: "pointer", outline: "none" }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#b8960c"; e.currentTarget.style.color = "#e8e0d0"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#2a2820"; e.currentTarget.style.color = "#8a7e6e"; }}
            onFocus={(e) => { e.currentTarget.style.outline = "1px solid #b8960c"; e.currentTarget.style.outlineOffset = "3px"; }}
            onBlur={(e) => { e.currentTarget.style.outline = "none"; }}
          >
            New Arc
          </button>
          <button
            onClick={() => router.push("/")}
            style={{ fontFamily: "'DM Mono', monospace", fontSize: "9px", letterSpacing: "0.15em", textTransform: "uppercase", color: "#4a4438", background: "transparent", border: "none", padding: "12px 0", cursor: "pointer" }}
          >
            Return Home
          </button>
        </div>
      </div>

      {/* Toast Message */}
      {toastMessage && (
        <div style={{
          position: "fixed",
          bottom: "40px",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 3000,
          background: "#111109",
          border: "1px solid #b8960c",
          padding: "12px 24px",
          fontFamily: "'DM Mono', monospace",
          fontSize: "12px",
          color: "#b8960c",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
          animation: "fadeInOut 3s forwards"
        }}>
          {toastMessage}
        </div>
      )}

      {/* Mobile responsive styles */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media (max-width: 480px) {
          [data-card-container] {
            width: 100% !important;
            max-width: 100% !important;
          }
        }
        @keyframes fadeInOut {
          0% { opacity: 0; transform: translate(-50%, 20px); }
          15% { opacity: 1; transform: translate(-50%, 0); }
          85% { opacity: 1; transform: translate(-50%, 0); }
          100% { opacity: 0; transform: translate(-50%, -20px); }
        }
      `}} />
    </div>
  );
}
