"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { PillButton } from "@/components/brand/pill-button";
import { Tag } from "@/components/brand/status-pill";
import { PrivacyIndicator } from "@/components/privacy/privacy-indicator";
import { useCohortStore } from "@/state/cohort-store";
import { isProfileReady } from "@/lib/private-match";
import { cn } from "@/lib/utils";

export function ProfileView() {
  const profile = useCohortStore((s) => s.profile);
  const setProfile = useCohortStore((s) => s.setProfile);
  const clearProfile = useCohortStore((s) => s.clearProfile);
  const navigate = useCohortStore((s) => s.navigate);
  const reduce = useReducedMotion();
  const [ageDraft, setAgeDraft] = useState(
    typeof profile.age === "number" ? String(profile.age) : "",
  );

  useEffect(() => {
    setAgeDraft(typeof profile.age === "number" ? String(profile.age) : "");
  }, [profile.age]);

  const ready = isProfileReady(profile);
  const fadeUp = (delay = 0) => ({
    initial: reduce ? false : { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] as const },
  });

  return (
    <section
      className="mx-auto max-w-[720px] px-5 py-12 sm:px-8 sm:py-16"
      aria-labelledby="profile-heading"
    >
      <motion.header {...fadeUp()}>
        <p className="text-caption font-semibold uppercase tracking-[0.16em] text-clinical-cyan">
          Your private profile
        </p>
        <h1
          id="profile-heading"
          className="mt-3 text-[28px] font-semibold text-cloud-white sm:text-heading-sm"
        >
          These facts stay on this device.
        </h1>
        <p className="mt-3 max-w-xl text-body text-pearl/80">
          Use them to find potential matches across trials. They are encrypted
          in this browser origin and are never sent to COHORT servers. Clearing
          site data deletes them.
        </p>
        <div className="mt-4">
          <PrivacyIndicator variant="chip" />
        </div>
      </motion.header>

      <motion.div
        {...fadeUp(0.08)}
        className="mt-8 rounded-card border border-iris-border bg-cloud-white/[0.06] p-6 sm:p-8"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-subheading font-semibold text-cloud-white">
            Supported typed facts
          </h2>
          <Badge
            variant="outline"
            className="border-mint-vital/40 bg-mint-vital/10 text-mint-vital"
          >
            Private
          </Badge>
        </div>
        <p className="mt-2 text-body-sm text-pearl/70">
          The live circuit checks age bounds and mapped condition / medication
          flags. It does not prove EHR authenticity or free-text criteria.
        </p>

        <Separator className="my-6 bg-iris-border/60" />

        <div className="flex flex-col gap-6">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Label htmlFor="profile-age" className="text-body text-cloud-white">
                Age
              </Label>
              <span className="text-caption text-mint-vital/80">stays on this device</span>
            </div>
            <Input
              id="profile-age"
              type="number"
              inputMode="numeric"
              value={ageDraft}
              onChange={(e) => {
                const v = e.target.value;
                setAgeDraft(v);
                const n = Number.parseInt(v, 10);
                setProfile({ age: Number.isNaN(n) ? undefined : n });
              }}
              className="mt-3 h-12 w-32 rounded-field border-iris-border bg-deep-iris/60 text-cloud-white"
            />
          </div>

          <div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-body font-medium text-cloud-white">
                Mapped condition flag
              </p>
              <span className="text-caption text-mint-vital/80">stays on this device</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-3" role="group" aria-label="Mapped condition flag">
              <Toggle
                label="Yes"
                active={profile.hasCondition === true}
                onClick={() => setProfile({ hasCondition: true })}
              />
              <Toggle
                label="No"
                active={profile.hasCondition === false}
                onClick={() => setProfile({ hasCondition: false })}
              />
            </div>
          </div>

          <div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-body font-medium text-cloud-white">
                Excluded medication flag
              </p>
              <span className="text-caption text-mint-vital/80">stays on this device</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-3" role="group" aria-label="Excluded medication flag">
              <Toggle
                label="No"
                active={profile.medication === "no"}
                onClick={() => setProfile({ medication: "no" })}
              />
              <Toggle
                label="Yes"
                active={profile.medication === "yes"}
                onClick={() => setProfile({ medication: "yes" })}
              />
            </div>
          </div>

          <div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-body font-medium text-cloud-white">
                Typed subset only
              </p>
              <span className="text-caption text-mint-vital/80">stays on this device</span>
            </div>
            <p className="mt-2 text-caption text-lilac-mist">
              Confirm you understand free-text study rules are not proven.
            </p>
            <div className="mt-3 flex flex-wrap gap-3" role="group" aria-label="Typed subset acknowledgement">
              <Toggle
                label="Yes"
                active={profile.typedSubsetAck === true}
                onClick={() => setProfile({ typedSubsetAck: true })}
              />
              <Toggle
                label="No"
                active={profile.typedSubsetAck === false}
                onClick={() => setProfile({ typedSubsetAck: false })}
              />
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div {...fadeUp(0.16)} className="mt-8 flex flex-wrap items-center gap-3">
        <PillButton
          size="lg"
          disabled={!ready}
          onClick={() => navigate({ name: "trials" })}
        >
          Find trials for me
        </PillButton>
        <PillButton
          size="lg"
          variant="quiet"
          onClick={() => {
            setAgeDraft("");
            void clearProfile();
          }}
        >
          Clear private profile/data
        </PillButton>
        <Tag tone={ready ? "mint" : "lilac"}>
          {ready ? "Ready for potential matches" : "Add age, condition, and medication"}
        </Tag>
      </motion.div>
      <p className="mt-4 max-w-xl text-caption text-lilac-mist">
        Encrypted with Web Crypto AES-GCM. The key stays on this origin as a
        non-extractable CryptoKey. This is not a wallet seed and not a
        passphrase. Unlock happens when this site loads. Clearing site data
        cannot be undone.
      </p>
    </section>
  );
}

function Toggle({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "min-h-11 rounded-pill px-5 py-2 text-body-sm font-medium transition-colors",
        active
          ? "border-iris-pulse bg-iris-pulse text-cloud-white"
          : "border border-iris-border text-lilac-mist hover:border-lilac-mist/50 hover:text-cloud-white",
      )}
    >
      {label}
    </button>
  );
}
