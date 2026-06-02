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
          <VaultNav />
          <Footer />
        </div>
      )}
    </main>
  );
}
