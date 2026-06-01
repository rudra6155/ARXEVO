"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getUser, getUserCards, signOut } from "@/lib/auth";
import Link from "next/link";
import Footer from "@/components/Footer";
import { User } from "@supabase/supabase-js";

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [cards, setCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function loadData() {
      const currentUser = await getUser();
      if (!currentUser) {
        router.push("/");
        return;
      }
      setUser(currentUser);

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

  if (!user) return null; // Redirecting

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#0a0a08", color: "#e8e0d0", display: "flex", flexDirection: "column" }}>
      
      {/* Nav */}
      <nav style={{ position: "sticky", top: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 48px", backgroundColor: "#0a0a08", borderBottom: "1px solid #1a1a16" }}>
        <Link
          href="/"
          style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "16px", letterSpacing: "0.05em", color: "#e8e0d0", textDecoration: "none" }}
        >
          ARXEVO
        </Link>
        <button
          onClick={async () => {
            await signOut();
            router.push("/");
          }}
          style={{ fontFamily: "'DM Mono', monospace", fontSize: "9px", letterSpacing: "0.15em", textTransform: "uppercase", color: "#8a7e6e", background: "transparent", border: "1px solid #2a2820", padding: "10px 20px", cursor: "pointer", outline: "none" }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#c41e1e"; e.currentTarget.style.color = "#c41e1e"; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#2a2820"; e.currentTarget.style.color = "#8a7e6e"; }}
        >
          Sign Out
        </button>
      </nav>

      <main style={{ flex: 1, maxWidth: "720px", margin: "0 auto", padding: "80px 24px", width: "100%" }}>
        <span
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: "10px",
            letterSpacing: "0.2em",
            color: "#8a7e6e",
            textTransform: "uppercase",
            display: "block",
            marginBottom: "20px",
          }}
        >
          DATA VAULT
        </span>
        <h1
          style={{
            fontFamily: "var(--font-cormorant)",
            fontWeight: 400,
            fontStyle: "italic",
            fontSize: "var(--text-hero)",
            color: "var(--cream)",
            lineHeight: 1.1,
            marginBottom: "16px",
          }}
        >
          Your Arcs.
        </h1>
        <p
          style={{
            fontFamily: "var(--font-dm-mono)",
            fontSize: "var(--text-small)",
            color: "#b0a390",
            lineHeight: 1.8,
            marginBottom: "64px",
          }}
        >
          Access your permanently encrypted character cards.
        </p>

        {cards.length === 0 ? (
          <div style={{ textAlign: "center", padding: "64px 0", borderTop: "1px solid #1a1a16", borderBottom: "1px solid #1a1a16" }}>
            <p style={{ fontFamily: "var(--font-cormorant)", fontStyle: "italic", fontSize: "24px", color: "#b0a390", marginBottom: "24px" }}>
              No arcs saved yet.
            </p>
            <Link
              href="/onboard"
              style={{
                display: "inline-block",
                fontFamily: "'DM Mono', monospace",
                fontSize: "11px",
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: "#e8e0d0",
                background: "transparent",
                border: "1px solid #e8e0d0",
                padding: "14px 24px",
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
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {cards.map((card) => (
              <div 
                key={card.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "24px",
                  border: "1px solid #2a2820",
                  backgroundColor: "#111109",
                }}
              >
                <div>
                  <h3 style={{ fontFamily: "var(--font-cormorant)", fontWeight: 600, fontSize: "24px", color: "var(--cream)", textTransform: "uppercase", marginBottom: "8px" }}>
                    {card.archetype}
                  </h3>
                  <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", color: "#4a4438", letterSpacing: "0.15em", textTransform: "uppercase" }}>
                    {new Date(card.created_at).toLocaleDateString("en-US", { year: 'numeric', month: 'short', day: 'numeric' })}
                  </span>
                </div>
                
                <button
                  onClick={() => {
                    // Temporarily set the local storage to this card's data and redirect to /card to view it
                    localStorage.setItem("arxevo_profile", JSON.stringify({
                      archetype: card.archetype,
                      secondary_archetype: card.secondary_archetype,
                      origin_story: card.origin_story,
                      traits: card.traits,
                      confidence: card.confidence
                    }));
                    router.push("/card");
                  }}
                  style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: "10px",
                    letterSpacing: "0.15em",
                    textTransform: "uppercase",
                    color: "#8a7e6e",
                    background: "transparent",
                    border: "none",
                    borderBottom: "1px solid #2a2820",
                    padding: "4px 0",
                    cursor: "pointer",
                    transition: "all 0.3s ease",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#b8960c"; e.currentTarget.style.color = "#e8e0d0"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#2a2820"; e.currentTarget.style.color = "#8a7e6e"; }}
                >
                  VIEW →
                </button>
              </div>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
