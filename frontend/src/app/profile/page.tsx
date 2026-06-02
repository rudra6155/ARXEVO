"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getUser, getUserCards, signOut, saveCard } from "@/lib/auth";
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

function getTopTraits(traits: Record<string, number> = {}) {
  return Object.entries(traits)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
}

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [cards, setCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    async function loadData() {
      const currentUser = await getUser();
      if (!currentUser) {
        router.push("/");
        return;
      }
      setUser(currentUser);

      // Check for pending_card
      const pendingCard = sessionStorage.getItem('pending_card');
      if (pendingCard) {
        try {
          const profileData = JSON.parse(pendingCard);
          await saveCard(profileData);
          sessionStorage.removeItem('pending_card');
          setToastMessage("Arc saved to your vault.");
          setTimeout(() => setToastMessage(null), 3000);
        } catch (err) {
          console.error("Failed to save pending card", err);
        }
      }

      try {
        const userCards = await getUserCards();
        setCards(userCards);
      } catch (e) {
        console.error("Failed to load cards", e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [router]);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", backgroundColor: "#0a0a08", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", letterSpacing: "0.15em", color: "#4a4438" }}>
          LOADING SECURE DATA...
        </span>
      </div>
    );
  }

  if (!user) return null;

  const firstName = user.user_metadata?.name?.split(" ")[0] || "User";
  const recentCard = cards[0];
  const oldestCard = cards.length > 1 ? cards[cards.length - 1] : null;

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#0a0a08", color: "#e8e0d0", position: "relative", overflowX: "hidden" }}>
      
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

      {/* Ghost Archetype Symbol */}
      {recentCard && (
        <div style={{ position: "absolute", right: "-40px", top: "60px", opacity: 0.04, pointerEvents: "none" }}>
          <ArchetypeSymbol archetype={recentCard.archetype} color={getMeta(recentCard.archetype).color} size={200} />
        </div>
      )}

      <main style={{ maxWidth: "800px", margin: "0 auto", padding: "100px 40px", position: "relative", zIndex: 10 }}>
        
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "64px" }}>
          <div>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", letterSpacing: "0.2em", color: "#b8960c", display: "block", marginBottom: "16px" }}>
              YOUR VAULT
            </span>
            <h1 style={{ fontFamily: "var(--font-cormorant)", fontStyle: "italic", fontSize: "clamp(40px, 5vw, 64px)", color: "#e8e0d0", margin: "0 0 16px 0", lineHeight: 1.1 }}>
              {firstName}'s Arc.
            </h1>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "11px", color: "#8a7e6e" }}>
              {cards.length} arcs recorded. Last updated {recentCard ? new Date(recentCard.created_at).toLocaleDateString("en-US", { year: 'numeric', month: 'short', day: 'numeric' }) : 'Never'}.
            </div>
          </div>
          <button
            onClick={async () => {
              await signOut();
              router.push("/");
            }}
            style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", color: "#4a4438", background: "none", border: "none", cursor: "pointer", transition: "color 0.2s" }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "#e8e0d0"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "#4a4438"; }}
          >
            Sign out →
          </button>
        </div>

        {cards.length === 0 ? (
          <div style={{ padding: "64px 0" }}>
            <h2 style={{ fontFamily: "var(--font-cormorant)", fontStyle: "italic", fontSize: "28px", color: "#e8e0d0", marginBottom: "16px" }}>
              Your vault is empty.
            </h2>
            <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "11px", color: "#8a7e6e", marginBottom: "32px" }}>
              Submit your first essay to begin your arc.
            </p>
            <Link
              href="/onboard"
              style={{
                display: "inline-block",
                fontFamily: "'DM Mono', monospace",
                fontSize: "10px",
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                color: "#e8e0d0",
                background: "transparent",
                border: "1px solid #e8e0d0",
                padding: "14px 32px",
                textDecoration: "none",
                transition: "all 0.3s ease",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#e8e0d0"; e.currentTarget.style.color = "#0a0a08"; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = "#e8e0d0"; }}
            >
              Submit Your Origin
            </Link>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {cards.map((card) => {
              const meta = getMeta(card.archetype);
              const isExpanded = expandedCardId === card.id;
              
              return (
                <div key={card.id} style={{ borderBottom: "1px solid #1a1a16" }}>
                  <div style={{ padding: "28px 0", display: "grid", gridTemplateColumns: "auto 1fr auto auto", gap: "24px", alignItems: "center" }}>
                    <ArchetypeSymbol archetype={card.archetype} color={meta.color} size={20} />
                    
                    <div>
                      <h3 style={{ fontFamily: "var(--font-cormorant)", fontWeight: 600, fontSize: "20px", color: "#e8e0d0", margin: "0 0 4px 0", textTransform: "uppercase" }}>
                        {card.archetype}
                      </h3>
                      <p style={{ fontFamily: "var(--font-cormorant)", fontStyle: "italic", fontSize: "14px", color: "#8a7e6e", margin: 0 }}>
                        {card.origin_story.substring(0, 80)}...
                      </p>
                    </div>

                    <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", color: "#4a4438" }}>
                      {new Date(card.created_at).toLocaleDateString("en-US", { year: 'numeric', month: 'short', day: 'numeric' })}
                    </div>

                    <button
                      onClick={() => setExpandedCardId(isExpanded ? null : card.id)}
                      style={{
                        fontFamily: "'DM Mono', monospace",
                        fontSize: "10px",
                        color: "#8a7e6e",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        transition: "color 0.2s",
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = "#b8960c"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = "#8a7e6e"; }}
                    >
                      {isExpanded ? "Close" : "View →"}
                    </button>
                  </div>
                  
                  <div style={{
                    maxHeight: isExpanded ? "1000px" : "0",
                    opacity: isExpanded ? 1 : 0,
                    overflow: "hidden",
                    transition: "all 0.5s ease-in-out",
                  }}>
                    <div style={{ padding: "0 0 40px 0", display: "flex", justifyContent: "center" }}>
                      <div style={{ transform: "scale(0.8)", transformOrigin: "top center", width: "100%", maxWidth: "480px" }}>
                        <CharacterCard
                          archetype={card.archetype}
                          secondaryArchetype={card.secondary_archetype}
                          traits={card.traits}
                          confidence={card.confidence}
                          originStory={card.origin_story}
                          traitsFilled={true}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Arc Evolution Section */}
        {cards.length > 1 && oldestCard && recentCard && (
          <div style={{ marginTop: "64px" }}>
            <div style={{ height: "1px", background: "#1a1a16", marginBottom: "32px" }} />
            <h3 style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", color: "#b8960c", marginBottom: "32px", letterSpacing: "0.15em" }}>
              ARC EVOLUTION
            </h3>
            
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "24px", marginBottom: "32px" }}>
              {/* Oldest */}
              <div style={{ flex: 1, padding: "24px", background: "#111109", border: "1px solid #1a1a16" }}>
                <h4 style={{ fontFamily: "var(--font-cormorant)", fontSize: "20px", color: "#e8e0d0", margin: "0 0 8px 0", textTransform: "uppercase" }}>{oldestCard.archetype}</h4>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", color: "#4a4438", marginBottom: "24px" }}>
                  {new Date(oldestCard.created_at).toLocaleDateString("en-US", { year: 'numeric', month: 'short', day: 'numeric' })}
                </div>
                <div>
                  {getTopTraits(oldestCard.traits).map(([trait, val]) => (
                    <div key={trait} style={{ marginBottom: "12px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "'DM Mono', monospace", fontSize: "9px", color: "#8a7e6e", marginBottom: "4px" }}>
                        <span>{trait.toUpperCase()}</span>
                        <span>{val}</span>
                      </div>
                      <div style={{ height: "2px", background: "#1a1a16", width: "100%" }}>
                        <div style={{ height: "100%", background: getMeta(oldestCard.archetype).color, width: `${val}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "16px", color: "#4a4438" }}>→</div>

              {/* Newest */}
              <div style={{ flex: 1, padding: "24px", background: "#111109", border: `1px solid ${getMeta(recentCard.archetype).color}` }}>
                <h4 style={{ fontFamily: "var(--font-cormorant)", fontSize: "20px", color: "#e8e0d0", margin: "0 0 8px 0", textTransform: "uppercase" }}>{recentCard.archetype}</h4>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", color: "#4a4438", marginBottom: "24px" }}>
                  {new Date(recentCard.created_at).toLocaleDateString("en-US", { year: 'numeric', month: 'short', day: 'numeric' })}
                </div>
                <div>
                  {getTopTraits(recentCard.traits).map(([trait, val]) => (
                    <div key={trait} style={{ marginBottom: "12px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "'DM Mono', monospace", fontSize: "9px", color: "#8a7e6e", marginBottom: "4px" }}>
                        <span>{trait.toUpperCase()}</span>
                        <span>{val}</span>
                      </div>
                      <div style={{ height: "2px", background: "#1a1a16", width: "100%" }}>
                        <div style={{ height: "100%", background: getMeta(recentCard.archetype).color, width: `${val}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <p style={{ fontFamily: "var(--font-cormorant)", fontStyle: "italic", fontSize: "18px", color: "#8a7e6e", textAlign: "center" }}>
              Your arc has shifted. Submit again to track your next chapter.
            </p>
          </div>
        )}

        {/* Bottom */}
        <div style={{ marginTop: "64px", borderTop: "1px solid #1a1a16", paddingTop: "32px", display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
          <Link href="/onboard" style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", color: "#4a4438", textDecoration: "none" }}>
            Submit a new essay →
          </Link>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", color: "#4a4438" }}>
            This tracks how your arc evolves over time.
          </span>
        </div>

      </main>

      <style dangerouslySetInnerHTML={{ __html: `
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
