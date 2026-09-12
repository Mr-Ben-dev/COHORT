"use client";

import { useEffect, type ReactNode } from "react";
import Lenis from "lenis";

/**
 * SmoothScroll — Lenis momentum scrolling, the free equivalent of the
 * GSAP ScrollSmoother pass impilo.health runs on every page.
 * Disabled entirely under prefers-reduced-motion; native anchors and
 * keyboard scrolling keep working (Lenis syncs them).
 */
export function SmoothScroll({ children }: { children: ReactNode }) {
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;

    const lenis = new Lenis({
      duration: 1.05,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      touchMultiplier: 1.6,
    });

    let raf = 0;
    const loop = (time: number) => {
      lenis.raf(time);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      lenis.destroy();
    };
  }, []);

  return <>{children}</>;
}
