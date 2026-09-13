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
  panel = false,
  id,
  className,
  "aria-labelledby": ariaLabelledBy,
}: {
  children: ReactNode;
  tone?: "dark" | "light" | "ink";
  /**
   * Dark sections only: layer the Impilo hero veil gradient + a soft dot
   * grid over the flat canvas. Content is re-wrapped in a relative div so
   * it always paints above the overlays.
   */
  veil?: boolean;
  /**
   * Render the canvas as an inset rounded slab instead of a full-bleed
   * band. Consecutive slabs read as stacked cards rather than as one
   * continuous scroll of flat colour — the rhythm the landing page was
   * missing.
   */
  panel?: boolean;
  id?: string;
  className?: string;
  /** Forwarded to the <section> (additive fix — callers already passed
   *  this and it was silently dropped; no visual or behavioral change). */
  "aria-labelledby"?: string;
}) {
  const canvas =
    tone === "dark"
      ? "bg-deep-iris text-cloud-white"
      : tone === "ink"
        ? "bg-navy-canvas text-cloud-white"
        : "bg-pearl text-iris-ink";
  const dark = tone !== "light";

  const overlays =
    veil && dark ? (
      <>
        <div
          className="bg-hero-veil pointer-events-none absolute inset-0"
          aria-hidden="true"
        />
        <div
          className="bg-dots pointer-events-none absolute inset-0 opacity-40"
          aria-hidden="true"
        />
      </>
    ) : null;

  if (panel) {
    return (
      <section
        id={id}
        aria-labelledby={ariaLabelledBy}
        className={cn("relative w-full scroll-mt-24 px-3 sm:px-5", className)}
      >
        <div
          className={cn(
            "relative overflow-hidden rounded-[28px] py-16 sm:rounded-[44px] sm:py-20 lg:py-28",
            canvas,
          )}
        >
          {overlays}
          <div className="relative">{children}</div>
        </div>
      </section>
    );
  }

  return (
    <section
      id={id}
      aria-labelledby={ariaLabelledBy}
      className={cn(
        "relative w-full scroll-mt-24 py-16 sm:py-20 lg:py-24",
        canvas,
        className,
      )}
    >
      {overlays ? (
        <>
          {overlays}
          <div className="relative">{children}</div>
        </>
      ) : (
        children
      )}
    </section>
  );
}

/**
 * A section headline at the scale the rest of the page is drawn for:
 * one dominant line, tight leading, negative tracking. `size="hero"`
 * is reserved for the two or three statements that carry the page.
 */
export function SectionHeading({
  children,
  id,
  size = "lg",
  tone = "light",
  className,
}: {
  children: ReactNode;
  id?: string;
  size?: "lg" | "hero";
  tone?: "light" | "ink";
  className?: string;
}) {
  return (
    <h2
      id={id}
      className={cn(
        "font-semibold text-balance",
        size === "hero"
          ? "text-heading sm:text-display"
          : "text-heading sm:text-heading-lg lg:text-heading-xl",
        tone === "ink" ? "text-iris-ink" : "text-cloud-white",
        className,
      )}
    >
      {children}
    </h2>
  );
}

/**
 * Impilo colours the load-bearing verb inside a headline rather than
 * bolding it. Cyan on dark canvases, iris on light ones.
 */
export function Accent({
  children,
  tone = "cyan",
}: {
  children: ReactNode;
  tone?: "cyan" | "mint" | "iris";
}) {
  return (
    <span
      className={
        tone === "mint"
          ? "text-mint-vital"
          : tone === "iris"
            ? "text-iris-halo"
            : "text-clinical-cyan"
      }
    >
      {children}
    </span>
  );
}

/**
 * The illustration stage: a large-radius slab that the line-art fills
 * generously, instead of a small drawing floating in a wide box.
 */
export function ArtStage({
  children,
  tone = "ink",
  className,
}: {
  children: ReactNode;
  tone?: "ink" | "soft";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[24px] border p-5 sm:rounded-[32px] sm:p-7",
        tone === "ink"
          ? "border-lilac-mist/20 bg-navy-canvas shadow-glow-lg"
          : "border-iris-border/50 bg-deep-iris/45",
        className,
      )}
    >
      <div
        className="bg-dots pointer-events-none absolute inset-0 opacity-25"
        aria-hidden="true"
      />
      <div className="relative">{children}</div>
    </div>
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
