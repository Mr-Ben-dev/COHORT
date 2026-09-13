"use client";

import type { ReactNode } from "react";
import { PillButton } from "@/components/brand/pill-button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { useCohortStore } from "@/state/cohort-store";
import { cn } from "@/lib/utils";

function ChipButton({
  children,
  className,
  onClick,
  status,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  status?: boolean;
}) {
  return (
    <button
      type="button"
      role={status ? "status" : undefined}
      onClick={onClick}
      className={cn(
        "inline-flex min-h-11 items-center gap-2 rounded-pill border px-4 py-2 text-caption font-semibold outline-none focus-visible:ring-2 focus-visible:ring-clinical-cyan",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function WalletBar({ variant }: { variant: "desktop" | "mobile" }) {
  const wallet = useCohortStore((s) => s.wallet);
  const checks = useCohortStore((s) => s.checks);
  const openWalletModal = useCohortStore((s) => s.openWalletModal);
  const cancelConnect = useCohortStore((s) => s.cancelConnect);
  const disconnectWallet = useCohortStore((s) => s.disconnectWallet);
  const navigate = useCohortStore((s) => s.navigate);
  const proofCount = Object.values(checks).filter((c) => c.proof.status === "verified").length;

  const provider = "provider" in wallet ? wallet.provider : null;
  const wrap = (node: ReactNode) =>
    variant === "mobile" ? <li className="pt-1">{node}</li> : node;

  let control: ReactNode = null;

  if (wallet.status === "connecting" || wallet.status === "reconnecting") {
    control = wrap(
      <ChipButton
        className="border-clinical-cyan/35 bg-clinical-cyan/10 text-clinical-cyan"
        onClick={() => cancelConnect()}
      >
        {wallet.status === "reconnecting" ? "Reconnecting" : `Connecting to ${provider || "wallet"}`}
        {" · Cancel"}
      </ChipButton>,
    );
  } else if (wallet.status === "wrong-network") {
    control = wrap(
      <ChipButton
        className="border-lilac-mist/40 text-pearl"
        onClick={() => openWalletModal()}
      >
        Wrong network
      </ChipButton>,
    );
  } else if (wallet.status === "unavailable") {
    control = wrap(
      <ChipButton className="border-iris-border text-pearl" onClick={() => openWalletModal()}>
        Wallet unavailable
      </ChipButton>,
    );
  } else if (wallet.status === "connected" || wallet.status === "approving") {
    const limited = wallet.status === "connected" && wallet.canProve === false;
    control = wrap(
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="inline-flex min-h-11 items-center gap-2 rounded-pill border border-mint-vital/35 bg-mint-vital/10 px-4 py-2 text-caption font-semibold text-mint-vital outline-none focus-visible:ring-2 focus-visible:ring-clinical-cyan"
            aria-label={`${wallet.provider} ● Connected`}
          >
            <span className="pulse-mint h-1.5 w-1.5 rounded-full bg-mint-vital" aria-hidden="true" />
            {wallet.provider} ● Connected
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          className="w-80 border-iris-border bg-deep-iris p-4 text-cloud-white"
        >
          <p className="text-caption font-semibold uppercase tracking-[0.14em] text-clinical-cyan">
            Wallet
          </p>
          <p className="mt-1 text-body font-semibold">{wallet.provider}</p>
          <p className="mt-3 text-caption text-lilac-mist">Address</p>
          <p className="text-body-sm text-cloud-white">{wallet.status === "connected" ? wallet.address || "Connected" : "Connected"}</p>
          <p className="mt-3 text-caption text-lilac-mist">Network</p>
          <p className="text-body-sm text-cloud-white">Midnight Preprod</p>
          {wallet.status === "connected" && wallet.dust ? (
            <>
              <p className="mt-3 text-caption text-lilac-mist">Balance</p>
              <p className="text-body-sm text-cloud-white">
                {wallet.dust === "Ready" ? "DUST ready" : wallet.dust === "Needs DUST" ? "Needs DUST" : "Wallet syncing"}
              </p>
            </>
          ) : null}
          <p className="mt-3 text-caption text-lilac-mist">Proofs</p>
          <p className="text-body-sm text-cloud-white">{proofCount}</p>
          {limited ? (
            <p className="mt-3 text-caption text-pearl" role="status">
              Connected — proof support for this flow is limited in the current Lace environment.
            </p>
          ) : null}
          <Separator className="my-4 bg-iris-border/70" />
          <div className="flex flex-col gap-2">
            <PillButton size="sm" variant="ghost" onClick={() => navigate({ name: "proofs" })}>
              My Proofs
            </PillButton>
            <PillButton size="sm" variant="ghost" onClick={() => openWalletModal()}>
              Switch wallet
            </PillButton>
            <PillButton size="sm" variant="quiet" onClick={() => disconnectWallet()}>
              Disconnect
            </PillButton>
          </div>
        </PopoverContent>
      </Popover>,
    );
  } else if (wallet.status === "permission-required") {
    control = wrap(
      <ChipButton
        className="border-lilac-mist/35 bg-cloud-white/5 text-lilac-mist"
        onClick={() => openWalletModal()}
      >
        Reconnect {provider || "wallet"}
      </ChipButton>,
    );
  } else {
    control = wrap(
      <ChipButton
        className="border-mint-vital/40 bg-mint-vital/10 text-mint-vital"
        onClick={() => openWalletModal()}
      >
        Connect wallet
      </ChipButton>,
    );
  }

  return <>{control}</>;
}
