"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * ScrambleText — the Impilo headline device.
 *
 * Digits and glyphs flicker through each character slot and resolve
 * left-to-right until the final word locks in. Used once per view on
 * the single most important word.
 */
export function ScrambleText({
  text,
  className,
  speed = 34,
  resolveDelay = 60,
  delay = 0,
}: {
  text: string;
  className?: string;
  /** ms between scramble frames */
  speed?: number;
  /** ms of scramble before each character resolves */
  resolveDelay?: number;
  /** ms before the effect starts */
  delay?: number;
}) {
  const reduce = useReducedMotion();
  const [display, setDisplay] = useState(() =>
    reduce ? text : " ".repeat(text.length),
  );
  const frame = useRef(0);

  useEffect(() => {
    // Reduced-motion users get the final text directly from the state initializer.
    if (reduce) return;
    const glyphs = "0123456789/·•#%&";
    let interval: ReturnType<typeof setInterval> | undefined;
    const start = setTimeout(() => {
      interval = setInterval(() => {
        frame.current += 1;
        // Number of leading characters already resolved
        const resolvedCount = Math.floor(
          (frame.current * speed) / (resolveDelay + speed),
        );
        let next = "";
        for (let i = 0; i < text.length; i++) {
          if (i < resolvedCount || text[i] === " ") {
            next += text[i];
          } else {
            next += glyphs[Math.floor(Math.random() * glyphs.length)];
          }
        }
        setDisplay(next);
        if (resolvedCount >= text.length) {
          setDisplay(text);
          if (interval) clearInterval(interval);
        }
      }, speed);
    }, delay);
    return () => {
      clearTimeout(start);
      if (interval) clearInterval(interval);
    };
  }, [text, speed, resolveDelay, delay, reduce]);

  return (
    <span className={cn("tabular-nums", className)} aria-label={text}>
      <span aria-hidden="true">{display}</span>
    </span>
  );
}
