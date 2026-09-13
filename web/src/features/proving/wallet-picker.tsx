"use client";

import { useEffect, useState } from "react";
import { Wallet } from "lucide-react";
import { PillButton } from "@/components/brand/pill-button";
import { IconNode } from "@/components/brand/icon-node";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { discoverWallets, type DiscoveredWallet } from "@/lib/wallet-discovery";
import type { WalletProvider } from "@/domain/types";
import { useCohortStore } from "@/state/cohort-store";

function WalletGlyph({ wallet }: { wallet: DiscoveredWallet }) {
  if (wallet.iconSrc) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={wallet.iconSrc}
        alt=""
        width={20}
        height={20}
        referrerPolicy="no-referrer"
        className="h-5 w-5 rounded-sm object-contain"
      />
    );
  }
  return <Wallet className="h-5 w-5" aria-hidden="true" />;
}

export function WalletPicker() {
  const connectAndProve = useCohortStore((s) => s.connectAndProve);
  const wallet = useCohortStore((s) => s.wallet);
  const [tiles, setTiles] = useState<DiscoveredWallet[]>([]);

  useEffect(() => {
    let ticks = 0;
    const read = () => {
      setTiles(discoverWallets());
      ticks += 1;
      return ticks >= 25;
    };
    read();
    const id = window.setInterval(() => {
      if (read()) window.clearInterval(id);
    }, 400);
    return () => window.clearInterval(id);
  }, []);

  const oneAm = tiles.find((w) => w.kind === "1AM");
  const lace = tiles.find((w) => w.kind === "Lace");
  const fallback: { id: WalletProvider; title: string; note: string; support: string }[] = [
    {
      id: "1AM",
      title: "1AM",
      note: oneAm ? "Midnight wallet · in-browser proving (gold path)" : "Not injected in this tab",
      support: oneAm?.compatible ? "Ready to connect" : "Install the 1AM extension",
    },
    {
      id: "Lace",
      title: "Lace",
      note: lace
        ? "Can connect on Preprod. This proof path needs in-browser proving."
        : "Not injected in this tab",
      support: lace ? "Connects; proving is limited" : "Install Midnight Lace",
    },
  ];

  return (
    <>
      <h2 className="text-subheading font-semibold text-cloud-white">Connect your wallet</h2>
      <p className="mt-2 text-body-sm text-pearl/70">
        Choose a wallet injected in this browser. 1AM is the gold path for this
        proof. Lace can connect; it cannot currently generate this proof
        in-browser.
      </p>
      <p className="mt-2 text-body-sm text-pearl/70">
        Connect must stay inside this click. 1AM does not open a page popup.
        After 1AM Connect, approve COHORT from the toolbar icon. Lace may open
        an authorization popup.
      </p>
      {wallet.status === "permission-required" ? (
        <p className="mt-2 text-body-sm text-clinical-cyan" role="status">
          Previously selected wallet: {wallet.label}. One click reconnects it.
        </p>
      ) : null}
      {wallet.status === "wrong-network" ? (
        <p className="mt-2 text-body-sm text-pearl" role="status">
          Switch the wallet to Preprod, then reconnect.
        </p>
      ) : null}
      <div className="mt-5 space-y-3">
        {fallback.map((row) => {
          const live = tiles.find((w) => w.kind === row.id);
          return (
            <div
              key={row.id}
              className="flex items-center gap-4 rounded-field border border-iris-border bg-deep-iris/50 p-4"
            >
              <IconNode tone="lilac">
                {live ? <WalletGlyph wallet={live} /> : <Wallet className="h-5 w-5" aria-hidden="true" />}
              </IconNode>
              <div className="min-w-0">
                <p className="text-body font-medium text-cloud-white">{live?.name || row.title}</p>
                <p className="text-caption text-lilac-mist">{row.note}</p>
                <p className="text-caption text-pearl/70">{row.support}</p>
              </div>
              <PillButton
                size="sm"
                className="ml-auto shrink-0"
                disabled={wallet.status === "connected" && wallet.provider === row.id}
                onClick={() => void connectAndProve(row.id)}
              >
                {wallet.status === "connected" && wallet.provider === row.id
                  ? "Connected"
                  : wallet.status === "permission-required" && wallet.provider === row.id
                    ? "Reconnect"
                    : "Connect"}
              </PillButton>
            </div>
          );
        })}
      </div>
      <Collapsible className="mt-4">
        <CollapsibleTrigger className="group flex min-h-11 items-center gap-2 text-caption text-lilac-mist">
          Advanced wallet details
          <ChevronDown className="h-3.5 w-3.5 group-data-[state=open]:rotate-180" aria-hidden="true" />
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2 text-caption text-pearl/70">
          {tiles.length === 0
            ? "No window.midnight connector is injected yet."
            : tiles.map((w) => (
                <p key={w.injectKey}>
                  {w.name}: {w.compatible ? "supported connector" : "unsupported connector"}{" "}
                  {w.canProveInBrowser ? "· in-browser proving" : "· no in-browser proving"}
                </p>
              ))}
        </CollapsibleContent>
      </Collapsible>
    </>
  );
}
