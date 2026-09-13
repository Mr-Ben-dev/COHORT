"use client";

import { useReducedMotion } from "framer-motion";
import { CohortLogo } from "@/components/brand/logo";
import { PillButton } from "@/components/brand/pill-button";
import { useCohortStore } from "@/state/cohort-store";

/**
 * Footer — the measured Impilo closer on the bright indigo canvas
 * (--color-deep-iris, NOT the ink footer of the old build):
 *   · the top corners rise over the light section above via two curved
 *     SVG shapes (the impilo "footer curve start" transition), with a
 *     soft gradient seam where the indigo meets the light,
 *   · two iris-shadow crescents rise from the bottom-left/right corners
 *     behind the content (the impilo ripple language),
 *   · film grain over the whole canvas + a veil glow pooling behind
 *     the logo/CTA row,
 *   · white logo + mint EKG accent + tagline left, link columns right
 *     (mint hover with a soft mint text glow), a double-pill "Find a
 *     trial" CTA, and a bottom ©/data/legal bar.
 * Sticky to the viewport bottom via the app shell's flex column
 * (mt-auto), with safe-area padding.
 */

type FooterLink = {
  label: string;
  href?: string;
  onClick?: () => void;
};

/* mint hover glow — rgba(92,255,177,0.45) is --color-mint-vital */
const LINK_CLASSES =
  "rounded text-body-sm text-cloud-white/70 transition-[color,filter] duration-300 outline-none hover:text-mint-vital hover:drop-shadow-[0_0_8px_rgba(92,255,177,0.45)]";

/* caption-size variant for the legal bar (keeps its original scale) */
const LEGAL_CLASSES =
  "rounded text-caption text-cloud-white/65 transition-[color,filter] duration-300 outline-none hover:text-mint-vital hover:drop-shadow-[0_0_8px_rgba(92,255,177,0.45)]";

function FooterLinkList({ links, label }: { links: FooterLink[]; label: string }) {
  return (
    <nav aria-label={label}>
      <h2 className="text-caption font-semibold uppercase tracking-[0.14em] text-cloud-white/60">
        {label}
      </h2>
      <ul className="mt-4 space-y-2.5">
        {links.map((link) =>
          link.href ? (
            <li key={link.label}>
              <a
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className={LINK_CLASSES}
              >
                {link.label} ↗
              </a>
            </li>
          ) : (
            <li key={link.label}>
              <button onClick={link.onClick} className={LINK_CLASSES}>
                {link.label}
              </button>
            </li>
          ),
        )}
      </ul>
    </nav>
  );
}

export function SiteFooter() {
  const navigate = useCohortStore((s) => s.navigate);
  const reduce = useReducedMotion();

  const productLinks: FooterLink[] = [
    { label: "Find trials", onClick: () => navigate({ name: "trials" }) },
    { label: "My profile", onClick: () => navigate({ name: "profile" }) },
    { label: "My proofs", onClick: () => navigate({ name: "proofs" }) },
  ];

  const privacyLinks: FooterLink[] = [
    {
      label: "Privacy explainer",
      onClick: () => navigate({ name: "home" }, { scroll: "#privacy" }),
    },
    {
      label: "The technology",
      onClick: () => navigate({ name: "home" }, { scroll: "#midnight" }),
    },
    {
      label: "What we'll never do",
      onClick: () => navigate({ name: "home" }, { scroll: "#honesty" }),
    },
  ];

  const ecosystemLinks: FooterLink[] = [
    { label: "Midnight", href: "https://midnight.network" },
    { label: "ClinicalTrials.gov", href: "https://clinicaltrials.gov" },
    { label: "Proof ledger view", onClick: () => navigate({ name: "proofs" }) },
  ];

  return (
    <footer className="relative mt-auto w-full bg-deep-iris pb-[env(safe-area-inset-bottom)] text-cloud-white">
      {/* Curved transition — the indigo rises over the light section above
          at the bottom-left/right corners (impilo footer curve start),
          casting a soft ink shadow onto the Pearl canvas so the ears
          read as lifted, not painted on
          (drop-shadow rgba(22,22,88,0.35) = --color-iris-glow ink fill). */}
      <svg
        viewBox="0 0 1440 64"
        preserveAspectRatio="none"
        className="pointer-events-none absolute -top-16 left-0 h-16 w-full drop-shadow-[0_10px_18px_rgba(22,22,88,0.35)]"
        aria-hidden="true"
      >
        <path d="M 0 64 L 0 24 Q 0 4 24 4 Q 104 4 136 64 Z" fill="var(--color-deep-iris)" />
        <path d="M 1440 64 L 1440 24 Q 1440 4 1416 4 Q 1336 4 1304 64 Z" fill="var(--color-deep-iris)" />
      </svg>

      {/* Decorative crescents rising from the bottom corners (iris-shadow,
          behind the content — the impilo ripple language). */}
      <svg
        viewBox="0 0 300 440"
        preserveAspectRatio="xMinYMax meet"
        className="pointer-events-none absolute bottom-0 left-0 h-[300px] w-[205px] sm:h-[380px] sm:w-[260px]"
        aria-hidden="true"
      >
        <path
          d="M -20 440 C 130 350 215 210 225 28 C 185 210 105 350 -50 440 Z"
          fill="var(--color-iris-shadow)"
        />
        <path
          d="M -20 440 C 80 370 150 250 160 110 C 130 255 65 370 -60 440 Z"
          fill="var(--color-iris-shadow)"
          opacity="0.45"
        />
      </svg>
      <svg
        viewBox="0 0 300 440"
        preserveAspectRatio="xMaxYMax meet"
        className="pointer-events-none absolute bottom-0 right-0 h-[300px] w-[205px] sm:h-[380px] sm:w-[260px]"
        aria-hidden="true"
      >
        <path
          d="M 320 440 C 170 350 85 210 75 28 C 115 210 195 350 350 440 Z"
          fill="var(--color-iris-shadow)"
        />
        <path
          d="M 320 440 C 220 370 150 250 140 110 C 170 255 235 370 360 440 Z"
          fill="var(--color-iris-shadow)"
          opacity="0.45"
        />
      </svg>

      {/* Soft gradient seam — a feathered hairline of light where the
          indigo meets the Pearl section (blurred so it reads as mist,
          not a rule). */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-2 bg-gradient-to-b from-transparent via-white/12 to-transparent blur-[2px]"
        aria-hidden="true"
      />

      {/* Atmosphere — film grain + a veil glow pooling behind the
          logo/CTA row (centered, upper area). The blob sits in its own
          inset clipping wrapper so its 560px pool can never push the
          page sideways on narrow viewports (the corner-rise SVG above
          must stay unclipped, so only the blob is wrapped). */}
      <div
        className="bg-noise pointer-events-none absolute inset-0"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden"
        aria-hidden="true"
      >
        <div
          className="glow-blob glow-blob-veil top-6 left-1/2 h-56 w-[560px] -translate-x-1/2 opacity-70"
          aria-hidden="true"
        />
      </div>

      <div className="relative mx-auto max-w-[1200px] px-5 sm:px-8">
        {/* Top area — brand + CTA left, link columns right */}
        <div className="grid gap-12 py-14 sm:py-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
          <div className="flex flex-col items-start">
            <div className="flex items-center gap-4">
              <CohortLogo />
              {/* EKG accent — the impilo heartbeat next to the wordmark */}
              <svg
                viewBox="0 0 96 24"
                className="h-6 w-24 shrink-0"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M 2 12 H 20 L 26 4 L 34 20 L 40 12 H 56 L 62 6 L 68 16 L 72 12 H 94"
                  stroke="var(--color-mint-vital)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={reduce ? undefined : "ecg-dash"}
                />
              </svg>
            </div>
            <p className="mt-5 max-w-xs text-body-sm text-cloud-white/70">
              Privacy-first clinical-trial matching. Prove you qualify,
              keep your record.
            </p>
            <PillButton
              variant="primary"
              size="md"
              className="mt-7"
              onClick={() => navigate({ name: "trials" })}
            >
              Find a trial
            </PillButton>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            <FooterLinkList links={productLinks} label="Product" />
            <FooterLinkList links={privacyLinks} label="Privacy" />
            <FooterLinkList links={ecosystemLinks} label="Ecosystem" />
          </div>
        </div>

        {/* Bottom bar — © line, data-source line, legal links */}
        <div className="flex flex-col gap-2.5 border-t border-white/12 py-6 text-caption text-cloud-white/65 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} COHORT · Privacy-first trial matching</p>
          <p>Trial data · ClinicalTrials.gov · Proofs sealed on Midnight</p>
          <nav aria-label="Legal">
            <ul className="flex gap-5">
              <li>
                <button
                  onClick={() => navigate({ name: "home" }, { scroll: "#privacy" })}
                  className={LEGAL_CLASSES}
                >
                  Privacy
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigate({ name: "home" }, { scroll: "#honesty" })}
                  className={LEGAL_CLASSES}
                >
                  Terms
                </button>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </footer>
  );
}
