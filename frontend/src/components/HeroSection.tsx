"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import styles from "./HeroSection.module.css";

gsap.registerPlugin(ScrollTrigger);

// ─── Particle network ────────────────────────────────────────
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
}

const PALETTE = ["#3B82F6", "#8B5CF6", "#06B6D4", "#F59E0B"];
const CONNECTION_DIST = 120;
const REPEL_RADIUS = 150;

function initParticles(count: number, w: number, h: number): Particle[] {
  return Array.from({ length: count }, () => ({
    x: Math.random() * w,
    y: Math.random() * h,
    vx: (Math.random() - 0.5) * 0.4,
    vy: (Math.random() - 0.5) * 0.4,
    radius: Math.random() * 1.5 + 1,
    color: PALETTE[Math.floor(Math.random() * PALETTE.length)],
  }));
}

// ─── Marquee content ─────────────────────────────────────────
const MARQUEE_TEXT =
  "ARXEVO — YOUR ARC BEGINS — SUBMIT YOUR ORIGIN — FIND YOUR SQUAD — ";
const MARQUEE_REPEAT = 8;

// ─── Component ───────────────────────────────────────────────
export default function HeroSection() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const line1Ref = useRef<HTMLSpanElement>(null);
  const line2Ref = useRef<HTMLSpanElement>(null);
  const line3Ref = useRef<HTMLSpanElement>(null);
  const tagRef = useRef<HTMLDivElement>(null);
  const subtextRef = useRef<HTMLParagraphElement>(null);
  const buttonsRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLElement>(null);

  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const mousePos = useRef({ x: 0, y: 0 });
  const ringPos = useRef({ x: 0, y: 0 });
  const rafCursor = useRef<number>(0);

  const router = useRouter();
  const [navScrolled, setNavScrolled] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // ── Detect mobile ──────────────────────────────────────────
  useEffect(() => {
    setIsMobile(window.innerWidth <= 768);
  }, []);

  // ── Custom cursor ──────────────────────────────────────────
  useEffect(() => {
    if (isMobile) return;

    const dot = dotRef.current;
    const ring = ringRef.current;
    if (!dot || !ring) return;

    const onMove = (e: MouseEvent) => {
      mousePos.current = { x: e.clientX, y: e.clientY };
      dot.style.transform = `translate(${e.clientX - 5}px, ${e.clientY - 5}px)`;
    };

    const animateRing = () => {
      ringPos.current.x += (mousePos.current.x - ringPos.current.x) * 0.12;
      ringPos.current.y += (mousePos.current.y - ringPos.current.y) * 0.12;
      ring.style.transform = `translate(${ringPos.current.x - 18}px, ${ringPos.current.y - 18}px)`;
      rafCursor.current = requestAnimationFrame(animateRing);
    };

    const onEnterInteractive = () => {
      dot.classList.add(styles.hovering);
      ring.classList.add(styles.hovering);
    };
    const onLeaveInteractive = () => {
      dot.classList.remove(styles.hovering);
      ring.classList.remove(styles.hovering);
    };

    window.addEventListener("mousemove", onMove);
    rafCursor.current = requestAnimationFrame(animateRing);

    const interactives = document.querySelectorAll(
      "a, button, [data-interactive]"
    );
    interactives.forEach((el) => {
      el.addEventListener("mouseenter", onEnterInteractive);
      el.addEventListener("mouseleave", onLeaveInteractive);
    });

    return () => {
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(rafCursor.current);
      interactives.forEach((el) => {
        el.removeEventListener("mouseenter", onEnterInteractive);
        el.removeEventListener("mouseleave", onLeaveInteractive);
      });
    };
  }, [isMobile]);

  // ── Canvas particle network ────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const particleCount = isMobile ? 30 : 80;
    const connectionDist = isMobile ? 80 : CONNECTION_DIST;
    let width = window.innerWidth;
    let height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    let particles = initParticles(particleCount, width, height);
    let mouse = { x: -9999, y: -9999 };
    let animId: number;

    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    const onMouseMove = (e: MouseEvent) => {
      mouse = { x: e.clientX, y: e.clientY };
    };

    const onResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
      particles = initParticles(particleCount, width, height);
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      for (const p of particles) {
        if (!prefersReduced) {
          // repel from cursor
          const dx = p.x - mouse.x;
          const dy = p.y - mouse.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < REPEL_RADIUS) {
            const force = (REPEL_RADIUS - dist) / REPEL_RADIUS;
            p.vx += (dx / dist) * force * 0.4;
            p.vy += (dy / dist) * force * 0.4;
          }
          // dampen velocity
          p.vx *= 0.98;
          p.vy *= 0.98;
          p.x += p.vx;
          p.y += p.vy;
          // wrap
          if (p.x < 0) p.x = width;
          if (p.x > width) p.x = 0;
          if (p.y < 0) p.y = height;
          if (p.y > height) p.y = 0;
        }

        // draw node
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = 0.7;
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      // draw connections
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i];
          const b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < connectionDist) {
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = a.color;
            ctx.globalAlpha = (1 - d / connectionDist) * 0.25;
            ctx.lineWidth = 0.6;
            ctx.stroke();
            ctx.globalAlpha = 1;
          }
        }
      }

      animId = requestAnimationFrame(draw);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("resize", onResize);
    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("resize", onResize);
    };
  }, [isMobile]);

  // ── Nav scroll effect ──────────────────────────────────────
  useEffect(() => {
    const onScroll = () => setNavScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // ── GSAP hero animations + ScrollTrigger ───────────────────
  useEffect(() => {
    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (prefersReduced) return;

    const ctx = gsap.context(() => {
      // Entrance: tag, lines, subtext, buttons stagger in
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

      tl.from(tagRef.current, { y: 20, opacity: 0, duration: 0.8 })
        .from(
          [line1Ref.current, line2Ref.current, line3Ref.current],
          { y: 60, opacity: 0, duration: 1, stagger: 0.15 },
          "-=0.4"
        )
        .from(subtextRef.current, { y: 24, opacity: 0, duration: 0.8 }, "-=0.5")
        .from(buttonsRef.current, { y: 20, opacity: 0, duration: 0.7 }, "-=0.5");

      // ScrollTrigger parallax on hero content block
      if (contentRef.current) {
        gsap.to(contentRef.current, {
          y: -80,
          ease: "none",
          scrollTrigger: {
            trigger: heroRef.current,
            start: "top top",
            end: "bottom top",
            scrub: true,
          },
        });
      }
    });

    // Refresh after fonts
    document.fonts.ready.then(() => ScrollTrigger.refresh());

    return () => ctx.revert();
  }, []);

  const marqueeItems = Array.from({ length: MARQUEE_REPEAT }, (_, i) => (
    <span key={i} className={styles.marqueeItem}>
      {MARQUEE_TEXT}
    </span>
  ));

  return (
    <>
      {/* Custom cursor (desktop only) */}
      {!isMobile && (
        <>
          <div ref={dotRef} className={styles.cursorDot} />
          <div ref={ringRef} className={styles.cursorRing} />
        </>
      )}

      {/* Nav */}
      <nav
        ref={navRef}
        className={`${styles.nav} ${navScrolled ? styles.scrolled : ""}`}
      >
        <a href="#" className={styles.navLogo}>
          ARXEVO
        </a>
        <ul className={styles.navLinks}>
          <li>
            <a href="#archetypes">Archetypes</a>
          </li>
          <li>
            <a href="#missions">Missions</a>
          </li>
          <li>
            <a href="#squads">Squads</a>
          </li>
        </ul>
        <button
          className={styles.navCta}
          data-interactive="true"
          onClick={() => router.push("/onboard")}
        >
          Begin Arc
        </button>
      </nav>

      {/* Hero */}
      <section ref={heroRef} className={styles.hero}>
        <canvas ref={canvasRef} className={styles.canvas} />
        <div className={styles.gridOverlay} />
        <div className={styles.radialGlow} />

        <div ref={contentRef} className={styles.heroContent}>
          <div ref={tagRef} className={styles.systemTag}>
            <span className={styles.blinkDot} />
            [SYSTEM] ARC INITIALIZATION ACTIVE
          </div>

          <h1 className={styles.h1}>
            <span ref={line1Ref} className={styles.h1Line}>
              Your origin
            </span>
            <span ref={line2Ref} className={styles.h1Line}>
              <span className={styles.h1Gradient}>story starts</span>
            </span>
            <span ref={line3Ref} className={styles.h1Line}>
              here.
            </span>
          </h1>

          <p ref={subtextRef} className={styles.subtext}>
            Upload your college essay. Receive your archetype. Join a squad of
            four and take on real-world missions built for your arc.
          </p>

          <div ref={buttonsRef} className={styles.buttonRow}>
            <button
              className={styles.btnPrimary}
              data-interactive="true"
              onClick={() => router.push("/onboard")}
            >
              Submit Your Origin
            </button>
            <button className={styles.btnGhost} data-interactive="true">
              Learn More
            </button>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className={styles.scrollIndicator}>
          <span className={styles.scrollLabel}>Scroll to Awaken</span>
          <div className={styles.scrollLine} />
        </div>
      </section>

      {/* Marquee strip */}
      <div className={styles.marqueeStrip} aria-hidden="true">
        <div className={styles.marqueeTrack}>{marqueeItems}</div>
      </div>
    </>
  );
}
