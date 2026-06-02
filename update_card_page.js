const fs = require('fs');

let content = fs.readFileSync('frontend/src/app/card/page.tsx', 'utf8');

content = content.replace(
  'import Link from "next/link";',
  `import Link from "next/link";\nimport { saveCard, signInWithGoogle, saveToWaitlist } from "@/lib/auth";\nimport { useAuth } from "@/components/AuthProvider";`
);

content = content.replace(
  '  const [waitlistDone, setWaitlistDone] = useState(false);',
  `  const [waitlistDone, setWaitlistDone] = useState(false);\n  const [waitlistPosition, setWaitlistPosition] = useState<number | null>(null);\n\n  // Auth & Save\n  const { user } = useAuth();\n  const [showAuthModal, setShowAuthModal] = useState(false);\n  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");`
);

const saveImageReplacement = `  // ─── Auto-save on OAuth redirect ────────────────────────────────
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
    } catch (err) {
      console.error(err);
      setSaveStatus("idle");
    }
  };

  // ─── Save card as Instagram-ready image ─────────────────────`;
content = content.replace('  // ─── Save card as Instagram-ready image ─────────────────────', saveImageReplacement);

const waitlistSubmitTarget = `  // ─── Waitlist submit ────────────────────────────────────────
  const handleWaitlistSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!waitlistEmail || waitlistSubmitting) return;
    setWaitlistSubmitting(true);

    try {
      await fetch(\`\${API_BASE_URL}/waitlist\`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: waitlistEmail }),
      });
    } catch {
      // Graceful degradation — show success regardless
    }

    setTimeout(() => {
      setWaitlistDone(true);
      setWaitlistSubmitting(false);
    }, 800);
  }, [waitlistEmail, waitlistSubmitting]);`;

const waitlistSubmitReplacement = `  // ─── Waitlist submit ────────────────────────────────────────
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
  }, [waitlistEmail, waitlistSubmitting, profile]);`;
content = content.replace(waitlistSubmitTarget, waitlistSubmitReplacement);

content = content.replace(
  '{ key: "save", label: "SAVE", fn: handleSaveImage },',
  `{ key: "save", label: saveStatus === "saved" ? "ARC SAVED." : saveStatus === "saving" ? "SAVING..." : "SAVE", fn: handleSaveClick },
            { key: "download", label: "DOWNLOAD", fn: handleSaveImage },`
);

content = content.replace(
  '                You are on the list.',
  `                You are #{waitlistPosition || "—"} in the queue.`
);

const modalHtml = `
      {showAuthModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 2000, background: "rgba(10,10,8,0.95)", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
          <div style={{ background: "#111109", border: "1px solid #2a2820", padding: "48px 32px", display: "flex", flexDirection: "column", alignItems: "center", maxWidth: "400px", width: "100%", textAlign: "center" }}>
            <h2 style={{ fontFamily: "var(--font-cormorant)", fontStyle: "italic", fontSize: "28px", color: "var(--cream)", marginBottom: "16px" }}>Save your arc permanently.</h2>
            <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "13px", color: "#8a7e6e", marginBottom: "32px", lineHeight: 1.6 }}>Sign in to keep it. Your card belongs to you.</p>
            <button
              onClick={() => {
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
`;

content = content.replace(
  '<div\n      ref={pageRef}',
  modalHtml + '\n    <div\n      ref={pageRef}'
);

fs.writeFileSync('frontend/src/app/card/page.tsx', content);
