"use client";

import { forwardRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes, ReactNode } from "react";

/**
 * Pill CTA — the measured Impilo action geometry.
 *
 * The signature "Request Demo" is a DOUBLE PILL: a light-indigo halo
 * wrapper (#5250c5, 8px, full radius, bg transitions .5s) framing an
 * inner cloud-white pill with iris-ink 600 text (17px, -0.5px tracking).
 *
 * primary  → double pill (halo + white core, "Request Demo" moment)
 * ghost    → pearl hairline outline on the indigo canvas
 * light    → indigo fill for inverted Pearl (light) sections
 * outline  → impilo light-section CTA: 1.5px iris-ink border, white bg
 * quiet    → low-emphasis text pill for tertiary links
 */
export type PillVariant =
  | "primary"
  | "ghost"
  | "light"
  | "outline"
  | "quiet";

export interface PillButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: PillVariant;
  size?: "sm" | "md" | "lg";
  iconStart?: ReactNode;
  iconEnd?: ReactNode;
}

const variantClasses: Record<PillVariant, string> = {
  primary:
    "text-iris-ink bg-iris-halo hover:bg-iris-veil active:bg-iris-halo p-[7px] sm:p-2 shadow-cta hover:shadow-cta-hover",
  ghost:
    "bg-cloud-white/5 text-cloud-white border border-pearl/45 hover:border-pearl/80 hover:bg-cloud-white/12 backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]",
  light:
    "bg-gradient-to-b from-iris-pulse to-deep-iris text-cloud-white hover:from-iris-veil hover:to-iris-pulse active:from-iris-pulse active:to-deep-iris shadow-[0_10px_24px_-8px_rgba(35,34,101,0.45),inset_0_1px_0_rgba(255,255,255,0.22)]",
  outline:
    "bg-cloud-white/70 text-iris-ink border-[1.5px] border-iris-ink/80 hover:bg-cloud-white hover:border-iris-ink shadow-[0_10px_24px_-10px_rgba(35,34,101,0.35),inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-sm",
  quiet:
    "bg-transparent text-lilac-mist hover:text-cloud-white hover:bg-cloud-white/5",
};

const sizeClasses = {
  sm: "text-body-sm px-5 py-2.5 gap-1.5",
  md: "text-body px-6 py-3 gap-2",
  lg: "text-body px-8 py-4 gap-2.5",
};

const innerSizeClasses = {
  sm: "text-body-sm px-4 py-2",
  md: "text-body px-[18px] py-[10px]",
  lg: "text-[17px] leading-[1.1] tracking-[-0.015em] px-[30px] py-[13px]",
};

export const PillButton = forwardRef<HTMLButtonElement, PillButtonProps>(
  (
    { variant = "primary", size = "md", iconStart, iconEnd, className, children, ...rest },
    ref,
  ) => {
    const reduceMotion = useReducedMotion();
    const lift = reduceMotion ? undefined : { y: -2 };

    if (variant === "primary") {
      /* Impilo double pill: halo wrapper + 3D white core.
       * The core is a lit cylinder — a top-lit gradient, an inset
       * specular top edge, a deep indigo contact shadow — and the
       * whole pill floats up 2px on hover while its shadow blooms. */
      return (
        <motion.button
          ref={ref}
          whileHover={lift}
          whileTap={reduceMotion ? undefined : { scale: 0.97 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          className={cn(
            "inline-flex select-none rounded-pill transition-colors duration-500 outline-none",
            "disabled:pointer-events-none disabled:opacity-50",
            variantClasses[variant],
            className,
          )}
          {...(rest as React.ComponentProps<typeof motion.button>)}
        >
          <span
            className={cn(
              "inline-flex select-none items-center justify-center gap-2 rounded-pill font-semibold transition-[background,box-shadow] duration-500",
              "bg-gradient-to-b from-cloud-white to-[#eef0ff]",
              "shadow-[inset_0_1px_0_rgba(255,255,255,1),inset_0_-1px_0_rgba(22,22,88,0.10),0_10px_22px_-8px_rgba(22,22,88,0.5)]",
              innerSizeClasses[size],
            )}
          >
            {iconStart}
            {children}
            {iconEnd}
          </span>
        </motion.button>
      );
    }

    return (
      <motion.button
        ref={ref}
        whileHover={lift}
        whileTap={reduceMotion ? undefined : { scale: 0.97 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        className={cn(
          "inline-flex select-none items-center justify-center rounded-pill font-semibold",
          "min-h-11 transition-colors duration-500 outline-none",
          "disabled:pointer-events-none disabled:opacity-50",
          variantClasses[variant],
          sizeClasses[size],
          className,
        )}
        {...(rest as React.ComponentProps<typeof motion.button>)}
      >
        {iconStart}
        {children}
        {iconEnd}
      </motion.button>
    );
  },
);
PillButton.displayName = "PillButton";
