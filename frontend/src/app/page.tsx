"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import RevolverEntry  from "@/components/RevolverEntry";
import GlassShatter, { GlassShatterRef } from "@/components/GlassShatter";
import ContentTrack   from "@/components/ContentTrack";
import VaultNav       from "@/components/VaultNav";
import Footer         from "@/components/Footer";

type AppState = "entry" | "transitioning" | "exploring";

export default function Home() {
  const router = useRouter();
  const [appState, setAppState] = useState<AppState | null>(null);
  const shatterRef = useRef<GlassShatterRef>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.replace('/profile');
      } else {
        const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        const isMobile = window.innerWidth <= 768;
        setAppState(prefersReducedMotion || isMobile ? "exploring" : "entry");
      }
    });
  }, [router]);

  const handleShatterReady = () => {
    setAppState("transitioning");
  };

  const handleEntryComplete = () => {
    setAppState("exploring");
  };

  const handleShatterTrigger = () => {
    shatterRef.current?.triggerShatter();
  };

  // Render nothing until client-side state is determined to avoid FOUC
  if (!appState) {
    return <main style={{ minHeight: "100vh", backgroundColor: "#0a0a08" }} />;
  }

  return (
    <main style={{ minHeight: "100vh", backgroundColor: "#0a0a08", color: "#e8e0d0" }}>
      {(appState === "entry" || appState === "transitioning") && (
        <RevolverEntry
          onComplete={handleEntryComplete}
          triggerShatter={handleShatterTrigger}
        />
      )}

      <GlassShatter
        ref={shatterRef}
        onReady={handleShatterReady}
      />

      {appState === "exploring" && (
        <div className="animate-in fade-in duration-1000">
          <ContentTrack />

          {/* ── Manga showcase — added for conversion ───────────── */}
          <section style={{
            backgroundColor: "#0a0a08",
            padding: "120px 40px",
            position: "relative",
            overflow: "hidden",
            borderTop: "1px solid #1a1a16",
          }}>
            {/* Background dot grid */}
            <div style={{
              position: "absolute",
              inset: 0,
              backgroundImage: "radial-gradient(circle, rgba(184,150,12,0.06) 1px, transparent 1px)",
              backgroundSize: "40px 40px",
              pointerEvents: "none",
            }} />

            <div className="manga-showcase-grid" style={{
              maxWidth: "1100px",
              margin: "0 auto",
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "80px",
              alignItems: "center",
              position: "relative",
              zIndex: 1,
            }}>
              {/* Left: manga cover image */}
              <div style={{
                position: "relative",
                clipPath: "polygon(0% 0%, 100% 0%, 97% 100%, 3% 100%)",
                boxShadow: "0 0 60px rgba(184,150,12,0.12)",
              }}>
                <img
                  src="/manga-sample.jpg"
                  alt="ARXEVO — collector's edition manga cover"
                  style={{
                    width: "100%",
                    display: "block",
                    filter: "contrast(1.05) saturate(1.02)",
                  }}
                />
                {/* Bottom label overlay */}
                <div style={{
                  position: "absolute",
                  bottom: "16px",
                  left: "20px",
                  fontFamily: "'DM Mono', monospace",
                  fontSize: "8px",
                  letterSpacing: "0.18em",
                  color: "rgba(232,224,208,0.5)",
                  textTransform: "uppercase",
                }}>
                  ARXEVO — CHAPTER 01 — REAL OUTPUT
                </div>
              </div>

              {/* Right: editorial copy */}
              <div>
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  marginBottom: "24px",
                }}>
                  <div style={{ width: "20px", height: "1px", background: "#b8960c" }} />
                  <span style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: "9px",
                    letterSpacing: "0.25em",
                    color: "#b8960c",
                    textTransform: "uppercase",
                  }}>
                    CHAPTER 01
                  </span>
                </div>

                <h2 style={{
                  fontFamily: "var(--font-cormorant)",
                  fontWeight: 300,
                  fontStyle: "italic",
                  fontSize: "clamp(40px, 5vw, 72px)",
                  color: "#e8e0d0",
                  lineHeight: 0.95,
                  letterSpacing: "-0.02em",
                  marginBottom: "24px",
                }}>
                  Your essay.<br />
                  Your cover.<br />
                  <span style={{ color: "#b8960c" }}>Your legend.</span>
                </h2>

                <p style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: "12px",
                  color: "#8a7e6e",
                  lineHeight: 1.8,
                  letterSpacing: "0.04em",
                  marginBottom: "40px",
                  maxWidth: "380px",
                }}>
                  Every arc gets a collector's edition manga cover. Real output. Real you. Generated from what you actually wrote.
                </p>

                {/* Stat row */}
                <div style={{
                  display: "flex",
                  gap: "40px",
                  marginBottom: "40px",
                  paddingBottom: "32px",
                  borderBottom: "1px solid #1a1a16",
                }}>
                  {[
                    { value: "15s", label: "Generation time" },
                    { value: "VOL.01", label: "Your issue" },
                    { value: "Free", label: "Always" },
                  ].map(({ value, label }) => (
                    <div key={label}>
                      <div style={{
                        fontFamily: "var(--font-cormorant)",
                        fontWeight: 600,
                        fontSize: "28px",
                        color: "#e8e0d0",
                        letterSpacing: "0.02em",
                      }}>
                        {value}
                      </div>
                      <div style={{
                        fontFamily: "'DM Mono', monospace",
                        fontSize: "8px",
                        color: "#4a4438",
                        letterSpacing: "0.12em",
                        textTransform: "uppercase",
                        marginTop: "4px",
                      }}>
                        {label}
                      </div>
                    </div>
                  ))}
                </div>

                {/* CTA */}
                <a
                  href="/onboard"
                  style={{
                    display: "inline-block",
                    fontFamily: "'DM Mono', monospace",
                    fontSize: "10px",
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                    color: "#0a0a08",
                    background: "#b8960c",
                    padding: "16px 36px",
                    textDecoration: "none",
                    transition: "opacity 0.2s ease",
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = "0.88"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}
                >
                  Submit your essay →
                </a>
              </div>
            </div>

            {/* Mobile responsive */}
            <style dangerouslySetInnerHTML={{ __html: `
              @media (max-width: 768px) {
                .manga-showcase-grid {
                  grid-template-columns: 1fr !important;
                  gap: 40px !important;
                  padding: 80px 20px !important;
                }
              }
            `}} />
          </section>

          <VaultNav />
          <Footer />
        </div>
      )}
    </main>
  );
}
