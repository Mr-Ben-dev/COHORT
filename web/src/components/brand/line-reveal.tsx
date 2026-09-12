"use client";

import { useRef, type ReactNode } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * LineReveal — impilo's "line-inner" split-line scroll reveal.
 * Each child (one line of a headline) rises out of a clipping mask
 * with a slight delay cascade as the block scrolls into view.
 * Reduced motion renders the lines statically.
 */
export function LineReveal({
  children,
  className,
  delay = 0,
  step = 0.09,
  as: Tag = "div",
  id,
}: {
  children: ReactNode[];
  className?: string;
  delay?: number;
  step?: number;
  as?: "div" | "h2" | "h3" | "p";
  id?: string;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-12% 0px" });
  const lines = Array.isArray(children) ? children : [children];

  return (
    <Tag ref={ref as never} id={id} className={cn("block", className)}>
      {lines.map((line, i) => (
        <span key={i} className="block overflow-hidden pb-[0.08em] -mb-[0.08em]">
          <motion.span
            className="block will-change-transform"
            initial={reduce ? false : { y: "110%", opacity: 0.4 }}
            animate={
              reduce
                ? undefined
                : inView
                  ? { y: "0%", opacity: 1 }
                  : undefined
            }
            whileInView={reduce ? undefined : { y: "0%", opacity: 1 }}
            viewport={{ once: true, margin: "-12% 0px" }}
            transition={{
              delay: delay + i * step,
              duration: 0.9,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            {line}
          </motion.span>
        </span>
      ))}
    </Tag>
  );
}
