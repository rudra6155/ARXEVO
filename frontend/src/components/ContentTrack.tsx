"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Link from "next/link";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const ARCHETYPES = [
  {
    name: "Architect",
    color: "#3B82F6",
    desc: "Strategy, systems, long-term thinking. Building structures.",
    quote: "You saw the system before anyone else noticed it was broken.",
  },
  {
    name: "Catalyst",
    color: "#8B5CF6",
    desc: "Creativity, disruption, innovation. Questioning norms.",
    quote: "You have never accepted the world as it was handed to you.",
  },
  {
    name: "Anchor",
    color: "#06B6D4",
    desc: "Empathy, community, relationships. Emotional depth.",
    quote: "People tell you things they have never told anyone else.",
  },
  {
    name: "Operator",
    color: "#b8960c",
    desc: "Execution, persistence, problem-solving. Precision.",
    quote: "The distance between your ideas and their execution is very short.",
  },
];

const STEPS = [
  {
    num: "01",
    title: "Submit your origin data",
    text: "Paste your essay, upload a document, or write freely. The minimum is 50 words. The more you give, the more precisely the system sees you. There is no wrong answer.",
  },
  {
    num: "02",
    title: "Analysis begins",
    text: "Your archetype is assigned by three independent AI agents that analyze your text, then reconcile their findings. A supervisor agent checks for contradictions. The result is your character card — permanently yours.",
  },
  {
    num: "03",
    title: "Squad matching",
    text: "Squad matching is coming. Four people with complementary archetypes, matched by city, chemistry, and energy. One Architect. One Catalyst. One Anchor. One Operator. The system will notify you when your squad is ready.",
  },
  {
    num: "04",
    title: "The arc grows",
    text: "Your squad receives missions — daily prompts, bi-weekly video challenges, monthly IRL meetups. The arc grows. So do you.",
  },
];

const PRIVACY_SEALS = [
  "Essay text never stored",
  "SHA-256 hash only",
  "No training data",
  "Full data deletion",
  "Row-level security",
];

export default function ContentTrack() {
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [isDecrypted, setIsDecrypted] = useState(false);
  const panel3Ref = useRef<HTMLDivElement>(null);
  const bloodSplashRef = useRef<SVGCircleElement>(null);
  const bloodTriggeredRef = useRef(false);
  const headline0Ref = useRef<HTMLHeadingElement>(null);
  const headline1Ref = useRef<HTMLHeadingElement>(null);
  const headline2Ref = useRef<HTMLHeadingElement>(null);
  const headline3Ref = useRef<HTMLHeadingElement>(null);
  const headline4Ref = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const container = containerRef.current;
    const track = trackRef.current;

    if (!container || !track) return;

    const ownTriggers: ScrollTrigger[] = [];

    if (!prefersReducedMotion) {
      const totalWidth = track.scrollWidth - window.innerWidth;

      const trackAnim = gsap.to(track, { x: () => -totalWidth, ease: "none" });

      const st = ScrollTrigger.create({
        trigger: container,
        start: "top top",
        end: () => `+=${totalWidth}`,
        pin: true,
        animation: trackAnim,
        scrub: 1,
        invalidateOnRefresh: true,
      });
      ownTriggers.push(st);

      // Blood splash — contained within panel 3 only
      const bloodST = ScrollTrigger.create({
        trigger: panel3Ref.current,
        containerAnimation: trackAnim,
        start: "left center",
        onEnter: () => {
          if (bloodTriggeredRef.current) return;
          bloodTriggeredRef.current = true;

          gsap.to(bloodSplashRef.current, {
            attr: { r: 900 },
            duration: 1.5,
            ease: "power2.inOut",
          });
        },
      });
      ownTriggers.push(bloodST);

      // Word-split headline animation on each panel entry
      const headlineRefs = [headline0Ref, headline1Ref, headline2Ref, headline3Ref, headline4Ref];
      headlineRefs.forEach((hRef) => {
        const el = hRef.current;
        if (!el) return;

        // Split into word spans
        const text = el.textContent ?? "";
        const words = text.split(" ").filter(Boolean);
        el.innerHTML = words
          .map((w) => `<span class="ct-word" style="display:inline-block;overflow:hidden;vertical-align:bottom"><span class="ct-word-inner" style="display:inline-block;transform:translateY(20px);opacity:0">${w}</span></span>`)
          .join(" ");

        const innerSpans = el.querySelectorAll<HTMLElement>(".ct-word-inner");

        const headlineST = ScrollTrigger.create({
          trigger: el,
          containerAnimation: trackAnim,
          start: "left 80%",
          onEnter: () => {
            gsap.to(innerSpans, {
              y: 0,
              opacity: 1,
              duration: 0.5,
              stagger: 0.06,
              ease: "power2.out",
            });
          },
        });
        ownTriggers.push(headlineST);
      });

      document.fonts.ready.then(() => ScrollTrigger.refresh());
    }

    return () => {
      ownTriggers.forEach((t) => t.kill());
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="h-screen w-full overflow-hidden"
      style={{ backgroundColor: "#0a0a08" }}
    >
      <div ref={trackRef} className="flex h-full" style={{ width: "500vw" }}>

        {/* ════════════════════════════════════════════════════════
            PANEL 0 — ORIGIN
            ════════════════════════════════════════════════════════ */}
        <div
          className="h-full w-screen flex items-center relative"
          id="panel-0"
          style={{ backgroundColor: "#0a0a08" }}
        >
          {/* Ghost number */}
          <span
            style={{
              position: "absolute",
              top: "5vh",
              right: "5vw",
              fontFamily: "var(--font-cormorant)",
              fontWeight: 900,
              fontSize: "30vw",
              lineHeight: 1,
              color: "rgba(232, 224, 208, 0.04)",
              userSelect: "none",
              pointerEvents: "none",
            }}
          >
            01
          </span>

          {/* Content container */}
          <div className="relative z-10 px-[8vw] flex flex-col justify-center h-full w-full">
            <h1
              ref={headline0Ref}
              style={{
                fontFamily: "var(--font-cormorant)",
                fontWeight: 600,
                fontSize: "var(--text-h1)",
                color: "#e8e0d0",
                lineHeight: 1.15,
                marginBottom: "40px",
                maxWidth: "60%",
              }}
            >
              You wrote it when no one was watching.
            </h1>
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════
            PANEL 1 — ARCHETYPES
            ════════════════════════════════════════════════════════ */}
        <div
          className="h-full w-screen flex flex-col justify-center relative"
          id="panel-1"
          style={{ backgroundColor: "#0a0a08", padding: "0 6vw" }}
        >
          {/* Ghost number */}
          <span
            style={{
              position: "absolute",
              top: "5vh",
              right: "5vw",
              fontFamily: "'Cormorant Garamond', serif",
              fontWeight: 900,
              fontSize: "30vw",
              lineHeight: 1,
              color: "rgba(232, 224, 208, 0.04)",
              userSelect: "none",
              pointerEvents: "none",
            }}
          >
            02
          </span>
          <div className="flex w-full justify-between items-center mb-12 gap-16 relative z-10 pt-[5vh] px-[4vw]">
            {/* The Award-Winning Interactive Glass Shard */}
            <div className="flex-1 relative" style={{ perspective: "1500px", minHeight: "340px" }}>
              <div 
                className="w-full h-full cursor-pointer absolute inset-0 group"
                style={{ transformStyle: "preserve-3d" }}
                onMouseEnter={() => setIsDecrypted(true)}
                onMouseLeave={() => setIsDecrypted(false)}
                onClick={() => setIsDecrypted(!isDecrypted)}
              >
                {/* THE SHARD (Front) */}
                <div 
                  className="absolute inset-0 transition-all duration-[800ms] ease-[cubic-bezier(0.25,1,0.5,1)]"
                  style={{
                    background: "linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.0) 100%)",
                    backdropFilter: "blur(12px)",
                    WebkitBackdropFilter: "blur(12px)",
                    clipPath: "polygon(20% 0%, 90% 10%, 100% 85%, 15% 100%, 0% 50%)",
                    border: "1px solid rgba(212, 201, 176, 0.4)",
                    boxShadow: "inset 0 0 40px rgba(255,255,255,0.05)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transformOrigin: "center center",
                    transform: isDecrypted ? "rotateY(180deg) scale(1.5) translateZ(100px)" : "rotateY(0deg) scale(1) translateZ(0px)",
                    opacity: isDecrypted ? 0 : 1,
                    pointerEvents: isDecrypted ? "none" : "auto",
                  }}
                >
                  <span style={{ 
                    fontFamily: "var(--font-dm-mono)", 
                    fontSize: "14px", 
                    letterSpacing: "6px", 
                    color: "var(--gold)", 
                    transform: "rotate(-5deg)",
                    textShadow: "0 0 10px rgba(184, 150, 12, 0.8)",
                    padding: "20px"
                  }}>
                    [ HOVER TO DECRYPT ]
                  </span>
                </div>

                {/* THE REVEAL (Back) */}
                <div 
                  className="absolute inset-0 transition-all duration-[800ms] ease-[cubic-bezier(0.25,1,0.5,1)] flex flex-col justify-center"
                  style={{
                    background: "rgba(10, 10, 8, 0.85)",
                    backdropFilter: "blur(24px)",
                    WebkitBackdropFilter: "blur(24px)",
                    borderLeft: "2px solid var(--gold)",
                    padding: "32px",
                    boxShadow: "0 20px 60px rgba(0,0,0,0.8)",
                    transform: isDecrypted ? "scale(1) translateZ(0)" : "scale(0.8) translateZ(-100px)",
                    opacity: isDecrypted ? 1 : 0,
                    pointerEvents: isDecrypted ? "auto" : "none",
                  }}
                >
                  <p style={{ fontFamily: "var(--font-inter)", fontSize: "16px", color: "#e8e0d0", lineHeight: 1.8, marginBottom: "20px" }}>
                    Every college essay, every SOP, every personal statement contains something most social platforms never capture — the unedited version of who you are. ARXEVO reads that document and maps the architecture of your identity. Not what you want to project. What you actually are.
                  </p>
                  <p style={{ fontFamily: "var(--font-inter)", fontSize: "16px", color: "var(--gold)", lineHeight: 1.8, fontWeight: 500, marginBottom: "32px" }}>
                    The result is a character arc — your archetype, your origin story, your trait map — that belongs to no one else. Because no one else wrote what you wrote.
                  </p>
                  <Link 
                    href="/onboard" 
                    style={{ 
                      display: "inline-flex",
                      alignItems: "center",
                      fontFamily: "var(--font-dm-mono)", 
                      fontSize: "13px", 
                      color: "var(--ink)", 
                      background: "var(--gold)",
                      textDecoration: "none", 
                      textTransform: "uppercase", 
                      letterSpacing: "2px", 
                      padding: "12px 24px",
                      alignSelf: "flex-start",
                      transition: "transform 0.3s ease",
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = "translateX(5px)"}
                    onMouseLeave={(e) => e.currentTarget.style.transform = "translateX(0)"}
                  >
                    Submit your origin →
                  </Link>
                </div>
              </div>
            </div>

            {/* Panel 1 Right Text */}
            <div className="flex-1 flex flex-col justify-center">
              <h2
                ref={headline1Ref}
                style={{
                  fontFamily: "var(--font-cormorant)",
                  fontWeight: 600,
                  fontStyle: "italic",
                  fontSize: "clamp(48px, 5vw, 80px)",
                  color: "#e8e0d0",
                  lineHeight: 1.1,
                  marginBottom: "32px",
                }}
              >
                Four archetypes. Infinite variations.
              </h2>
              <p
                style={{
                  fontFamily: "var(--font-cormorant)",
                  fontSize: "clamp(18px, 1.5vw, 24px)",
                  color: "#b0a390",
                  lineHeight: 1.6,
                }}
              >
                Every person who has ever submitted to ARXEVO falls within one of four fundamental
                orientations. But your archetype is not your identity — it is the lens through which you
                engage with the world. Two Catalysts from different continents may share the same
                orientation and have nothing else in common.
              </p>
            </div>
          </div>

          {/* 4-column grid */}
          <div className="relative z-10 flex gap-6 px-4 w-full mx-auto" style={{ maxWidth: "1200px" }}>
            {ARCHETYPES.map((arch, i) => (
              <div
                key={i}
                className="flex flex-col justify-center p-8 group relative overflow-hidden"
                style={{
                  background: "linear-gradient(180deg, rgba(26,26,22,0.6) 0%, rgba(10,10,8,0.9) 100%)",
                  border: "1px solid #2a2820",
                  borderRadius: "8px",
                  minHeight: "360px",
                  flex: 1,
                  transition: "border-color 0.4s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = arch.color; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#2a2820"; }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-dm-mono)",
                    fontSize: "var(--text-small)",
                    color: "#b0a390",
                    letterSpacing: "0.15em",
                    marginBottom: "16px",
                  }}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3
                  style={{
                    fontFamily: "var(--font-cormorant)",
                    fontWeight: 500,
                    fontSize: "var(--text-h2)",
                    color: "var(--cream)",
                    marginBottom: "12px",
                    transition: "color 0.3s",
                  }}
                >
                  {arch.name}
                </h3>
                <p
                  style={{
                    fontFamily: "var(--font-cormorant)",
                    fontWeight: 400,
                    fontStyle: "italic",
                    fontSize: "var(--text-lead)",
                    color: "#b0a390",
                    lineHeight: 1.7,
                    marginBottom: "20px",
                  }}
                >
                  {arch.desc}
                </p>
                <p
                  style={{
                    fontFamily: "var(--font-cormorant)",
                    fontWeight: 400,
                    fontStyle: "italic",
                    fontSize: "var(--text-body)",
                    color: arch.color,
                    lineHeight: 1.6,
                    marginTop: "auto",
                    paddingTop: "16px",
                    opacity: 0.85,
                  }}
                >
                  &ldquo;{arch.quote}&rdquo;
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════
            PANEL 2 — PROTOCOL
            ════════════════════════════════════════════════════════ */}
        <div
          className="h-full w-screen flex flex-col justify-center relative"
          id="panel-2"
          style={{ backgroundColor: "#0a0a08", padding: "0 8vw" }}
        >
          {/* Ghost number */}
          <span
            style={{
              position: "absolute",
              top: "5vh",
              right: "5vw",
              fontFamily: "'Cormorant Garamond', serif",
              fontWeight: 900,
              fontSize: "30vw",
              lineHeight: 1,
              color: "rgba(232, 224, 208, 0.04)",
              userSelect: "none",
              pointerEvents: "none",
            }}
          >
            03
          </span>

          <div className="relative z-10">
            <h2
              ref={headline2Ref}
              style={{
                fontFamily: "var(--font-cormorant)",
                fontWeight: 400,
                fontStyle: "italic",
                fontSize: "var(--text-hero)",
                color: "var(--cream)",
                lineHeight: 1.15,
                marginBottom: "64px",
              }}
            >
              Four steps. One squad.
            </h2>

            <div className="space-y-10" style={{ maxWidth: "640px" }}>
              {STEPS.map((step, i) => (
                <div key={i} className="flex gap-8">
                  <span
                    style={{
                      fontFamily: "var(--font-cormorant)",
                      fontWeight: 600,
                      fontSize: "var(--text-h2)",
                      color: "var(--cream)",
                      lineHeight: 1,
                      flexShrink: 0,
                      width: "56px",
                    }}
                  >
                    {step.num}
                  </span>
                  <div>
                    <h3
                      style={{
                        fontFamily: "var(--font-dm-mono)",
                        fontSize: "var(--text-small)",
                        letterSpacing: "0.15em",
                        color: "var(--cream)",
                        textTransform: "uppercase",
                        marginBottom: "12px",
                      }}
                    >
                      {step.title}
                    </h3>
                    <p
                      style={{
                        fontFamily: "var(--font-cormorant)",
                        fontWeight: 400,
                        fontSize: "var(--text-body)",
                        color: "#b0a390",
                        lineHeight: 1.9,
                      }}
                    >
                      {step.text}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════
            PANEL 3 — PRIVACY (Blood Transition)
            ════════════════════════════════════════════════════════ */}
        <div
          ref={panel3Ref}
          className="h-full w-screen relative flex flex-col items-center justify-center overflow-hidden"
          id="panel-3"
          style={{ backgroundColor: "#0a0a08" }}
        >
          {/* Blood splash — contained within this panel */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
            <circle
              ref={bloodSplashRef}
              cx="50%"
              cy="50%"
              r="0"
              fill="#c41e1e"
              opacity="0.15"
            />
          </svg>

          {/* Ghost number */}
          <span
            style={{
              position: "absolute",
              top: "5vh",
              right: "5vw",
              fontFamily: "'Cormorant Garamond', serif",
              fontWeight: 900,
              fontSize: "30vw",
              lineHeight: 1,
              color: "rgba(196, 30, 30, 0.06)",
              userSelect: "none",
              pointerEvents: "none",
            }}
          >
            04
          </span>

          <div className="relative z-10 px-[8vw]" style={{ maxWidth: "720px" }}>
            <h2
              ref={headline3Ref}
              style={{
                fontFamily: "var(--font-cormorant)",
                fontWeight: 400,
                fontStyle: "italic",
                fontSize: "var(--text-hero)",
                color: "var(--cream)",
                lineHeight: 1.15,
                marginBottom: "48px",
              }}
            >
              Your words are yours. Permanently.
            </h2>

            <p
              style={{
                fontFamily: "var(--font-cormorant)",
                fontWeight: 400,
                fontSize: "var(--text-body)",
                color: "#b0a390",
                lineHeight: 1.9,
                marginBottom: "24px",
              }}
            >
              When you submit your essay to ARXEVO, we analyze it and immediately
              discard the original text. We store only a cryptographic hash — a
              mathematical fingerprint that proves we processed your document,
              without retaining a single word of what you wrote. Your essay never
              touches a database.
            </p>

            <p
              style={{
                fontFamily: "var(--font-cormorant)",
                fontWeight: 400,
                fontSize: "var(--text-body)",
                color: "#b0a390",
                lineHeight: 1.9,
                marginBottom: "24px",
              }}
            >
              Your character card — the archetype, the trait scores, the origin
              story — is generated from your text and stored independently of it.
              We cannot reconstruct what you submitted from what we store. This is
              not a policy choice. It is an architectural one.
            </p>

            <p
              style={{
                fontFamily: "var(--font-cormorant)",
                fontWeight: 400,
                fontSize: "var(--text-body)",
                color: "#b0a390",
                lineHeight: 1.9,
                marginBottom: "48px",
              }}
            >
              We do not sell data. We do not share data with third parties. We do
              not use your submissions to train AI models. ARXEVO&apos;s business model
              is the product — not the data the product generates. These commitments
              are not subject to future revision.
            </p>

            {/* Privacy seals */}
            <div className="flex flex-wrap gap-3">
              {PRIVACY_SEALS.map((seal, i) => (
                <span
                  key={i}
                  style={{
                    fontFamily: "var(--font-dm-mono)",
                    fontSize: "var(--text-label)",
                    letterSpacing: "0.1em",
                    color: "#b0a390",
                    border: "1px solid #2a2820",
                    padding: "8px 16px",
                    textTransform: "uppercase",
                  }}
                >
                  {seal}
                </span>
              ))}
            </div>

            {/* FAQ link */}
            <div style={{ marginTop: "40px" }}>
              <Link
                href="/faq"
                style={{
                  fontFamily: "var(--font-dm-mono)",
                  fontSize: "var(--text-label)",
                  letterSpacing: "0.15em",
                  color: "#b0a390",
                  textDecoration: "none",
                  textTransform: "uppercase",
                  borderBottom: "1px solid #2a2820",
                  paddingBottom: "2px",
                }}
              >
                Read full FAQ →
              </Link>
            </div>
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════
            PANEL 4 — INITIATE
            ════════════════════════════════════════════════════════ */}
        <div
          className="h-full w-screen flex flex-col items-center justify-center relative"
          id="panel-4"
          style={{ backgroundColor: "#0a0a08" }}
        >
          {/* Ghost number */}
          <span
            style={{
              position: "absolute",
              top: "5vh",
              right: "5vw",
              fontFamily: "'Cormorant Garamond', serif",
              fontWeight: 900,
              fontSize: "30vw",
              lineHeight: 1,
              color: "rgba(232, 224, 208, 0.04)",
              userSelect: "none",
              pointerEvents: "none",
            }}
          >
            05
          </span>

          <h2
            ref={headline4Ref}
            style={{
              fontFamily: "var(--font-cormorant)",
              fontWeight: 400,
              fontStyle: "italic",
              fontSize: "var(--text-hero)",
              color: "var(--cream)",
              marginBottom: "24px",
              textAlign: "center",
              maxWidth: "800px",
              lineHeight: 1.1,
            }}
          >
            The system has been waiting for you.
          </h2>

          <p
            style={{
              fontFamily: "var(--font-dm-mono)",
              fontSize: "var(--text-small)",
              letterSpacing: "0.2em",
              color: "#b0a390",
              textTransform: "uppercase",
              marginBottom: "48px",
            }}
          >
            Free. Permanent. Yours.
          </p>

          <Link
            href="/onboard"
            style={{
              fontFamily: "var(--font-dm-mono)",
              fontSize: "var(--text-small)",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "var(--cream)",
              border: "1px solid var(--cream)",
              padding: "16px 48px",
              textDecoration: "none",
              transition: "all 0.3s",
              backgroundColor: "transparent",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#e8e0d0";
              e.currentTarget.style.color = "#0a0a08";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
              e.currentTarget.style.color = "#e8e0d0";
            }}
          >
            INITIATE SEQUENCE
          </Link>
        </div>

      </div>
    </div>
  );
}
