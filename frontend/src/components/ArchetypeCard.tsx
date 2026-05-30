"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useCardTilt } from "@/hooks/useCardTilt";
import styles from "./ArchetypeCard.module.css";

gsap.registerPlugin(ScrollTrigger);

// ─── Types ────────────────────────────────────────────────────
interface Trait {
  label: string;
  value: number; // 0-100
}

interface ArchetypeData {
  id: string;
  name: string;
  color: string;
  origin: string;
  traits: Trait[];
  symbol: React.ReactNode;
}

// ─── SVG Symbols ─────────────────────────────────────────────
const ArchitectSymbol = ({ color }: { color: string }) => (
  <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
    <rect
      x="8"
      y="8"
      width="14"
      height="14"
      stroke={color}
      strokeWidth="1.5"
      fill="none"
    />
    <rect
      x="26"
      y="8"
      width="14"
      height="14"
      stroke={color}
      strokeWidth="1.5"
      fill="none"
      opacity="0.5"
    />
    <rect
      x="8"
      y="26"
      width="14"
      height="14"
      stroke={color}
      strokeWidth="1.5"
      fill="none"
      opacity="0.5"
    />
    <rect
      x="26"
      y="26"
      width="14"
      height="14"
      stroke={color}
      strokeWidth="1.5"
      fill={color}
      opacity="0.3"
    />
    <line x1="24" y1="4" x2="24" y2="44" stroke={color} strokeWidth="0.5" opacity="0.3" />
    <line x1="4" y1="24" x2="44" y2="24" stroke={color} strokeWidth="0.5" opacity="0.3" />
  </svg>
);

const CatalystSymbol = ({ color }: { color: string }) => (
  <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
    <polygon
      points="24,6 42,38 6,38"
      stroke={color}
      strokeWidth="1.5"
      fill="none"
    />
    <polygon
      points="24,14 36,36 12,36"
      stroke={color}
      strokeWidth="0.5"
      fill={color}
      opacity="0.15"
    />
    <circle cx="24" cy="24" r="3" fill={color} />
    <line x1="24" y1="6" x2="24" y2="21" stroke={color} strokeWidth="0.8" opacity="0.5" />
  </svg>
);

const AnchorSymbol = ({ color }: { color: string }) => (
  <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
    <circle cx="24" cy="24" r="16" stroke={color} strokeWidth="1.5" fill="none" />
    <circle cx="24" cy="24" r="8" stroke={color} strokeWidth="1" fill="none" opacity="0.5" />
    <circle cx="24" cy="24" r="2.5" fill={color} />
    <line x1="24" y1="8" x2="24" y2="40" stroke={color} strokeWidth="0.8" opacity="0.4" />
    <line x1="8" y1="24" x2="40" y2="24" stroke={color} strokeWidth="0.8" opacity="0.4" />
  </svg>
);

const OperatorSymbol = ({ color }: { color: string }) => (
  <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
    <path
      d="M24 6L40 16V32L24 42L8 32V16L24 6Z"
      stroke={color}
      strokeWidth="1.5"
      fill="none"
    />
    <path
      d="M24 12L36 19V31L24 38L12 31V19L24 12Z"
      stroke={color}
      strokeWidth="0.5"
      fill={color}
      opacity="0.12"
    />
    <path d="M24 18L30 22V30L24 34L18 30V22L24 18Z" fill={color} opacity="0.4" />
  </svg>
);

// ─── Archetype data ───────────────────────────────────────────
const ARCHETYPES: ArchetypeData[] = [
  {
    id: "architect",
    name: "Architect",
    color: "#3B82F6",
    origin:
      "You build the blueprint before the first brick is laid. Systems thinker, pattern reader, foundation layer.",
    traits: [
      { label: "Systems", value: 92 },
      { label: "Vision", value: 85 },
      { label: "Precision", value: 88 },
      { label: "Adaptability", value: 64 },
      { label: "Leadership", value: 77 },
      { label: "Execution", value: 71 },
    ],
    symbol: <ArchitectSymbol color="#3B82F6" />,
  },
  {
    id: "catalyst",
    name: "Catalyst",
    color: "#8B5CF6",
    origin:
      "You are the spark that ignites the room. Ideas flow through you and ripple outward. Change is your native state.",
    traits: [
      { label: "Creativity", value: 95 },
      { label: "Influence", value: 89 },
      { label: "Energy", value: 91 },
      { label: "Focus", value: 58 },
      { label: "Empathy", value: 82 },
      { label: "Risk", value: 87 },
    ],
    symbol: <CatalystSymbol color="#8B5CF6" />,
  },
  {
    id: "anchor",
    name: "Anchor",
    color: "#06B6D4",
    origin:
      "When the storm hits, you are the stillness. Trusted, grounded, the one everyone turns to when it matters.",
    traits: [
      { label: "Stability", value: 94 },
      { label: "Trust", value: 96 },
      { label: "Empathy", value: 88 },
      { label: "Initiative", value: 61 },
      { label: "Endurance", value: 90 },
      { label: "Clarity", value: 79 },
    ],
    symbol: <AnchorSymbol color="#06B6D4" />,
  },
  {
    id: "operator",
    name: "Operator",
    color: "#F59E0B",
    origin:
      "Precision over noise. You execute, you optimize, you deliver. Where others plan, you build the machine.",
    traits: [
      { label: "Execution", value: 97 },
      { label: "Efficiency", value: 93 },
      { label: "Discipline", value: 91 },
      { label: "Flexibility", value: 55 },
      { label: "Resourceful", value: 86 },
      { label: "Speed", value: 88 },
    ],
    symbol: <OperatorSymbol color="#F59E0B" />,
  },
];

// ─── Single Card ──────────────────────────────────────────────
interface CardProps {
  data: ArchetypeData;
  index: number;
}

function SingleCard({ data, index }: CardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const glareRef = useRef<HTMLDivElement>(null);
  const traitsRef = useRef<HTMLDivElement>(null);
  const fillRefs = useRef<(HTMLDivElement | null)[]>([]);

  const isMobile = typeof window !== "undefined" && window.innerWidth <= 768;
  useCardTilt(cardRef, glareRef, { disabled: isMobile });

  // IntersectionObserver for trait bars
  useEffect(() => {
    const fills = fillRefs.current.filter(Boolean) as HTMLDivElement[];
    if (!fills.length) return;

    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          fills.forEach((el) => el.classList.add(styles.animated));
          obs.disconnect();
        }
      },
      { threshold: 0.3 }
    );

    if (traitsRef.current) obs.observe(traitsRef.current);
    return () => obs.disconnect();
  }, []);

  const animDelay = `${index * 0.1}s`;

  return (
    <div
      ref={cardRef}
      className={styles.card}
      style={{
        border: `1px solid ${data.color}4D`,
        animationDelay: animDelay,
      }}
      data-archetype={data.id}
    >
      {/* Holographic glare */}
      <div ref={glareRef} className={styles.glare} />

      {/* Top accent bar */}
      <div
        className={styles.accentBar}
        style={{
          background: `linear-gradient(90deg, ${data.color}, ${data.color}60)`,
          animationDelay: animDelay,
        }}
      />

      {/* Portrait */}
      <div className={styles.portrait}>
        <div
          className={styles.portraitGlow}
          style={{ background: data.color }}
        />
        <div className={styles.symbolWrap}>{data.symbol}</div>
      </div>

      {/* Body */}
      <div className={styles.body}>
        <span className={styles.monoTag}>[SYSTEM] ARCHETYPE</span>

        <div
          className={styles.archetypeName}
          style={{ color: data.color }}
        >
          {data.name}
        </div>

        <p className={styles.originLine}>{data.origin}</p>

        <div
          className={styles.divider}
          style={{ background: `${data.color}33` }}
        />

        {/* Trait bars */}
        <div ref={traitsRef} className={styles.traits}>
          {data.traits.map((trait, i) => (
            <div key={trait.label} className={styles.traitRow}>
              <span className={styles.traitLabel}>{trait.label}</span>
              <div className={styles.traitBarTrack}>
                <div
                  ref={(el) => {
                    fillRefs.current[i] = el;
                  }}
                  className={styles.traitBarFill}
                  style={
                    {
                      background: `linear-gradient(90deg, ${data.color}99, ${data.color})`,
                      "--trait-value": `${trait.value}%`,
                    } as React.CSSProperties
                  }
                />
              </div>
              <span className={styles.traitPct}>{trait.value}%</span>
            </div>
          ))}
        </div>

        {/* Stats row */}
        <div className={styles.statsRow}>
          <div className={styles.statCell}>
            <span className={styles.statKey}>Archetype</span>
            <span className={styles.statVal} style={{ color: data.color, opacity: 1 }}>
              {data.name.slice(0, 3).toUpperCase()}
            </span>
          </div>
          <div className={styles.statCell}>
            <span className={styles.statKey}>Squad</span>
            <span className={styles.statVal}>LOCKED</span>
          </div>
          <div className={styles.statCell}>
            <span className={styles.statKey}>Rank</span>
            <span className={styles.statVal}>PENDING</span>
          </div>
        </div>

        {/* Share */}
        <button
          className={styles.shareBtn}
          style={{ color: data.color, borderColor: `${data.color}66` }}
          data-interactive="true"
        >
          Share Archetype
        </button>
      </div>
    </div>
  );
}

// ─── Section ──────────────────────────────────────────────────
export default function ArchetypeSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLParagraphElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (prefersReduced) return;

    const ctx = gsap.context(() => {
      // Pin the label for 20% of scroll
      if (labelRef.current) {
        ScrollTrigger.create({
          trigger: sectionRef.current,
          start: "top 80%",
          end: "20% 80%",
          pin: labelRef.current,
          pinSpacing: false,
        });
      }

      // Cards stagger in
      if (cardsRef.current) {
        const cards = cardsRef.current.querySelectorAll("[data-archetype]");
        gsap.from(cards, {
          y: 100,
          opacity: 0,
          rotateY: -15,
          stagger: 0.15,
          duration: 1,
          ease: "back.out(1.4)",
          scrollTrigger: {
            trigger: cardsRef.current,
            start: "top 75%",
          },
        });
      }
    }, sectionRef);

    document.fonts.ready.then(() => ScrollTrigger.refresh());
    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className={styles.section} id="archetypes">
      <p ref={labelRef} className={styles.sectionLabel}>
        01 — THE ARCHETYPES
      </p>
      <h2 className={styles.sectionTitle}>
        Know your arc.<br />Find your squad.
      </h2>
      <div ref={cardsRef} className={styles.cardGrid}>
        {ARCHETYPES.map((a, i) => (
          <SingleCard key={a.id} data={a} index={i} />
        ))}
      </div>
    </section>
  );
}
