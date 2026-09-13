"use client";

import { HeroSection } from "./hero-section";
import { ProblemSection } from "./problem-section";
import { HowItWorksSection } from "./how-it-works-section";
import {
  PrivacyExplainerSection,
  WhiteGloveSection,
} from "./privacy-explainer-section";
import { TrustedBySection } from "./audiences-section";
import { MidnightSection } from "./midnight-section";
import { HonestySection } from "./honesty-section";
import { ProductLadderSection } from "./product-ladder-section";
import { FinalCtaSection } from "./final-cta-section";

/**
 * Landing narrative — the measured Impilo page rhythm (top → bottom):
 *   dark hero → compact product story (problem → match → proof → next) →
 *   navy steps 01–04 → dark privacy boundary (veiled) →
 *   light white-glove privacy badges → navy trusted-by (public data) →
 *   light integrations (isometric cards) → light honesty rows →
 *   light final CTA → indigo footer with curved corner transition
 *   (rendered by the app shell).
 *
 * The old Midnight + Audiences sections merged into the single
 * integrations section (MidnightSection); AudiencesSection became
 * TrustedBySection.
 */
export function LandingPage() {
  return (
    <div className="bg-deep-iris">
      <HeroSection />
      <ProblemSection />
      <HowItWorksSection />
      <PrivacyExplainerSection />
      <WhiteGloveSection />
      <TrustedBySection />
      <MidnightSection />
      <HonestySection />
      <ProductLadderSection />
      <FinalCtaSection />
    </div>
  );
}
