"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getUserCards, signOut, saveCard } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { User } from "@supabase/supabase-js";
import CharacterCard from "@/components/CharacterCard";

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

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [cards, setCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const router = useRouter();

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  useEffect(() => {
    async function loadData() {
      let activeSession = null;
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        const { data: { session: hashSession } } = await supabase.auth.getSession();
        if (!hashSession) {
          router.replace('/');
          return;
        }
        activeSession = hashSession;
      } else {
        activeSession = session;
      }
      
      setUser(activeSession.user);

      // Check for pending_card from OAuth
      const pendingCard = sessionStorage.getItem('pending_card');
      if (pendingCard) {
        try {
          const profileData = JSON.parse(pendingCard);
          await saveCard(profileData);
          sessionStorage.removeItem('pending_card');
          showToast("Arc saved to your vault.");
        } catch (err) {
          console.error("Failed to save pending card", err);
        }
      }

      try {
        const userCards = await getUserCards();
        setCards(userCards);
        if (userCards.length > 0) {
          setExpandedCardId(userCards[0].id);
        }
      } catch (e) {
        console.error("Failed to load cards", e);
      } finally {
        setLoading(false);
      }
    }
    loadData();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) setUser(session.user);
      if (event === 'SIGNED_OUT') router.replace('/');
    });

    return () => subscription.unsubscribe();
  }, [router]);

  // Share Actions
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

    await new Promise(resolve => requestAnimationFrame(resolve));
    await new Promise(resolve => requestAnimationFrame(resolve));

    const captureHeight = Math.max(cardEl.scrollHeight, 1350);

    const canvas = await h2c(cardEl, {
      backgroundColor: "#111109",
      scale: 2.25,
      useCORS: true,
      logging: false,
      height: captureHeight,
      windowHeight: captureHeight,
    });

    cardEl.style.height = originalHeight;
    cardEl.style.minHeight = originalMinHeight;
    cardEl.style.overflow = originalOverflow;

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
    link.download = `arxevo-${card.archetype}-card.png`;
    link.href = final.toDataURL("image/png");
    link.click();
  }, []);

  const handleWhatsApp = useCallback((card: any) => {
    const meta = getMeta(card.archetype);
    const text = `I just discovered my ARXEVO archetype: ${meta.label}.\n\n"${card.origin_story.slice(0, 120)}..."\n\nDiscover yours: https://arxevo.filtree.in`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  }, []);

  const handleInstagram = useCallback(async (card: any) => {
    await handleSaveImage(card);
  }, [handleSaveImage]);

  const handleTwitter = useCallback((card: any) => {
    const meta = getMeta(card.archetype);
    const text = `Just discovered I'm a ${meta.label} on ARXEVO.\n\n"${card.origin_story.slice(0, 100)}..."\n\nhttps://arxevo.filtree.in #ARXEVO`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, "_blank");
  }, []);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", backgroundColor: "#0a0a08", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", letterSpacing: "0.15em", color: "#4a4438" }}>
          DECRYPTING VAULT...
        </span>
      </div>
    );
  }

  if (!user) return null;

  const firstName = user.user_metadata?.name?.split(" ")[0] || "User";
  const recentCard = cards[0];

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#0a0a08", color: "#e8e0d0", position: "relative", overflowX: "hidden" }}>
      
      {/* Toast Message */}
      {toastMessage && (
        <div style={{
          position: "fixed", top: "40px", left: "50%", transform: "translateX(-50%)", zIndex: 3000,
          background: "#111109", border: "1px solid #b8960c", padding: "12px 24px",
          fontFamily: "'DM Mono', monospace", fontSize: "12px", color: "#b8960c",
          letterSpacing: "0.1em", textTransform: "uppercase", boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
          animation: "fadeInOut 3s forwards"
        }}>
          {toastMessage}
        </div>
      )}

      {/* Massive Glowing Archetype Background */}
      {recentCard && (
        <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", opacity: 0.03, pointerEvents: "none", zIndex: 0 }}>
          <div style={{ filter: "blur(8px)", transform: "scale(1.05)" }}>
             <ArchetypeSymbol archetype={recentCard.archetype} color={getMeta(recentCard.archetype).color} size={800} />
          </div>
          <div style={{ position: "absolute", top: 0, left: 0 }}>
             <ArchetypeSymbol archetype={recentCard.archetype} color={getMeta(recentCard.archetype).color} size={800} />
          </div>
        </div>
      )}

      <main style={{ maxWidth: "1000px", margin: "0 auto", padding: "100px 40px", position: "relative", zIndex: 10 }}>
        
        {/* Header - Editorial Style */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "80px", borderBottom: "1px solid #1a1a16", paddingBottom: "40px" }}>
          <div>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", letterSpacing: "0.2em", color: "#b8960c", display: "block", marginBottom: "24px" }}>
              VAULT ACCESS GRANTED
            </span>
            <h1 style={{ fontFamily: "var(--font-cormorant)", fontWeight: 300, fontStyle: "italic", fontSize: "clamp(48px, 6vw, 84px)", color: "#e8e0d0", margin: "0 0 8px 0", lineHeight: 1 }}>
              {firstName}'s Arc.
            </h1>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", letterSpacing: "0.1em", color: "#4a4438", textTransform: "uppercase" }}>
              SYSTEM ARCHIVES / {cards.length} RECORDS FOUND
            </div>
          </div>
          <button
            onClick={async () => {
              await signOut();
              router.push("/");
            }}
            style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", letterSpacing: "0.1em", color: "#4a4438", background: "none", border: "none", cursor: "pointer", transition: "color 0.2s", textTransform: "uppercase", paddingBottom: "8px" }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "#e8e0d0"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "#4a4438"; }}
          >
            DISCONNECT
          </button>
        </div>

        {cards.length === 0 ? (
          <div style={{ padding: "64px 0", textAlign: "center" }}>
            <h2 style={{ fontFamily: "var(--font-cormorant)", fontStyle: "italic", fontSize: "32px", color: "#e8e0d0", marginBottom: "16px" }}>
              The vault is empty.
            </h2>
            <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "11px", color: "#8a7e6e", marginBottom: "40px", letterSpacing: "0.05em" }}>
              Submit your origin essay to begin your arc.
            </p>
            <Link
              href="/onboard"
              style={{
                display: "inline-block", fontFamily: "'DM Mono', monospace", fontSize: "10px", letterSpacing: "0.15em", textTransform: "uppercase",
                color: "#e8e0d0", background: "transparent", border: "1px solid #e8e0d0", padding: "16px 36px", textDecoration: "none", transition: "all 0.3s ease",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#e8e0d0"; e.currentTarget.style.color = "#0a0a08"; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = "#e8e0d0"; }}
            >
              INITIATE
            </Link>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "64px" }}>
            {cards.map((card, index) => {
              const meta = getMeta(card.archetype);
              const isExpanded = expandedCardId === card.id;
              const number = (index + 1).toString().padStart(2, '0');
              
              return (
                <div key={card.id} style={{ position: "relative" }}>
                  
                  {/* Large Ghost Number */}
                  <div style={{ position: "absolute", top: "-40px", left: "-60px", fontFamily: "var(--font-cormorant)", fontSize: "160px", fontWeight: 300, fontStyle: "italic", color: "#1a1a16", opacity: 0.5, pointerEvents: "none", zIndex: -1, lineHeight: 0.8 }}>
                    {number}
                  </div>

                  {/* Header Row */}
                  <div 
                    onClick={() => setExpandedCardId(isExpanded ? null : card.id)}
                    style={{ display: "grid", gridTemplateColumns: "1fr auto", alignItems: "flex-end", cursor: "pointer", borderBottom: `1px solid ${isExpanded ? meta.color : '#1a1a16'}`, paddingBottom: "16px", transition: "border-color 0.4s ease" }}
                  >
                    <div>
                      <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", letterSpacing: "0.15em", color: meta.color, display: "block", marginBottom: "8px" }}>
                        {new Date(card.created_at).toLocaleDateString("en-US", { year: 'numeric', month: 'short', day: 'numeric' }).toUpperCase()}
                      </span>
                      <h3 style={{ fontFamily: "var(--font-cormorant)", fontWeight: 600, fontSize: "36px", color: isExpanded ? "#e8e0d0" : "#8a7e6e", margin: 0, textTransform: "uppercase", transition: "color 0.4s ease" }}>
                        {card.archetype}
                      </h3>
                    </div>
                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", letterSpacing: "0.1em", color: isExpanded ? meta.color : "#4a4438", textTransform: "uppercase", transition: "color 0.4s ease" }}>
                      {isExpanded ? "COLLAPSE" : "EXPAND"}
                    </span>
                  </div>
                  
                  {/* Expanded Content */}
                  <div style={{
                    maxHeight: isExpanded ? "2000px" : "0",
                    opacity: isExpanded ? 1 : 0,
                    overflow: "hidden",
                    transition: "all 0.7s cubic-bezier(0.25, 1, 0.5, 1)",
                  }}>
                    <div style={{ padding: "48px 0 0", display: "flex", flexDirection: "column", alignItems: "center" }}>
                      
                      {/* Character Card Render (wrapped for html2canvas) */}
                      <div id={`card-capture-${card.id}`} style={{ width: "100%", maxWidth: "480px" }}>
                        <CharacterCard
                          archetype={card.archetype}
                          secondaryArchetype={card.secondary_archetype}
                          traits={card.traits}
                          confidence={card.confidence}
                          originStory={card.origin_story}
                          traitsFilled={isExpanded}
                        />
                      </div>

                      {/* Action Buttons Row */}
                      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", justifyContent: "center", marginTop: "32px", width: "100%", maxWidth: "480px" }}>
                        {[
                          { key: "download", label: "DOWNLOAD", fn: () => handleSaveImage(card) },
                          { key: "whatsapp", label: "WHATSAPP", fn: () => handleWhatsApp(card) },
                          { key: "instagram", label: "INSTAGRAM", fn: () => handleInstagram(card) },
                          { key: "twitter", label: "X", fn: () => handleTwitter(card) },
                        ].map(({ key, label, fn }) => (
                          <button
                            key={key}
                            onClick={(e) => { e.stopPropagation(); fn(); }}
                            style={{
                              fontFamily: "'DM Mono', monospace", fontSize: "9px", letterSpacing: "0.15em", color: "#8a7e6e", background: "transparent",
                              border: "1px solid #2a2820", padding: "10px 20px", cursor: "pointer", transition: "border-color 0.3s ease, color 0.3s ease", outline: "none",
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.borderColor = meta.color; e.currentTarget.style.color = "#e8e0d0"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#2a2820"; e.currentTarget.style.color = "#8a7e6e"; }}
                          >
                            {label}
                          </button>
                        ))}
                      </div>

                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer Link */}
        <div style={{ marginTop: "120px", borderTop: "1px solid #1a1a16", paddingTop: "40px", display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
          <Link href="/onboard" style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", color: "#4a4438", textDecoration: "none", letterSpacing: "0.1em", textTransform: "uppercase", transition: "color 0.2s" }} onMouseEnter={(e) => { e.currentTarget.style.color = "#8a7e6e"; }} onMouseLeave={(e) => { e.currentTarget.style.color = "#4a4438"; }}>
            Submit a new essay →
          </Link>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "9px", color: "#2a2820", letterSpacing: "0.05em" }}>
            ARXEVO SYSTEM ARCHIVES
          </span>
        </div>

      </main>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fadeInOut {
          0% { opacity: 0; transform: translate(-50%, -20px); }
          15% { opacity: 1; transform: translate(-50%, 0); }
          85% { opacity: 1; transform: translate(-50%, 0); }
          100% { opacity: 0; transform: translate(-50%, -20px); }
        }
      `}} />
    </div>
  );
}
