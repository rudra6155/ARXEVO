"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

export default function SkeletonCursor() {
  const cursorRef       = useRef<HTMLDivElement>(null);
  const dotRef          = useRef<SVGCircleElement>(null);
  const handRef         = useRef<SVGGElement>(null);
  const indexFingerRef  = useRef<SVGPathElement>(null);
  const otherFingersRef = useRef<SVGPathElement[]>([]);
  const isHovering      = useRef(false);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return;

    const cursor = cursorRef.current;
    if (!cursor) return;

    gsap.set(cursor, { xPercent: -50, yPercent: -50 });

    const onMouseMove = (e: MouseEvent) => {
      gsap.to(cursor, {
        x: e.clientX,
        y: e.clientY,
        duration: 0.15,
        ease: "power2.out",
      });
    };

    window.addEventListener("mousemove", onMouseMove);

    // Initial dot → hand morph
    const ctx = gsap.context(() => {
      const tl = gsap.timeline();

      tl.to(dotRef.current, {
        scale: 0,
        opacity: 0,
        duration: 0.3,
        ease: "power2.inOut",
        delay: 0.2,
      })
      .fromTo(handRef.current,
        { scale: 0, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.2, ease: "back.out(1.5)" }
      )
      .fromTo(
        [indexFingerRef.current, ...otherFingersRef.current],
        { strokeDasharray: "100", strokeDashoffset: "100" },
        {
          strokeDashoffset: "0",
          duration: 0.4,
          stagger: 0.1,
          ease: "power2.out",
        },
        "-=0.1"
      );
    });

    const onMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("a") || target.closest("button") || target.closest("[role='button']")) {
        isHovering.current = true;
        gsap.to(indexFingerRef.current, {
          rotation: 15,
          transformOrigin: "bottom center",
          duration: 0.2,
          ease: "power2.out",
        });
      }
    };

    const onMouseOut = () => {
      isHovering.current = false;
      gsap.to(indexFingerRef.current, {
        rotation: 0,
        duration: 0.2,
        ease: "power2.out",
      });
    };

    const onMouseDown = () => {
      const tl = gsap.timeline();
      tl.to(cursor, { scale: 2, duration: 0.2, ease: "power2.out" })
        .to(indexFingerRef.current, { rotation: 40, duration: 0.1, ease: "power1.inOut" }, 0)
        .to(cursor, { x: "-=8", duration: 0.05, yoyo: true, repeat: 3 }, 0.1)
        .to(cursor, { scale: 1, duration: 0.3, ease: "power2.out" }, 0.3)
        .to(indexFingerRef.current, {
          rotation: isHovering.current ? 15 : 0,
          duration: 0.3,
          ease: "power2.out",
        }, 0.3);
    };

    window.addEventListener("mouseover", onMouseOver);
    window.addEventListener("mouseout", onMouseOut);
    window.addEventListener("mousedown", onMouseDown);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseover", onMouseOver);
      window.removeEventListener("mouseout", onMouseOut);
      window.removeEventListener("mousedown", onMouseDown);
      ctx.revert();
    };
  }, []);

  return (
    <div
      ref={cursorRef}
      className="fixed top-0 left-0 flex items-center justify-center mix-blend-difference hidden md:flex"
      style={{
        width: "60px",
        height: "60px",
        pointerEvents: "none",
        zIndex: 99999,
      }}
    >
      <svg viewBox="0 0 60 60" className="w-full h-full overflow-visible">
        {/* Initial dot */}
        <circle ref={dotRef} cx="30" cy="30" r="4" fill="#e8e0d0" />

        {/* Skeleton hand */}
        <g ref={handRef} style={{ opacity: 0 }} stroke="#e8e0d0" strokeWidth="2" strokeLinecap="round" fill="none">
          {/* Palm */}
          <path d="M 20 40 C 20 50, 40 50, 40 40 L 40 30 L 20 30 Z" />
          {/* Index finger — separate for trigger pull */}
          <path ref={indexFingerRef} d="M 24 30 L 24 12 L 28 12 L 28 30" />
          {/* Middle finger */}
          <path ref={(el) => { if (el) otherFingersRef.current[0] = el; }} d="M 30 30 L 30 8 L 34 8 L 34 30" />
          {/* Ring finger */}
          <path ref={(el) => { if (el) otherFingersRef.current[1] = el; }} d="M 36 30 L 36 14 L 39 14 L 39 30" />
          {/* Thumb */}
          <path ref={(el) => { if (el) otherFingersRef.current[2] = el; }} d="M 18 35 L 10 32 L 12 28 L 20 30" />
        </g>
      </svg>
    </div>
  );
}
