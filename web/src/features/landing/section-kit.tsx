"use client";

import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import { IconNode } from "@/components/brand/icon-node";

export { IconNode };

/** Shared landing-page building blocks — one consistent editorial voice. */

export function Eyebrow({
  children,
  tone = "cyan",
  className,
}: {
  children: ReactNode;
  /** "ink" renders indigo ink text for light (Pearl) sections; "dark" is a legacy alias for it. */
  tone?: "cyan" | "ink" | "dark";
  className?: string;
}) {
  return (
    <p
      className={cn(
        "text-caption font-semibold uppercase tracking-[0.22em]",
        tone === "cyan" ? "text-clinical-cyan" : "text-iris-ink",
        className,
      )}
    >
      {children}
    </p>
  );
}

export function SectionShell({
  children,
  tone = "dark",
  veil = false,
  id,
  className,
  "aria-labelledby": ariaLabelledBy,
}: {
  children: ReactNode;
  tone?: "dark" | "light";
  /**
   * Dark sections only: layer the Impilo hero veil gradient + a soft dot
   * grid over the flat canvas. Content is re-wrapped in a relative div so
   * it always paints above the overlays.
   */
  veil?: boolean;
  id?: string;
  className?: string;
  /** Forwarded to the <section> (additive fix — callers already passed
   *  this and it was silently dropped; no visual or behavioral change). */
  "aria-labelledby"?: string;
}) {
  const dark = tone === "dark";
  return (
    <section
      id={id}
      aria-labelledby={ariaLabelledBy}
      className={cn(
        "relative w-full scroll-mt-24 py-16 sm:py-20 lg:py-24",
        dark ? "bg-deep-iris text-cloud-white" : "bg-pearl text-iris-ink",
        className,
      )}
    >
      {veil && dark ? (
        <>
          <div
            className="bg-hero-veil pointer-events-none absolute inset-0"
            aria-hidden="true"
          />
          <div
            className="bg-dots pointer-events-none absolute inset-0 opacity-40"
            aria-hidden="true"
          />
          <div className="relative">{children}</div>
        </>
      ) : (
        children
      )}
    </section>
  );
}

export function SectionContent({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mx-auto max-w-[1200px] px-5 sm:px-8", className)}>
      {children}
    </div>
  );
}
