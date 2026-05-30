"use client";

import { useEffect, useRef } from "react";
import Footer from "@/components/Footer";

interface Section {
  id: string;
  title: string;
  content: string[];
}

const SECTIONS: Section[] = [
  {
    id: "collect",
    title: "What we collect",
    content: [
      "When you create an account, we collect your email address and display name. When you submit an essay for analysis, we process its contents to generate your archetype, trait scores, and origin story.",
      "We store your generated character card data — archetype, secondary archetype, trait scores (eight dimensions, 0–100), origin story text, and key themes. We also store a SHA-256 hash of your submitted essay to detect duplicate submissions.",
      "We collect basic usage data: timestamps of account creation and submissions, the number of analyses you have run, and standard server logs (IP address, browser type, request timestamps). These logs are retained for 90 days and then automatically deleted.",
    ],
  },
  {
    id: "not-collect",
    title: "What we do not collect",
    content: [
      "We do not store your raw essay text. After analysis is complete, the original text is discarded from memory. The cryptographic hash we store cannot be reversed to reconstruct your essay.",
      "We do not collect your location, contacts, browsing history, social media data, or any information from other apps on your device. We do not use cookies for advertising or cross-site tracking. We do not fingerprint your browser.",
    ],
  },
  {
    id: "use",
    title: "How we use your data",
    content: [
      "Your essay text is sent to our AI analysis pipeline to generate your character card. This is the sole purpose for which we process your essay. The text is not used for model training, advertising, or any purpose other than producing your analysis results.",
      "Your character card data is stored so you can access it across sessions. If you choose to share your card, the shared data is what you explicitly select — we do not add hidden metadata or tracking to shared cards.",
      "Usage data helps us maintain service reliability and diagnose technical issues. We do not sell, rent, or share this data with third parties for marketing or advertising purposes.",
    ],
  },
  {
    id: "retention",
    title: "Data retention",
    content: [
      "Your account data and character cards are retained for as long as your account is active. Server logs are automatically deleted after 90 days.",
      "When you delete your account, all associated data — character cards, trait scores, origin stories, essay hashes, and account information — is permanently removed from our production databases within 24 hours. Backup copies are purged within 30 days.",
    ],
  },
  {
    id: "rights",
    title: "Your rights",
    content: [
      "You have the right to access all data we hold about you. You can export your character card data at any time from your profile settings.",
      "You have the right to delete your account and all associated data. This action is irreversible and takes effect within 24 hours.",
      "You have the right to correct inaccurate data. If your character card does not reflect your current self, you can resubmit and generate a new analysis at any time.",
      "If you are located in the European Union, you have additional rights under the GDPR, including the right to data portability and the right to restrict processing. Contact us at privacy@arxevo.app to exercise these rights.",
    ],
  },
  {
    id: "third-party",
    title: "Third-party services",
    content: [
      "We use Supabase for authentication and database storage. Supabase processes your email and account data on our behalf under a data processing agreement.",
      "We use AI language models (currently via Anthropic) to analyze essay text. Your essay is transmitted to this service for processing and is not retained by the service after the API response is returned.",
      "We use Vercel for frontend hosting and Railway for backend hosting. These services process standard HTTP request data (IP addresses, request headers) as part of normal operations.",
      "We do not use analytics platforms, advertising networks, or social media tracking pixels.",
    ],
  },
  {
    id: "changes",
    title: "Changes to this policy",
    content: [
      "If we make material changes to this privacy policy, we will notify you via email at least 30 days before the changes take effect. We will never retroactively weaken privacy protections for data already collected.",
      "If a change would involve storing raw essay text, sharing data with new third parties, or using your data for model training, we will obtain your explicit consent before proceeding. You will have the option to export your data and delete your account before any such change takes effect.",
    ],
  },
  {
    id: "contact",
    title: "Contact",
    content: [
      "For questions about this privacy policy or how we handle your data, contact us at privacy@arxevo.app.",
      "For account-related issues, data export requests, or deletion requests, contact support@arxevo.app.",
      "If any provision of this policy conflicts with applicable law, the applicable law governs.",
    ],
  },
];

export default function PrivacyPage() {
  const progressRef = useRef<HTMLDivElement>(null);

  // Reading progress bar
  useEffect(() => {
    const bar = progressRef.current;
    if (!bar) return;

    const update = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = docHeight > 0 ? Math.min(scrollTop / docHeight, 1) : 0;
      bar.style.width = `${progress * 100}%`;
    };

    window.addEventListener("scroll", update, { passive: true });
    update();
    return () => window.removeEventListener("scroll", update);
  }, []);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        backgroundColor: "#0a0a08",
        color: "#e8e0d0",
      }}
    >
      {/* Reading progress bar */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          height: "1px",
          zIndex: 9999,
          backgroundColor: "#1a1a16",
          pointerEvents: "none",
        }}
      >
        <div
          ref={progressRef}
          style={{
            height: "100%",
            width: "0%",
            backgroundColor: "#b8960c",
            transition: "width 0.1s linear",
          }}
        />
      </div>

      <main
        style={{
          flex: 1,
          maxWidth: "800px",
          margin: "0 auto",
          padding: "120px 24px 80px",
          width: "100%",
        }}
      >
        {/* Header */}
        <div style={{ marginBottom: "80px" }}>
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
            PRIVACY
          </span>
          <h1
            style={{
              fontFamily: "var(--font-cormorant)",
              fontWeight: 400,
              fontStyle: "italic",
              fontSize: "var(--text-hero)",
              color: "var(--cream)",
              lineHeight: 1.1,
              marginBottom: "20px",
            }}
          >
            How we handle your data.
          </h1>
          <p
            style={{
              fontFamily: "var(--font-dm-mono)",
              fontSize: "var(--text-small)",
              color: "#b0a390",
              lineHeight: 1.8,
            }}
          >
            Last updated: May 2026
          </p>
        </div>

        {/* Sections */}
        <div>
          {SECTIONS.map((section, sectionIndex) => (
            <div
              key={section.id}
              style={{
                marginBottom: "64px",
                paddingBottom: sectionIndex < SECTIONS.length - 1 ? "64px" : "0",
                borderBottom:
                  sectionIndex < SECTIONS.length - 1
                    ? "1px solid #1a1a16"
                    : "none",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: "16px",
                  marginBottom: "28px",
                }}
              >
                <span
                  style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: "9px",
                    color: "#4a4438",
                    letterSpacing: "0.1em",
                    flexShrink: 0,
                  }}
                >
                  {String(sectionIndex + 1).padStart(2, "0")}
                </span>
                <h2
                  style={{
                    fontFamily: "var(--font-cormorant)",
                    fontWeight: 500,
                    fontSize: "var(--text-h3)",
                    color: "var(--cream)",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  {section.title}
                </h2>
              </div>

              {section.content.map((paragraph, pIndex) => (
                <p
                  key={pIndex}
                  style={{
                    fontFamily: "var(--font-cormorant)",
                    fontWeight: 400,
                    fontSize: "var(--text-body)",
                    color: "#b0a390",
                    lineHeight: 1.9,
                    marginBottom:
                      pIndex < section.content.length - 1 ? "20px" : "0",
                    maxWidth: "680px",
                  }}
                >
                  {paragraph}
                </p>
              ))}
            </div>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
}
