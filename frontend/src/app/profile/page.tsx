"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { getUserCards, signOut, saveCard } from "@/lib/auth";
import { generateMangaCover } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { User } from "@supabase/supabase-js";
import CharacterCard from "@/components/CharacterCard";

// ─── Brand constants ────────────────────────────────────────────────────────
const ARCHETYPE_META: Record<string, { color: string; label: string; rgb: string }> = {
  architect: { color: "#b8960c", label: "ARCHITECT", rgb: "184,150,12" },
  catalyst:  { color: "#8B5CF6", label: "CATALYST",  rgb: "139,92,246" },
  anchor:    { color: "#06B6D4", label: "ANCHOR",    rgb: "6,182,212"  },
  operator:  { color: "#c41e1e", label: "OPERATOR",  rgb: "196,30,30"  },
};

function getMeta(archetype: string) {
  const key = archetype?.toLowerCase().trim();
  return ARCHETYPE_META[key] ?? { color: "#8a7e6e", label: archetype?.toUpperCase() ?? "UNKNOWN", rgb: "138,126,110" };
}

// ─── Archetype SVG symbols ──────────────────────────────────────────────────
function ArchetypeSymbol({ archetype, color, size = 24 }: { archetype: string; color: string; size?: number }) {
  const key = archetype?.toLowerCase().trim();
  const base = { stroke: color, strokeWidth: 1.5, fill: "none", strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  if (key === "architect") return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <rect x="6" y="6" width="8" height="8" {...base} /><rect x="18" y="6" width="8" height="8" {...base} />
      <rect x="6" y="18" width="8" height="8" {...base} /><rect x="18" y="18" width="8" height="8" {...base} />
    </svg>
  );
  if (key === "catalyst") return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <line x1="8" y1="24" x2="24" y2="8" {...base} />
      <circle cx="24" cy="8" r="3" {...base} /><circle cx="8" cy="24" r="3" {...base} />
    </svg>
  );
  if (key === "anchor") return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="10" r="4" {...base} />
      <line x1="16" y1="14" x2="16" y2="26" {...base} />
      <path d="M8 22 Q16 28 24 22" {...base} />
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

// ─── Shard shapes for background ────────────────────────────────────────────
const SHARD_SHAPES = [
  { clip: "polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)", top: "8%",  left: "5%",  w: 120, h: 140, rot: 12,  delay: 0    },
  { clip: "polygon(25% 0%, 75% 0%, 100% 50%, 50% 100%, 0% 50%)",   top: "15%", left: "88%", w: 80,  h: 100, rot: -8,  delay: 1.5  },
  { clip: "polygon(0% 0%, 100% 20%, 80% 100%, 20% 80%)",           top: "45%", left: "92%", w: 60,  h: 80,  rot: 22,  delay: 3    },
  { clip: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)",           top: "70%", left: "3%",  w: 90,  h: 90,  rot: -15, delay: 0.8  },
  { clip: "polygon(0% 25%, 50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%)", top: "82%", left: "85%", w: 70, h: 80, rot: 5, delay: 2.2 },
  { clip: "polygon(20% 0%, 80% 0%, 100% 100%, 0% 100%)",           top: "30%", left: "1%",  w: 50,  h: 120, rot: -6,  delay: 4    },
  { clip: "polygon(50% 0%, 100% 100%, 0% 100%)",                   top: "60%", left: "90%", w: 55,  h: 65,  rot: 30,  delay: 1.2  },
  { clip: "polygon(0% 0%, 60% 0%, 100% 40%, 100% 100%, 40% 100%, 0% 60%)", top: "5%", left: "72%", w: 65, h: 75, rot: -18, delay: 3.5 },
];

function ShardsBackground({ accentColor, accentRgb }: { accentColor: string; accentRgb: string }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", overflow: "hidden" }}>
      {/* Scanline overlay */}
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.012) 2px, rgba(255,255,255,0.012) 4px)",
        pointerEvents: "none",
      }} />
      {/* Blueprint dot grid */}
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: `radial-gradient(circle, rgba(${accentRgb},0.12) 1px, transparent 1px)`,
        backgroundSize: "40px 40px",
        opacity: 0.4,
      }} />
      {/* Left archetype radial glow */}
      <div style={{
        position: "absolute", top: "20%", left: "-10%",
        width: "500px", height: "500px",
        background: `radial-gradient(circle, rgba(${accentRgb},0.07) 0%, transparent 70%)`,
        filter: "blur(40px)",
      }} />
      {/* Right dim glow */}
      <div style={{
        position: "absolute", bottom: "10%", right: "-5%",
        width: "300px", height: "300px",
        background: `radial-gradient(circle, rgba(${accentRgb},0.04) 0%, transparent 70%)`,
        filter: "blur(60px)",
      }} />
      {/* CSS shard shapes */}
      {SHARD_SHAPES.map((s, i) => (
        <div
          key={i}
          className="shard-shape"
          style={{
            position: "absolute",
            top: s.top, left: s.left,
            width: s.w, height: s.h,
            clipPath: s.clip,
            background: `linear-gradient(${s.rot * 3}deg, rgba(${accentRgb},0.05) 0%, rgba(232,224,208,0.03) 50%, rgba(${accentRgb},0.02) 100%)`,
            border: `0.5px solid rgba(${accentRgb},0.08)`,
            animation: `shardDrift${(i % 3) + 1} ${14 + i * 2.3}s ease-in-out ${s.delay}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

// ─── Share text generator ────────────────────────────────────────────────────
function getMangaShareText(card: any) {
  const meta = getMeta(card.archetype);
  const firstSentence = card.origin_story?.split(/[.!?]/)[0]?.trim() || "";
  return `My origin story just got a manga cover. 📖\n\nArchetype: ${meta.label}\n\n"${firstSentence}..."\n\nI fed my real story to an AI and it compressed my entire arc into a single collector's edition cover.\n\nYours is waiting → https://arxevo.filtree.in\n\n#ARXEVO — Chapter 01 has begun.`;
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [cards, setCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const [mangaState, setMangaState] = useState<Record<string, { url: string | null; loading: boolean }>>({});
  const router = useRouter();

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  useEffect(() => {
    async function loadData() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/"); return; }
      setUser(session.user);

      const pendingCard = sessionStorage.getItem("pending_card");
      if (pendingCard) {
        try {
          const profileData = JSON.parse(pendingCard);
          await saveCard(profileData);
          sessionStorage.removeItem("pending_card");
          showToast("Arc saved to your vault.");
        } catch (err) { console.error("Failed to save pending card", err); }
      }

      try {
        const userCards = await getUserCards();
        setCards(userCards);
        if (userCards.length > 0) setExpandedCardId(userCards[0].id);
      } catch (e) { console.error("Failed to load cards", e); }
      finally { setLoading(false); }
    }
    loadData();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) setUser(session.user);
      if (event === "SIGNED_OUT") router.replace("/");
    });
    return () => subscription.unsubscribe();
  }, [router]);

  // ─── Character card share handlers ──────────────────────────────────────
  const handleSaveImage = useCallback(async (card: any) => {
    const cardEl = document.getElementById(`card-capture-${card.id}`);
    if (!cardEl) return;
    const meta = getMeta(card.archetype);
    await document.fonts.ready;
    const { default: h2c } = await import("html2canvas");
    const originalHeight = cardEl.style.height;
    const originalMinHeight = cardEl.style.minHeight;
    const originalOverflow = cardEl.style.overflow;
    cardEl.style.height = "auto";
    cardEl.style.minHeight = "600px";
    cardEl.style.overflow = "visible";
    await new Promise(r => requestAnimationFrame(r));
    await new Promise(r => requestAnimationFrame(r));
    const captureHeight = Math.max(cardEl.scrollHeight, 1350);
    const canvas = await h2c(cardEl, { backgroundColor: "#111109", scale: 2.25, useCORS: true, logging: false, height: captureHeight, windowHeight: captureHeight });
    cardEl.style.height = originalHeight;
    cardEl.style.minHeight = originalMinHeight;
    cardEl.style.overflow = originalOverflow;
    const final = document.createElement("canvas");
    final.width = canvas.width; final.height = canvas.height;
    const ctx = final.getContext("2d");
    if (ctx) {
      ctx.fillStyle = meta.color;
      ctx.fillRect(0, 0, final.width, final.height);
      const pad = Math.round(8 * 2.25);
      ctx.drawImage(canvas, pad, pad, canvas.width - pad * 2, canvas.height - pad * 2);
    }
    const link = document.createElement("a");
    link.download = `arxevo-${card.archetype}-card.png`;
    link.href = final.toDataURL("image/png");
    link.click();
  }, []);

  const handleWhatsApp = useCallback((card: any) => {
    const meta = getMeta(card.archetype);
    const text = `I just discovered my ARXEVO archetype: ${meta.label}.\n\n"${card.origin_story.slice(0, 120)}..."\n\nDiscover yours: https://arxevo.filtree.in`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  }, []);

  const handleTwitter = useCallback((card: any) => {
    const meta = getMeta(card.archetype);
    const text = `Just discovered I'm a ${meta.label} on ARXEVO.\n\n"${card.origin_story.slice(0, 100)}..."\n\nhttps://arxevo.filtree.in #ARXEVO`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, "_blank");
  }, []);

  // ─── Manga cover handlers ────────────────────────────────────────────────
  async function handleGenerateManga(card: any) {
    setMangaState(prev => ({ ...prev, [card.id]: { url: prev[card.id]?.url ?? null, loading: true } }));
    try {
      const url = await generateMangaCover(card.archetype, card.origin_story, card.key_themes || [], firstName);
      if (url) {
        setMangaState(prev => ({ ...prev, [card.id]: { url, loading: false } }));
        await supabase.from("cards").update({ manga_cover: url }).eq("id", card.id);
        setCards(prev => prev.map(c => c.id === card.id ? { ...c, manga_cover: url } : c));
        showToast("Chapter 01 illustrated.");
      } else {
        setMangaState(prev => ({ ...prev, [card.id]: { url: null, loading: false } }));
        showToast("Cover generation failed. Try again.");
      }
    } catch {
      setMangaState(prev => ({ ...prev, [card.id]: { url: null, loading: false } }));
      showToast("Cover generation failed. Try again.");
    }
  }

  function handleDownloadManga(url: string, archetype: string) {
    const link = document.createElement("a");
    link.href = url;
    link.download = `arxevo-chapter-01-${archetype}.jpg`;
    link.click();
  }

  async function handleShareManga(mangaUrl: string, card: any) {
    const shareText = getMangaShareText(card);

    // Try Web Share API with image file
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        const res = await fetch(mangaUrl);
        const blob = await res.blob();
        const file = new File([blob], "arxevo-chapter-01.jpg", { type: blob.type || "image/jpeg" });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({ title: "ARXEVO — My Origin Cover", text: shareText, files: [file] });
          return;
        }
        // Can't share files — try without
        await navigator.share({ title: "ARXEVO — My Origin Cover", text: shareText, url: "https://arxevo.filtree.in" });
        return;
      } catch (e: any) {
        if (e?.name === "AbortError") return; // User cancelled
      }
    }

    // Fallback: download image + copy text
    handleDownloadManga(mangaUrl, card.archetype);
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(shareText);
      showToast("Image saved + caption copied!");
    }
  }

  function handleMangaWhatsApp(mangaUrl: string, card: any) {
    const text = getMangaShareText(card);
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  }

  function handleMangaTwitter(mangaUrl: string, card: any) {
    const meta = getMeta(card.archetype);
    const firstSentence = card.origin_story?.split(/[.!?]/)[0]?.trim() || "";
    const text = `Chapter 01 just dropped. 📖\n\nArchetype: ${meta.label}\n"${firstSentence}..."\n\nMy life just became a collector's edition manga cover.\n\nYours is waiting → https://arxevo.filtree.in\n\n#ARXEVO`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, "_blank");
  }

  // ─── Loading state ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ minHeight: "100vh", backgroundColor: "#0a0a08", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "20px" }}>
        <div style={{ position: "relative", width: "48px", height: "48px" }}>
          <div style={{ position: "absolute", inset: 0, border: "1px solid rgba(184,150,12,0.3)", borderRadius: "50%", animation: "loadSpin 3s linear infinite" }} />
          <div style={{ position: "absolute", inset: "8px", border: "1px solid rgba(184,150,12,0.15)", borderRadius: "50%", animation: "loadSpin 2s linear infinite reverse" }} />
          <div style={{ position: "absolute", inset: "20px", background: "#b8960c", borderRadius: "50%", opacity: 0.8 }} />
        </div>
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "9px", letterSpacing: "0.25em", color: "#4a4438", textTransform: "uppercase" }}>
          DECRYPTING VAULT...
        </span>
      </div>
    );
  }

  if (!user) return null;

  const firstName = user.user_metadata?.name?.split(" ")[0] || "User";
  const recentCard = cards[0];
  const accentMeta = recentCard ? getMeta(recentCard.archetype) : { color: "#b8960c", label: "SYSTEM", rgb: "184,150,12" };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#0a0a08", color: "#e8e0d0", position: "relative", overflowX: "hidden" }}>

      {/* ── Background layer ─────────────────────────────────────────────── */}
      <ShardsBackground accentColor={accentMeta.color} accentRgb={accentMeta.rgb} />

      {/* ── Toast ────────────────────────────────────────────────────────── */}
      {toastMessage && (
        <div style={{
          position: "fixed", top: "32px", left: "50%", transform: "translateX(-50%)", zIndex: 3000,
          background: "#0d0d0b", border: `1px solid ${accentMeta.color}`, padding: "10px 24px",
          fontFamily: "'DM Mono', monospace", fontSize: "10px", color: accentMeta.color,
          letterSpacing: "0.12em", textTransform: "uppercase", boxShadow: `0 0 30px rgba(${accentMeta.rgb},0.2)`,
          animation: "fadeInOut 3.5s forwards", whiteSpace: "nowrap",
        }}>
          ◈ {toastMessage}
        </div>
      )}

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <main style={{ maxWidth: "1100px", margin: "0 auto", padding: "80px 40px 120px", position: "relative", zIndex: 10 }}>

        {/* ── EDITORIAL HEADER ──────────────────────────────────────────── */}
        <div style={{ position: "relative", marginBottom: "80px" }}>

          {/* Ghost "ARC" word behind */}
          <div style={{
            position: "absolute", top: "-40px", left: "-20px",
            fontFamily: "var(--font-cormorant)", fontWeight: 700, fontStyle: "italic",
            fontSize: "clamp(120px, 18vw, 200px)", color: "#1a1a16", lineHeight: 1,
            pointerEvents: "none", userSelect: "none", zIndex: 0, letterSpacing: "-0.04em",
          }}>
            ARC
          </div>

          <div className="profile-header-grid" style={{ display: "grid", gridTemplateColumns: "1fr auto", alignItems: "flex-start", gap: "32px", position: "relative", zIndex: 1, paddingTop: "20px" }}>
            {/* Left: title block */}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
                <div style={{ width: "24px", height: "1px", background: accentMeta.color }} />
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "9px", letterSpacing: "0.25em", color: accentMeta.color, textTransform: "uppercase" }}>
                  VAULT ACCESS GRANTED
                </span>
              </div>

              <h1 style={{
                fontFamily: "var(--font-cormorant)", fontWeight: 300, fontStyle: "italic",
                fontSize: "clamp(52px, 7vw, 96px)", color: "#e8e0d0",
                margin: "0 0 4px 0", lineHeight: 0.95, letterSpacing: "-0.02em",
              }}>
                {firstName}<span style={{ color: accentMeta.color }}>{"'"}</span>s Arc.
              </h1>

              <div style={{ display: "flex", alignItems: "center", gap: "16px", marginTop: "20px" }}>
                <div style={{ height: "1px", flex: 1, background: `linear-gradient(90deg, ${accentMeta.color}40, transparent)` }} />
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "8px", letterSpacing: "0.2em", color: "#4a4438", textTransform: "uppercase", whiteSpace: "nowrap" }}>
                  SYSTEM ARCHIVES / {cards.length} RECORD{cards.length !== 1 ? "S" : ""} FOUND
                </span>
                <div style={{ height: "1px", flex: 1, background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.04))" }} />
              </div>
            </div>

            {/* Right: archetype dossier card */}
            {recentCard && (
              <div style={{
                background: "#0d0d0b",
                border: `1px solid ${accentMeta.color}30`,
                padding: "20px 24px",
                minWidth: "160px",
                position: "relative",
                overflow: "hidden",
              }}>
                {/* Corner accent */}
                <div style={{ position: "absolute", top: 0, left: 0, width: "12px", height: "12px", borderTop: `1px solid ${accentMeta.color}`, borderLeft: `1px solid ${accentMeta.color}` }} />
                <div style={{ position: "absolute", bottom: 0, right: 0, width: "12px", height: "12px", borderBottom: `1px solid ${accentMeta.color}`, borderRight: `1px solid ${accentMeta.color}` }} />
                <ArchetypeSymbol archetype={recentCard.archetype} color={accentMeta.color} size={20} />
                <div style={{ fontFamily: "var(--font-cormorant)", fontWeight: 700, fontSize: "22px", color: accentMeta.color, marginTop: "10px", letterSpacing: "0.05em" }}>
                  {accentMeta.label}
                </div>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "8px", color: "#4a4438", letterSpacing: "0.15em", marginTop: "6px" }}>
                  CONFIDENCE {recentCard.confidence || 0}%
                </div>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "7px", color: "#2a2820", letterSpacing: "0.1em", marginTop: "4px" }}>
                  INITIATED {new Date(recentCard.created_at).toLocaleDateString("en-US", { year: "numeric", month: "short" }).toUpperCase()}
                </div>
              </div>
            )}

            {/* Disconnect */}
            <button
              className="disconnect-btn"
              onClick={async () => { await signOut(); router.push("/"); }}
              style={{
                position: "absolute", top: "20px", right: 0,
                fontFamily: "'DM Mono', monospace", fontSize: "8px", letterSpacing: "0.15em",
                color: "#2a2820", background: "none", border: "none", cursor: "pointer",
                transition: "color 0.2s", textTransform: "uppercase", padding: "4px 0",
              }}
              onMouseEnter={e => { e.currentTarget.style.color = "#c41e1e"; }}
              onMouseLeave={e => { e.currentTarget.style.color = "#2a2820"; }}
            >
              ⊘ DISCONNECT
            </button>
          </div>

          {/* Marquee strip */}
          <div style={{ overflow: "hidden", marginTop: "32px", borderTop: "1px solid #1a1a16", paddingTop: "12px" }}>
            <div style={{ display: "flex", animation: "marqueeScroll 28s linear infinite", whiteSpace: "nowrap" }}>
              {Array.from({ length: 6 }).map((_, i) => (
                <span key={i} style={{ fontFamily: "'DM Mono', monospace", fontSize: "8px", letterSpacing: "0.2em", color: "#2a2820", paddingRight: "60px", flexShrink: 0, textTransform: "uppercase" }}>
                  ◈ SYSTEM ARCHIVES ◈ ARXEVO VAULT ◈ {cards.length} RECORD{cards.length !== 1 ? "S" : ""} ◈ ARC INITIALIZED ◈
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* ── EMPTY STATE ──────────────────────────────────────────────────── */}
        {cards.length === 0 ? (
          <div style={{ padding: "80px 0", textAlign: "center", position: "relative" }}>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "9px", color: accentMeta.color, letterSpacing: "0.2em", marginBottom: "24px" }}>
              — VAULT EMPTY —
            </div>
            <h2 style={{ fontFamily: "var(--font-cormorant)", fontStyle: "italic", fontSize: "clamp(32px, 5vw, 52px)", color: "#e8e0d0", marginBottom: "16px" }}>
              Your arc has not begun.
            </h2>
            <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", color: "#8a7e6e", marginBottom: "48px", letterSpacing: "0.05em" }}>
              Submit your origin essay. The system is waiting.
            </p>
            <Link href="/onboard" style={{
              display: "inline-block", fontFamily: "'DM Mono', monospace", fontSize: "10px",
              letterSpacing: "0.2em", textTransform: "uppercase", color: accentMeta.color,
              background: "transparent", border: `1px solid ${accentMeta.color}`, padding: "16px 40px",
              textDecoration: "none", transition: "all 0.3s ease",
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = `rgba(${accentMeta.rgb},0.1)`; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
              INITIATE
            </Link>
          </div>

        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0px" }}>
            {cards.map((card, index) => {
              const meta = getMeta(card.archetype);
              const isExpanded = expandedCardId === card.id;
              const number = (index + 1).toString().padStart(2, "0");
              const ms = mangaState[card.id];
              const mangaUrl = ms?.url ?? card.manga_cover ?? null;
              const mangaLoading = ms?.loading ?? false;

              return (
                <div key={card.id} style={{ position: "relative", borderBottom: "1px solid #1a1a16" }}>

                  {/* ── CARD HEADER ROW ────────────────────────────────── */}
                  <div
                    onClick={() => setExpandedCardId(isExpanded ? null : card.id)}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "80px 1fr auto",
                      alignItems: "center",
                      gap: "24px",
                      padding: "32px 0",
                      cursor: "pointer",
                      position: "relative",
                    }}
                  >
                    {/* Ghost number */}
                    <div style={{
                      fontFamily: "var(--font-cormorant)", fontWeight: 700, fontStyle: "italic",
                      fontSize: "72px", color: isExpanded ? meta.color : "#1a1a16",
                      lineHeight: 1, userSelect: "none", transition: "color 0.5s ease",
                      opacity: isExpanded ? 0.4 : 0.6,
                    }}>
                      {number}
                    </div>

                    <div>
                      {/* Date */}
                      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "8px", letterSpacing: "0.2em", color: meta.color, marginBottom: "8px", textTransform: "uppercase" }}>
                        {new Date(card.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }).toUpperCase()}
                      </div>
                      {/* Archetype name */}
                      <h3 style={{
                        fontFamily: "var(--font-cormorant)", fontWeight: 600,
                        fontSize: "clamp(28px, 4vw, 48px)",
                        color: isExpanded ? "#e8e0d0" : "#3a3630",
                        margin: 0, textTransform: "uppercase",
                        transition: "color 0.4s ease", letterSpacing: "0.05em",
                      }}>
                        {card.archetype}
                      </h3>
                      {/* Pulse line */}
                      <div style={{ marginTop: "12px", position: "relative", height: "1px", overflow: "hidden" }}>
                        <div style={{
                          position: "absolute", inset: 0,
                          background: `linear-gradient(90deg, ${meta.color}, transparent)`,
                          width: isExpanded ? "100%" : "30%",
                          transition: "width 0.6s ease",
                          opacity: isExpanded ? 1 : 0.3,
                        }} />
                      </div>
                    </div>

                    {/* Expand / collapse indicator */}
                    <div style={{
                      fontFamily: "'DM Mono', monospace", fontSize: "8px",
                      letterSpacing: "0.15em", textTransform: "uppercase",
                      color: isExpanded ? meta.color : "#2a2820",
                      transition: "color 0.3s ease",
                      display: "flex", alignItems: "center", gap: "8px",
                    }}>
                      <div style={{
                        width: "8px", height: "8px",
                        border: `1px solid ${isExpanded ? meta.color : "#2a2820"}`,
                        position: "relative", transition: "border-color 0.3s ease",
                      }}>
                        <div style={{
                          position: "absolute", inset: "2px",
                          background: meta.color,
                          opacity: isExpanded ? 1 : 0,
                          transition: "opacity 0.3s ease",
                        }} />
                      </div>
                      {isExpanded ? "COLLAPSE" : "EXPAND"}
                    </div>
                  </div>

                  {/* Left accent border — lights up when expanded */}
                  <div style={{
                    position: "absolute",
                    top: 0, left: "-24px",
                    width: "2px", height: isExpanded ? "100%" : "0%",
                    background: `linear-gradient(180deg, ${meta.color}, transparent)`,
                    transition: "height 0.7s ease",
                    boxShadow: `0 0 8px rgba(${meta.rgb},0.4)`,
                  }} />

                  {/* ── EXPANDED PANEL ─────────────────────────────────── */}
                  <div style={{
                    maxHeight: isExpanded ? "3000px" : "0",
                    opacity: isExpanded ? 1 : 0,
                    overflow: "hidden",
                    transition: "max-height 0.8s cubic-bezier(0.25,1,0.5,1), opacity 0.5s ease",
                  }}>
                    <div style={{ paddingBottom: "56px" }}>

                      {/* ── Two-column main content ──────────────────── */}
                      <div className="profile-content-grid" style={{
                        display: "grid",
                        gridTemplateColumns: "minmax(0,480px) 1fr",
                        gap: "48px",
                        alignItems: "start",
                        marginBottom: "40px",
                      }}>
                        {/* Left: Character Card */}
                        <div>
                          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "8px", letterSpacing: "0.2em", color: "#2a2820", textTransform: "uppercase", marginBottom: "16px" }}>
                            ◈ CHARACTER CARD
                          </div>
                          <div id={`card-capture-${card.id}`}>
                            <CharacterCard
                              archetype={card.archetype}
                              secondaryArchetype={card.secondary_archetype}
                              traits={card.traits}
                              confidence={card.confidence}
                              originStory={card.origin_story}
                              traitsFilled={isExpanded}
                            />
                          </div>

                          {/* Card share buttons */}
                          <div style={{ marginTop: "20px" }}>
                            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "8px", letterSpacing: "0.2em", color: "#2a2820", textTransform: "uppercase", marginBottom: "12px" }}>
                              ◈ SHARE CARD
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                              {[
                                { key: "dl",  label: "DOWNLOAD",  icon: "↓", fn: () => handleSaveImage(card) },
                                { key: "wa",  label: "WHATSAPP",  icon: "◉", fn: () => handleWhatsApp(card) },
                                { key: "ig",  label: "INSTAGRAM", icon: "◎", fn: () => handleSaveImage(card) },
                                { key: "x",   label: "X / TWITTER", icon: "✕", fn: () => handleTwitter(card) },
                              ].map(({ key, label, icon, fn }) => (
                                <button key={key} onClick={e => { e.stopPropagation(); fn(); }}
                                  style={{
                                    fontFamily: "'DM Mono', monospace", fontSize: "8px", letterSpacing: "0.12em",
                                    color: "#4a4438", background: "transparent",
                                    border: "1px solid #1a1a16", padding: "10px 12px",
                                    cursor: "pointer", transition: "all 0.25s ease", outline: "none",
                                    display: "flex", alignItems: "center", gap: "8px",
                                    textTransform: "uppercase",
                                  }}
                                  onMouseEnter={e => {
                                    e.currentTarget.style.borderColor = meta.color;
                                    e.currentTarget.style.color = "#e8e0d0";
                                    e.currentTarget.style.background = `rgba(${meta.rgb},0.06)`;
                                  }}
                                  onMouseLeave={e => {
                                    e.currentTarget.style.borderColor = "#1a1a16";
                                    e.currentTarget.style.color = "#4a4438";
                                    e.currentTarget.style.background = "transparent";
                                  }}>
                                  <span style={{ color: meta.color }}>{icon}</span> {label}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Right: Editorial content */}
                        <div>
                          {/* Origin story as editorial quote */}
                          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "8px", letterSpacing: "0.2em", color: "#2a2820", textTransform: "uppercase", marginBottom: "20px" }}>
                            ◈ ORIGIN TRANSMISSION
                          </div>
                          <div style={{ position: "relative", padding: "0 0 0 24px", borderLeft: `2px solid ${meta.color}30`, marginBottom: "32px" }}>
                            <div style={{
                              fontFamily: "var(--font-cormorant)", fontStyle: "italic",
                              fontSize: "clamp(20px, 2.5vw, 28px)", color: "#e8e0d0",
                              lineHeight: 1.5, fontWeight: 300,
                            }}>
                              <span style={{ color: meta.color, fontSize: "3em", lineHeight: 0.1, verticalAlign: "-0.5em", marginRight: "4px", fontStyle: "normal" }}>&ldquo;</span>
                              {card.origin_story}
                              <span style={{ color: meta.color, fontSize: "3em", lineHeight: 0.1, verticalAlign: "-0.5em", marginLeft: "4px", fontStyle: "normal" }}>&rdquo;</span>
                            </div>
                          </div>

                          {/* Key themes */}
                          {card.key_themes && card.key_themes.length > 0 && (
                            <div style={{ marginBottom: "32px" }}>
                              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "8px", letterSpacing: "0.2em", color: "#2a2820", textTransform: "uppercase", marginBottom: "12px" }}>
                                ◈ KEY THEMES
                              </div>
                              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                                {card.key_themes.map((theme: string, i: number) => (
                                  <span key={i} style={{
                                    fontFamily: "'DM Mono', monospace", fontSize: "8px",
                                    letterSpacing: "0.12em", textTransform: "uppercase",
                                    color: meta.color, padding: "6px 14px",
                                    border: `1px solid ${meta.color}30`,
                                    background: `rgba(${meta.rgb},0.05)`,
                                    clipPath: "polygon(6px 0%, 100% 0%, calc(100% - 6px) 100%, 0% 100%)",
                                  }}>
                                    {theme}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Confidence meter */}
                          <div>
                            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "8px", letterSpacing: "0.2em", color: "#2a2820", textTransform: "uppercase", marginBottom: "10px" }}>
                              ◈ ARCHETYPE CONFIDENCE
                            </div>
                            <div style={{ position: "relative", height: "2px", background: "#1a1a16", marginBottom: "6px" }}>
                              <div style={{
                                position: "absolute", top: 0, left: 0, height: "100%",
                                width: `${card.confidence || 0}%`,
                                background: `linear-gradient(90deg, ${meta.color}, rgba(${meta.rgb},0.4))`,
                                transition: "width 1.2s ease",
                                boxShadow: `0 0 6px rgba(${meta.rgb},0.5)`,
                              }} />
                            </div>
                            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "8px", color: "#4a4438", letterSpacing: "0.1em" }}>
                              {card.confidence || 0}% — {card.confidence >= 85 ? "DEFINITIVE" : card.confidence >= 70 ? "STRONG MATCH" : "EMERGING"}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* ── MANGA COVER SECTION ─────────────────────────── */}
                      <div style={{
                        borderTop: "1px solid #1a1a16",
                        paddingTop: "40px",
                        marginTop: "8px",
                      }}>
                        {/* Section header */}
                        <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "24px" }}>
                          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "8px", letterSpacing: "0.2em", color: "#2a2820", textTransform: "uppercase" }}>
                            ◈ CHAPTER 01
                          </div>
                          <div style={{ flex: 1, height: "1px", background: `linear-gradient(90deg, rgba(${meta.rgb},0.2), transparent)` }} />
                          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "7px", color: "#2a2820", letterSpacing: "0.1em" }}>
                            ORIGIN COVER — COLLECTOR&apos;S EDITION
                          </div>
                        </div>

                        {/* Generate button state */}
                        {!mangaUrl && !mangaLoading && (
                          <div style={{ maxWidth: "480px" }}>
                            <button
                              onClick={e => { e.stopPropagation(); handleGenerateManga(card); }}
                              style={{
                                width: "100%", padding: "18px",
                                fontFamily: "'DM Mono', monospace", fontSize: "10px",
                                letterSpacing: "0.2em", textTransform: "uppercase",
                                color: meta.color, background: "transparent",
                                border: `1px solid ${meta.color}`, cursor: "pointer",
                                transition: "all 0.3s ease", outline: "none",
                                position: "relative", overflow: "hidden",
                              }}
                              onMouseEnter={e => {
                                e.currentTarget.style.background = `rgba(${meta.rgb},0.08)`;
                                e.currentTarget.style.boxShadow = `0 0 20px rgba(${meta.rgb},0.15)`;
                              }}
                              onMouseLeave={e => {
                                e.currentTarget.style.background = "transparent";
                                e.currentTarget.style.boxShadow = "none";
                              }}
                            >
                              ◈ GENERATE YOUR ORIGIN COVER
                            </button>
                            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "8px", color: "#2a2820", marginTop: "8px", textAlign: "center", letterSpacing: "0.08em" }}>
                              Free · 15–30 seconds · Collector&apos;s edition quality
                            </div>
                          </div>
                        )}

                        {/* Loading state */}
                        {mangaLoading && (
                          <div style={{ maxWidth: "480px", padding: "32px", border: "1px solid #1a1a16", background: "#0d0d0b", textAlign: "center" }}>
                            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "9px", color: "#8a7e6e", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "20px" }}>
                              Illustrating your arc...
                            </div>
                            {/* Multi-line scan animation */}
                            {[0, 1, 2].map(j => (
                              <div key={j} style={{ width: "100%", height: "1px", background: "#1a1a16", overflow: "hidden", marginBottom: "12px", position: "relative" }}>
                                <div style={{
                                  position: "absolute", top: 0, left: 0, height: "100%",
                                  background: `linear-gradient(90deg, transparent, ${meta.color}, transparent)`,
                                  width: "50%",
                                  animation: `mangaScan 1.8s ease-in-out ${j * 0.3}s infinite`,
                                }} />
                              </div>
                            ))}
                            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "8px", color: "#2a2820", letterSpacing: "0.1em" }}>
                              The system is writing your legend.
                            </div>
                          </div>
                        )}

                        {/* Manga image + share buttons */}
                        {mangaUrl && !mangaLoading && (
                          <div className="profile-manga-grid" style={{ display: "grid", gridTemplateColumns: "minmax(0,480px) 1fr", gap: "32px", alignItems: "start" }}>
                            {/* Image with parallelogram clip + glow */}
                            <div>
                              <div style={{
                                position: "relative",
                                clipPath: "polygon(0% 0%, 100% 0%, 98% 100%, 2% 100%)",
                                boxShadow: `0 0 40px rgba(${meta.rgb},0.15)`,
                              }}>
                                <img
                                  src={mangaUrl}
                                  alt="Manga origin cover"
                                  style={{ width: "100%", display: "block", filter: "contrast(1.1) saturate(1.05)" }}
                                />
                                {/* Overlay label */}
                                <div style={{
                                  position: "absolute", bottom: "12px", left: "16px",
                                  fontFamily: "'DM Mono', monospace", fontSize: "7px",
                                  color: "rgba(232,224,208,0.5)", letterSpacing: "0.15em", textTransform: "uppercase",
                                }}>
                                  ARXEVO — CHAPTER 01 — {accentMeta.label}
                                </div>
                              </div>
                            </div>

                            {/* Right: share actions */}
                            <div>
                              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "8px", letterSpacing: "0.2em", color: "#2a2820", textTransform: "uppercase", marginBottom: "16px" }}>
                                ◈ SHARE YOUR COVER
                              </div>
                              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                {[
                                  { key: "share", label: "SHARE IMAGE",  icon: "↑", fn: () => handleShareManga(mangaUrl, card),        desc: "Web Share / native" },
                                  { key: "dl",    label: "DOWNLOAD",     icon: "↓", fn: () => handleDownloadManga(mangaUrl, card.archetype), desc: "Save as .jpg" },
                                  { key: "wa",    label: "WHATSAPP",     icon: "◉", fn: () => handleMangaWhatsApp(mangaUrl, card),      desc: "With caption" },
                                  { key: "x",     label: "X / TWITTER",  icon: "✕", fn: () => handleMangaTwitter(mangaUrl, card),       desc: "Cliffhanger post" },
                                ].map(({ key, label, icon, fn, desc }) => (
                                  <button key={key} onClick={e => { e.stopPropagation(); fn(); }}
                                    style={{
                                      fontFamily: "'DM Mono', monospace", fontSize: "9px", letterSpacing: "0.12em",
                                      color: "#4a4438", background: "transparent",
                                      border: "1px solid #1a1a16", padding: "12px 16px",
                                      cursor: "pointer", transition: "all 0.25s ease", outline: "none",
                                      display: "grid", gridTemplateColumns: "16px 1fr auto",
                                      alignItems: "center", gap: "10px",
                                      textTransform: "uppercase", textAlign: "left",
                                    }}
                                    onMouseEnter={e => {
                                      e.currentTarget.style.borderColor = meta.color;
                                      e.currentTarget.style.color = "#e8e0d0";
                                      e.currentTarget.style.background = `rgba(${meta.rgb},0.06)`;
                                    }}
                                    onMouseLeave={e => {
                                      e.currentTarget.style.borderColor = "#1a1a16";
                                      e.currentTarget.style.color = "#4a4438";
                                      e.currentTarget.style.background = "transparent";
                                    }}>
                                    <span style={{ color: meta.color }}>{icon}</span>
                                    <span>{label}</span>
                                    <span style={{ fontSize: "7px", color: "#2a2820", letterSpacing: "0.05em", textTransform: "none" }}>{desc}</span>
                                  </button>
                                ))}
                              </div>

                              {/* Regenerate */}
                              <button
                                onClick={e => {
                                  e.stopPropagation();
                                  setMangaState(prev => ({ ...prev, [card.id]: { url: null, loading: false } }));
                                }}
                                style={{
                                  marginTop: "16px", width: "100%", padding: "10px",
                                  fontFamily: "'DM Mono', monospace", fontSize: "8px",
                                  letterSpacing: "0.1em", color: "#2a2820", background: "transparent",
                                  border: "1px solid #1a1a16", cursor: "pointer",
                                  transition: "color 0.2s, border-color 0.2s", outline: "none",
                                  textTransform: "uppercase",
                                }}
                                onMouseEnter={e => { e.currentTarget.style.color = "#4a4438"; e.currentTarget.style.borderColor = "#2a2820"; }}
                                onMouseLeave={e => { e.currentTarget.style.color = "#2a2820"; e.currentTarget.style.borderColor = "#1a1a16"; }}
                              >
                                ↺ REGENERATE
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── FOOTER ─────────────────────────────────────────────────────── */}
        <div style={{ marginTop: "100px", paddingTop: "40px", borderTop: "1px solid #1a1a16", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
          <Link href="/onboard" style={{
            fontFamily: "'DM Mono', monospace", fontSize: "9px", color: "#2a2820",
            textDecoration: "none", letterSpacing: "0.15em", textTransform: "uppercase",
            transition: "color 0.2s",
          }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = accentMeta.color; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "#2a2820"; }}>
            ◈ Submit a new essay
          </Link>
          <span style={{ fontFamily: "var(--font-cormorant)", fontStyle: "italic", fontSize: "18px", color: "#1a1a16", letterSpacing: "0.1em" }}>
            ARXEVO
          </span>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "7px", color: "#1a1a16", letterSpacing: "0.1em" }}>
            SYSTEM ARCHIVES v1.0
          </span>
        </div>

      </main>

      {/* ── Global keyframes ──────────────────────────────────────────────── */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fadeInOut {
          0%   { opacity: 0; transform: translate(-50%, -12px); }
          12%  { opacity: 1; transform: translate(-50%, 0); }
          88%  { opacity: 1; transform: translate(-50%, 0); }
          100% { opacity: 0; transform: translate(-50%, -12px); }
        }
        @keyframes mangaScan {
          0%   { transform: translateX(-120%); }
          100% { transform: translateX(220%); }
        }
        @keyframes loadSpin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes marqueeScroll {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        @keyframes shardDrift1 {
          0%,100% { transform: translateY(0px) rotate(0deg); }
          50%     { transform: translateY(-18px) rotate(4deg); }
        }
        @keyframes shardDrift2 {
          0%,100% { transform: translateY(0px) rotate(0deg); }
          33%     { transform: translateY(12px) rotate(-3deg); }
          66%     { transform: translateY(-8px) rotate(5deg); }
        }
        @keyframes shardDrift3 {
          0%,100% { transform: translateY(0px) rotate(0deg) scale(1); }
          50%     { transform: translateY(-10px) rotate(-4deg) scale(1.03); }
        }
        @media (max-width: 768px) {
          .shard-shape { display: none !important; }
          .profile-header-grid { grid-template-columns: 1fr !important; gap: 16px !important; }
          .profile-content-grid { grid-template-columns: 1fr !important; gap: 32px !important; }
          .profile-manga-grid { grid-template-columns: 1fr !important; gap: 24px !important; }
          .disconnect-btn { position: relative !important; top: 0 !important; margin-top: 16px !important; align-self: flex-start !important; }
        }
      `}} />
    </div>
  );
}
