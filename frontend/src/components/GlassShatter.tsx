"use client";

import { useEffect, useRef, useImperativeHandle, forwardRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

export interface GlassShatterRef {
  triggerShatter: () => void;
}

interface Shard {
  points: { x: number; y: number }[];
  center: { x: number; y: number };
  targetX: number;
  targetY: number;
  targetRotation: number;
  currentX: number;
  currentY: number;
  currentRotation: number;
  opacity: number;
  gradientAngle: number;
}

const GlassShatter = forwardRef<GlassShatterRef, { onReady?: () => void }>(({ onReady }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const shardsRef = useRef<Shard[]>([]);
  const isShattered = useRef(false);
  const animationRef = useRef<number>(0);
  const stRef = useRef<ScrollTrigger | null>(null);

  useImperativeHandle(ref, () => ({
    triggerShatter: () => {
      if (isShattered.current) return;
      isShattered.current = true;

      const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (prefersReducedMotion) {
        if (onReady) onReady();
        return;
      }

      shardsRef.current.forEach((shard) => {
        gsap.to(shard, {
          currentX: shard.targetX,
          currentY: shard.targetY,
          currentRotation: shard.targetRotation,
          opacity: 1,
          duration: 0.8 + Math.random() * 0.6,
          delay: Math.random() * 0.1,
          ease: "power2.out",
        });
      });

      setTimeout(() => {
        if (onReady) onReady();
        setupScrollAssembly();
      }, 1000);
    },
  }));

  const setupScrollAssembly = () => {
    stRef.current = ScrollTrigger.create({
      trigger: "body",
      start: "top top",
      end: "+=100%",
      scrub: 1,
      onUpdate: (self) => {
        const p = self.progress;
        shardsRef.current.forEach((shard) => {
          shard.currentX = shard.targetX * (1 - p);
          shard.currentY = shard.targetY * (1 - p);
          shard.currentRotation = shard.targetRotation * (1 - p);
          shard.opacity = 1 - p;
        });
      },
    });
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = window.innerWidth;
    let h = window.innerHeight;
    canvas.width = w;
    canvas.height = h;

    const impactX = w * 0.82;
    const impactY = h * 0.5;

    // 5 rings × 12 slices = 60 shards
    const rings = 5;
    const slices = 12;
    const shards: Shard[] = [];
    const maxRadius = Math.max(w, h);

    for (let r = 0; r < rings; r++) {
      const radiusIn  = (r / rings)       * maxRadius * (0.8 + Math.random() * 0.4);
      const radiusOut = ((r + 1) / rings) * maxRadius * (0.8 + Math.random() * 0.4);

      for (let s = 0; s < slices; s++) {
        const angleStart = (s / slices)       * Math.PI * 2 + (Math.random() * 0.2 - 0.1);
        const angleEnd   = ((s + 1) / slices) * Math.PI * 2 + (Math.random() * 0.2 - 0.1);

        const p1 = { x: impactX + Math.cos(angleStart) * radiusIn,  y: impactY + Math.sin(angleStart) * radiusIn  };
        const p2 = { x: impactX + Math.cos(angleEnd)   * radiusIn,  y: impactY + Math.sin(angleEnd)   * radiusIn  };
        const p3 = { x: impactX + Math.cos(angleEnd)   * radiusOut, y: impactY + Math.sin(angleEnd)   * radiusOut };
        const p4 = { x: impactX + Math.cos(angleStart) * radiusOut, y: impactY + Math.sin(angleStart) * radiusOut };

        const center = {
          x: (p1.x + p2.x + p3.x + p4.x) / 4,
          y: (p1.y + p2.y + p3.y + p4.y) / 4,
        };

        const targetAngle = Math.atan2(center.y - impactY, center.x - impactX) + (Math.random() - 0.5);
        const targetDist  = 80 + Math.random() * 300;

        // FIX: clamp final shard position to viewport with 20px margin
        const rawAbsX    = center.x + Math.cos(targetAngle) * targetDist;
        const rawAbsY    = center.y + Math.sin(targetAngle) * targetDist;
        const clampedAbsX = Math.min(w - 20, Math.max(20, rawAbsX));
        const clampedAbsY = Math.min(h - 20, Math.max(20, rawAbsY));

        shards.push({
          points: [p1, p2, p3, p4],
          center,
          targetX: clampedAbsX - center.x,
          targetY: clampedAbsY - center.y,
          targetRotation: (Math.random() - 0.5) * Math.PI / 2,
          currentX: 0,
          currentY: 0,
          currentRotation: 0,
          opacity: 0,
          // ELEVATE: unique light-catch angle per shard
          gradientAngle: Math.random() * Math.PI * 2,
        });
      }
    }

    shardsRef.current = shards;

    const render = () => {
      ctx.clearRect(0, 0, w, h);

      if (isShattered.current) {
        shardsRef.current.forEach((shard) => {
          if (shard.opacity <= 0.01) return;

          ctx.save();
          ctx.translate(shard.center.x + shard.currentX, shard.center.y + shard.currentY);
          ctx.rotate(shard.currentRotation);
          ctx.translate(-shard.center.x, -shard.center.y);

          ctx.beginPath();
          ctx.moveTo(shard.points[0].x, shard.points[0].y);
          for (let i = 1; i < shard.points.length; i++) {
            ctx.lineTo(shard.points[i].x, shard.points[i].y);
          }
          ctx.closePath();

          // ELEVATE: per-shard linear gradient rotated to unique angle — simulates light catch as shards move
          const ga  = shard.gradientAngle + shard.currentRotation;
          const gl  = 70;
          const gx0 = shard.center.x - Math.cos(ga) * gl;
          const gy0 = shard.center.y - Math.sin(ga) * gl;
          const gx1 = shard.center.x + Math.cos(ga) * gl;
          const gy1 = shard.center.y + Math.sin(ga) * gl;
          const grad = ctx.createLinearGradient(gx0, gy0, gx1, gy1);
          grad.addColorStop(0,   `rgba(255, 248, 235, ${shard.opacity * 0.25})`);
          grad.addColorStop(0.5, `rgba(212, 201, 176, ${shard.opacity * 0.12})`);
          grad.addColorStop(1,   `rgba(140, 130, 110, ${shard.opacity * 0.06})`);

          ctx.fillStyle = grad;
          ctx.fill();
          ctx.strokeStyle = `rgba(212, 201, 176, ${shard.opacity * 0.8})`;
          ctx.lineWidth = 1;
          ctx.stroke();

          ctx.restore();
        });
      }

      animationRef.current = requestAnimationFrame(render);
    };

    render();

    const handleResize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w;
      canvas.height = h;
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animationRef.current);
      window.removeEventListener("resize", handleResize);
      stRef.current?.kill();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-40 pointer-events-none"
    />
  );
});

GlassShatter.displayName = "GlassShatter";
export default GlassShatter;
