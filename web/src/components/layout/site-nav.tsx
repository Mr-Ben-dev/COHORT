"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X, ChevronDown } from "lucide-react";
import { CohortLogo } from "@/components/brand/logo";
import { PillButton } from "@/components/brand/pill-button";
import { WalletBar } from "@/features/wallet/wallet-bar";
import { useCohortStore, type View } from "@/state/cohort-store";
import { cn } from "@/lib/utils";

/**
 * Top-level site navigation — transparent bar over the Deep Iris canvas.
 * The product is deliberately tiny: Home · Find Trials · Profile · My Proofs.
 */

type NavKey = "home" | "trials" | "profile" | "proofs";

function activeKey(view: View): NavKey {
  switch (view.name) {
    case "home":
      return "home";
    case "trials":
    case "trial":
    case "check":
    case "proving":
    case "result":
    case "referral":
    case "verification":
      return "trials";
    case "profile":
      return "profile";
    case "proofs":
      return "proofs";
    default:
      return "home";
  }
}

export function SiteNav() {
  const view = useCohortStore((s) => s.view);
  const navigate = useCohortStore((s) => s.navigate);
  const checks = useCohortStore((s) => s.checks);
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const go = (key: NavKey) => {
    setOpen(false);
    switch (key) {
      case "home":
        navigate({ name: "home" });
        break;
      case "trials":
        navigate({ name: "trials" });
        break;
      case "profile":
        navigate({ name: "profile" });
        break;
      case "proofs":
        navigate({ name: "proofs" });
        break;
    }
  };

  const current = activeKey(view);
  const proofCount = Object.values(checks).filter((c) => c.proof.status === "verified").length;

  const links: { key: NavKey; label: string }[] = [
    { key: "home", label: "Home" },
    { key: "trials", label: "Find Trials" },
    { key: "profile", label: "My Profile" },
    { key: "proofs", label: "My Proofs" },
  ];

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full border-b transition-colors duration-300",
        scrolled
          ? "border-iris-border/40 bg-deep-iris/85 backdrop-blur-xl"
          : "border-transparent bg-transparent",
      )}
    >
      <nav
        className="mx-auto flex h-20 max-w-[1200px] items-center justify-between px-5 sm:px-8"
        aria-label="Main navigation"
      >
        <button
          onClick={() => go("home")}
          className="rounded-node outline-none focus-visible:ring-2 focus-visible:ring-clinical-cyan"
          aria-label="COHORT home"
        >
          <CohortLogo />
        </button>

        {/* Desktop links */}
        <ul className="hidden items-center gap-1 lg:flex">
          {links.map((link) => (
            <li key={link.key}>
              <button
                onClick={() => go(link.key)}
                aria-current={current === link.key ? "page" : undefined}
                className={cn(
                  "relative rounded-pill px-4 py-2 text-body-sm font-medium transition-colors outline-none",
                  "focus-visible:ring-2 focus-visible:ring-clinical-cyan",
                  current === link.key
                    ? "text-cloud-white"
                    : "text-pearl/80 hover:text-cloud-white",
                )}
              >
                {link.label}
                {current === link.key && (
                  <span
                    className="absolute bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-mint-vital"
                    aria-hidden="true"
                  />
                )}
                {link.key === "proofs" && proofCount > 0 && (
                  <span
                    className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-pill bg-clinical-cyan/20 px-1 text-[11px] font-semibold text-clinical-cyan"
                    aria-label={`${proofCount} proofs`}
                  >
                    {proofCount}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>

        <div className="hidden items-center gap-3 lg:flex">
          <WalletBar variant="desktop" />
          <PillButton size="sm" onClick={() => go("trials")}>
            Find a trial
          </PillButton>
        </div>

        {/* Mobile toggle */}
        <div className="flex items-center gap-2 lg:hidden">
          <PillButton size="sm" onClick={() => go("trials")} className="hidden sm:inline-flex">
            Find a trial
          </PillButton>
          <button
            onClick={() => setOpen((o) => !o)}
            className="flex h-11 w-11 items-center justify-center rounded-pill border border-pearl/25 text-cloud-white"
            aria-expanded={open}
            aria-label={open ? "Close menu" : "Open menu"}
          >
            {open ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
          </button>
        </div>
      </nav>

      {/* Mobile panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden border-b border-iris-border/50 bg-deep-iris/95 backdrop-blur-xl lg:hidden"
          >
            <ul className="space-y-1 px-5 py-4">
              {links.map((link) => (
                <li key={link.key}>
                  <button
                    onClick={() => go(link.key)}
                    aria-current={current === link.key ? "page" : undefined}
                    className={cn(
                      "flex w-full items-center justify-between rounded-field px-4 py-3 text-body font-medium outline-none",
                      "focus-visible:ring-2 focus-visible:ring-clinical-cyan",
                      current === link.key
                        ? "text-cloud-white"
                        : "text-pearl/85 hover:bg-cloud-white/5 hover:text-cloud-white",
                    )}
                  >
                    <span className="flex items-center gap-2">
                      {current === link.key && (
                        <span
                          className="h-1.5 w-1.5 rounded-full bg-mint-vital"
                          aria-hidden="true"
                        />
                      )}
                      {link.label}
                      {link.key === "proofs" && proofCount > 0 && (
                        <span
                          className="ml-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-pill bg-clinical-cyan/20 px-1 text-[11px] font-semibold text-clinical-cyan"
                          aria-label={`${proofCount} proofs`}
                        >
                          {proofCount}
                        </span>
                      )}
                    </span>
                    <ChevronDown
                      className="h-4 w-4 -rotate-90 opacity-50"
                      aria-hidden="true"
                    />
                  </button>
                </li>
              ))}
              <WalletBar variant="mobile" />
              <li className="pt-2">
                <PillButton
                  className="w-full"
                  onClick={() => go("trials")}
                >
                  Find a trial
                </PillButton>
              </li>
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
