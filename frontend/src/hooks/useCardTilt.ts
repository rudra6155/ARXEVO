"use client";

import { useEffect, RefObject } from "react";

interface TiltOptions {
  maxTilt?: number;
  perspective?: number;
  scale?: number;
  speed?: number;
  disabled?: boolean;
}

export function useCardTilt(
  ref: RefObject<HTMLDivElement | null>,
  glareRef: RefObject<HTMLDivElement | null>,
  options: TiltOptions = {}
) {
  const {
    maxTilt = 12,
    perspective = 1000,
    scale = 1.02,
    disabled = false,
  } = options;

  useEffect(() => {
    const card = ref.current;
    if (!card || disabled) return;

    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (prefersReduced) return;

    let rafId: number;

    const handleMouseMove = (e: MouseEvent) => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const rect = card.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const tiltX = (e.clientX - centerX) / (rect.width / 2);
        const tiltY = (e.clientY - centerY) / (rect.height / 2);

        card.style.transition = "transform 0.1s ease";
        card.style.transform = `perspective(${perspective}px) rotateX(${-tiltY * maxTilt}deg) rotateY(${tiltX * maxTilt}deg) scale3d(${scale}, ${scale}, ${scale})`;

        if (glareRef.current) {
          // map mouse position to glare sweep (0% → 100% across card)
          const glareX = ((tiltX + 1) / 2) * 100;
          const glareY = ((tiltY + 1) / 2) * 100;
          glareRef.current.style.background = `radial-gradient(circle at ${glareX}% ${glareY}%, rgba(255,255,255,0.12) 0%, transparent 60%)`;
          glareRef.current.style.opacity = "1";
        }
      });
    };

    const handleMouseLeave = () => {
      cancelAnimationFrame(rafId);
      card.style.transition = "transform 0.5s ease";
      card.style.transform = `perspective(${perspective}px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`;
      if (glareRef.current) {
        glareRef.current.style.opacity = "0";
      }
    };

    card.addEventListener("mousemove", handleMouseMove);
    card.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      cancelAnimationFrame(rafId);
      card.removeEventListener("mousemove", handleMouseMove);
      card.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [ref, glareRef, maxTilt, perspective, scale, disabled]);
}
