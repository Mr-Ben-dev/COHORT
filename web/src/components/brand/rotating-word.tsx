"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * RotatingWord — the measured Impilo hero carousel.
 *
 * "manageable." / "personalized." flip on a horizontal axis (rotationX
 * 0 → -90 → 90 → 0, GSAP-style) every cycle. The word renders LARGER
 * than the headline itself (impilo: 124px vs 92px) in hero-word cyan,
 * inside a dashed highlight box that draws itself in.
 */
export interface RotatingWordProps {
  words: string[];
  interval?: number;
  className?: string;
  label?: string;
}

export function RotatingWord({
  words,
  interval = 2600,
  className,
  label,
}: RotatingWordProps) {
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (reduce || words.length <= 1) return;
    timer.current = setInterval(() => {
      setIndex((i) => (i + 1) % words.length);
    }, interval);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [reduce, words.length, interval]);

  const word = words[index] ?? words[0] ?? "";
  const longest = words.reduce(
    (best, next) => (next.length > best.length ? next : best),
    words[0] ?? "",
  );

  return (
    <span
      className={cn("word-flip relative inline-grid", className)}
      aria-label={label ?? words.join(", ")}
    >
      <span
        className="invisible col-start-1 row-start-1 whitespace-nowrap"
        aria-hidden="true"
      >
        {longest}
      </span>
      {reduce ? (
        <span className="col-start-1 row-start-1" aria-hidden="false">
          {word}
        </span>
      ) : (
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={index}
            className="col-start-1 row-start-1 inline-block"
            initial={{ rotateX: 90, y: "0.12em", opacity: 0 }}
            animate={{ rotateX: 0, y: 0, opacity: 1 }}
            exit={{ rotateX: -90, y: "-0.12em", opacity: 0 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            aria-hidden="true"
          >
            {word}
          </motion.span>
        </AnimatePresence>
      )}
      <span className="sr-only">{word}</span>
    </span>
  );
}
