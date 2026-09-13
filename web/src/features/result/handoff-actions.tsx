"use client";

import { useState } from "react";
import {
  Copy,
  ExternalLink,
  EyeOff,
  Share2,
  type LucideIcon,
} from "lucide-react";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PillButton } from "@/components/brand/pill-button";
import { toast } from "@/hooks/use-toast";
import type { EligibilityCheck, Trial } from "@/domain/types";
import { copyPublicQualification, officialStudyUrl } from "@/lib/public-packet";
import { cn } from "@/lib/utils";

function HandoffCard({
  icon: Icon,
  title,
  body,
  children,
  featured = false,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
  children: React.ReactNode;
  featured?: boolean;
}) {
  return (
    <Card
      className={cn(
        "gap-4 rounded-card border bg-cloud-white/[0.06] py-5 text-cloud-white shadow-none",
        featured
          ? "border-mint-vital/50 ring-1 ring-mint-vital/25"
          : "border-iris-border",
      )}
    >
      <CardHeader className="px-5">
        <div className="flex items-start gap-3">
          <span
            className={cn(
              "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border",
              featured
                ? "border-mint-vital/40 bg-mint-vital/15 text-mint-vital"
                : "border-iris-border bg-cloud-white/[0.06] text-clinical-cyan",
            )}
            aria-hidden="true"
          >
            <Icon className="h-4 w-4" />
          </span>
          <div>
            <CardTitle className="text-body font-semibold text-cloud-white">
              {title}
            </CardTitle>
            <CardDescription className="mt-1.5 text-body-sm leading-relaxed text-pearl/75">
              {body}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardFooter className="px-5">{children}</CardFooter>
    </Card>
  );
}

export function HandoffActions({
  trial,
  check,
  shared,
  onShare,
  onKeepPrivate,
}: {
  trial: Trial;
  check: EligibilityCheck;
  shared: boolean;
  onShare?: () => void;
  onKeepPrivate: () => void;
}) {
  const [busy, setBusy] = useState<"copy" | "contact" | null>(null);

  async function copyPacket(): Promise<boolean> {
    setBusy("copy");
    const ok = await copyPublicQualification(trial, check);
    toast({
      title: ok ? "Public qualification copied" : "Could not copy",
      description: ok
        ? "Trial id, proof, and network only. No health facts."
        : "Copy failed in this browser. Open the official study record instead.",
    });
    setBusy(null);
    return ok;
  }

  async function requestNextStepContact() {
    setBusy("contact");
    await copyPublicQualification(trial, check);
    toast({
      title: "Public packet ready",
      description:
        "Paste it into the official study contacts. COHORT does not message sites.",
    });
    window.open(officialStudyUrl(trial), "_blank", "noopener,noreferrer");
    setBusy(null);
  }

  return (
    <section aria-labelledby="handoff-heading">
      <h2
        id="handoff-heading"
        className="text-subheading font-semibold text-cloud-white"
      >
        What happens next?
      </h2>
      <p className="mt-2 text-body-sm text-pearl/80">
        Qualification is yours. Choose one action. None of these send your
        health record.
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <HandoffCard
          icon={EyeOff}
          title="Keep private"
          body="Stay on this device. Nothing else is posted."
        >
          <PillButton variant="quiet" onClick={onKeepPrivate}>
            Keep private
          </PillButton>
        </HandoffCard>

        <HandoffCard
          icon={Share2}
          title="Share public qualification"
          body="Post a public-safe record (trial, proof, network). Not your facts. There is no live site inbox."
        >
          {shared || !onShare ? (
            <p className="text-caption font-medium text-mint-vital">
              Public qualification posted
            </p>
          ) : (
            <PillButton onClick={onShare}>Share public qualification</PillButton>
          )}
        </HandoffCard>

        <HandoffCard
          featured
          icon={ExternalLink}
          title="Continue to the study"
          body="Open the official ClinicalTrials.gov record. That is the real enrollment next step."
        >
          <PillButton
            onClick={() =>
              window.open(officialStudyUrl(trial), "_blank", "noopener,noreferrer")
            }
          >
            Continue to the study
          </PillButton>
        </HandoffCard>

        <HandoffCard
          icon={Copy}
          title="Request next-step contact"
          body="Copy the public qualification, then open official study contacts. COHORT does not message sites for you."
        >
          <PillButton
            variant="ghost"
            disabled={busy === "contact"}
            onClick={() => void requestNextStepContact()}
          >
            {busy === "contact" ? "Opening study…" : "Copy packet and open study"}
          </PillButton>
        </HandoffCard>
      </div>

      <button
        type="button"
        className="mt-4 text-caption text-lilac-mist underline-offset-4 hover:text-cloud-white hover:underline"
        disabled={busy === "copy"}
        onClick={() => void copyPacket()}
      >
        Copy public qualification only
      </button>
    </section>
  );
}
