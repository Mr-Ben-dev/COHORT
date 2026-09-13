"use client";

import { useEffect, useMemo, useState } from "react";
import { Wallet } from "lucide-react";
import { motion } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PillButton } from "@/components/brand/pill-button";
import { IconNode } from "@/components/brand/icon-node";
import { discoverWallets, type DiscoveredWallet } from "@/lib/wallet-discovery";
import type { WalletProvider } from "@/domain/types";
import { useCohortStore } from "@/state/cohort-store";
import { cn } from "@/lib/utils";

function WalletGlyph({ wallet }: { wallet: DiscoveredWallet | null }) {
  if (wallet?.iconSrc) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={wallet.iconSrc}
        alt=""
        width={28}
        height={28}
        referrerPolicy="no-referrer"
        className="h-7 w-7 rounded-md object-contain"
      />
    );
  }
  return <Wallet className="h-5 w-5" aria-hidden="true" />;
}

type WalletCard = {
  id: WalletProvider;
  title: string;
  live: DiscoveredWallet | undefined;
  extra?: boolean;
};

export function WalletModal() {
  const open = useCohortStore((s) => s.walletModalOpen);
  const closeWalletModal = useCohortStore((s) => s.closeWalletModal);
  const connectWallet = useCohortStore((s) => s.connectWallet);
  const connectAndProve = useCohortStore((s) => s.connectAndProve);
  const proving = useCohortStore((s) => s.activeProving);
  const wallet = useCohortStore((s) => s.wallet);
  const [tiles, setTiles] = useState<DiscoveredWallet[]>([]);

  useEffect(() => {
    if (!open) return;
    let ticks = 0;
    const read = () => {
      setTiles(discoverWallets());
      ticks += 1;
      return ticks >= 20;
    };
    read();
    const id = window.setInterval(() => {
      if (read()) window.clearInterval(id);
    }, 400);
    return () => window.clearInterval(id);
  }, [open]);

  const cards: WalletCard[] = useMemo(() => {
    const oneAm = tiles.find((w) => w.kind === "1AM");
    const lace = tiles.find((w) => w.kind === "Lace");
    const known: WalletCard[] = [
      { id: "1AM", title: "1AM", live: oneAm },
      { id: "Lace", title: "Lace", live: lace },
    ];
    const extras = tiles
      .filter((w) => w.kind === "other" && w.compatible)
      .map((w) => ({ id: "Lace" as const, title: w.name, live: w, extra: true }));
    return [...known, ...extras];
  }, [tiles]);

  const preferredRdns = "rdns" in wallet ? wallet.rdns : undefined;
  const connectedProvider = wallet.status === "connected" || wallet.status === "approving" ? wallet.provider : null;

  return (
    <Dialog open={open} onOpenChange={(next) => (!next ? closeWalletModal() : undefined)}>
      <DialogContent className="border-iris-border bg-deep-iris text-cloud-white sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-cloud-white">Connect a wallet</DialogTitle>
          <DialogDescription className="text-pearl/75">
            Choose a Midnight DApp Connector injected in this browser. COHORT
            targets Preprod. 1AM can generate this proof in-browser. Lace can
            connect; proving for this flow is limited.
          </DialogDescription>
        </DialogHeader>
        <p className="text-caption text-lilac-mist">
          Connect stays inside this click. 1AM does not open a page popup —
          approve COHORT from the toolbar icon. Lace may open an authorization
          popup.
        </p>
        <div className="space-y-3">
          {cards.map((row) => {
            const live = row.live;
            const extra = Boolean(row.extra);
            const available = Boolean(live?.compatible) && !extra;
            const isConnected = !extra && connectedProvider === row.id && wallet.status === "connected";
            const isConnecting = !extra && wallet.status === "connecting" && wallet.provider === row.id;
            const wantsReconnect =
              wallet.status === "permission-required" &&
              (wallet.provider === row.id || preferredRdns === live?.rdns);
            const action = isConnected
              ? "Connected"
              : isConnecting
                ? "Connecting"
                : wantsReconnect
                  ? "Reconnect"
                  : "Connect";
            return (
              <motion.div
                key={`${row.id}-${live?.injectKey || row.title}`}
                layout
                className={cn(
                  "flex items-center gap-4 rounded-field border p-4",
                  row.id === "1AM"
                    ? "border-mint-vital/35 bg-mint-vital/8"
                    : "border-iris-border bg-cloud-white/[0.04]",
                )}
              >
                <IconNode tone={row.id === "1AM" ? "mint" : "lilac"}>
                  <WalletGlyph wallet={live || null} />
                </IconNode>
                <div className="min-w-0 flex-1">
                  <p className="text-body font-semibold text-cloud-white">{live?.name || row.title}</p>
                  <p className="text-caption text-lilac-mist">
                    {available ? "Available" : "Unavailable"}
                    {" · "}
                    Preprod
                    {isConnected ? " · Connected" : wantsReconnect ? " · Reconnect" : " · Not connected"}
                  </p>
                  <p className="text-caption text-pearl/70">
                    {extra
                      ? "Compatible connector — not used for this proof path"
                      : row.id === "1AM"
                      ? live
                        ? "In-browser proving (gold path)"
                        : "Not injected in this tab"
                      : live
                        ? isConnected
                          ? "Connected — proof support for this flow is limited in the current Lace environment."
                          : "Can connect on Preprod. Proving for this flow is limited."
                        : "Not injected in this tab"}
                  </p>
                </div>
                <PillButton
                  size="sm"
                  className="shrink-0"
                  disabled={!available || isConnected || isConnecting}
                  onClick={() =>
                    void (proving ? connectAndProve(row.id) : connectWallet(row.id))
                  }
                >
                  {action}
                </PillButton>
              </motion.div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
