"use client";

import { Smartphone } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * PrivacyIndicator — the ONE privacy language system for the product.
 *
 * Communicates "PRIVATE ON DEVICE · not sent to COHORT" without scary
 * security iconography. Appears persistently during the private check,
 * proving, and result moments.
 */
export function PrivacyIndicator({
  variant = "chip",
  className,
}: {
  variant?: "chip" | "banner";
  className?: string;
}) {
  const reduceMotion = useReducedMotion();

  if (variant === "banner") {
    return (
      <div
        className={cn(
          "flex items-start gap-3 rounded-field border border-mint-vital/30 bg-mint-vital/10 p-4",
          className,
        )}
        role="note"
        aria-label="Your answers stay on this device"
      >
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-node bg-mint-vital/15">
          <Smartphone className="h-4 w-4 text-mint-vital" aria-hidden="true" />
        </span>
        <div className="text-body-sm">
          <p className="font-semibold text-cloud-white">
            Your answers stay on this device.
          </p>
          <p className="text-lilac-mist">
            COHORT does not receive your medical record — only the verified
            result is ever shared.
          </p>
        </div>
      </div>
    );
  }

  return (
    <motion.span
      initial={reduceMotion ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "inline-flex items-center gap-2 rounded-pill border border-mint-vital/35 bg-mint-vital/10 px-3.5 py-1.5 text-caption font-semibold text-mint-vital",
        className,
      )}
      role="status"
    >
      <span className="pulse-mint h-1.5 w-1.5 rounded-full bg-mint-vital" aria-hidden="true" />
      Private · on this device
    </motion.span>
  );
}
