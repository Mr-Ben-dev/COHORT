"use client";

import { PillButton } from "@/components/brand/pill-button";
import { useCohortStore } from "@/state/cohort-store";

/**
 * Proving-screen wallet CTA. The picker lives in the wallet modal, not inline cards.
 */
export function WalletPicker() {
  const openWalletModal = useCohortStore((s) => s.openWalletModal);
  const wallet = useCohortStore((s) => s.wallet);
  const connectAndProve = useCohortStore((s) => s.connectAndProve);

  return (
    <>
      <h2 className="text-subheading font-semibold text-cloud-white">Connect your wallet</h2>
      <p className="mt-2 text-body-sm text-pearl/70">
        1AM is the gold path for this proof. Lace can connect; it cannot currently
        generate this proof in-browser. Connect must stay inside this click. 1AM
        does not open a page popup. After Connect, approve COHORT from the toolbar
        icon. Lace may open an authorization popup.
      </p>
      {wallet.status === "permission-required" && wallet.provider === "Lace" ? (
        <p className="mt-2 text-body-sm text-clinical-cyan" role="status">
          Last connected wallet was Lace. Lace cannot generate this proof
          in-browser. Use 1AM, then approve COHORT from the toolbar icon.
        </p>
      ) : wallet.status === "permission-required" ? (
        <p className="mt-2 text-body-sm text-clinical-cyan" role="status">
          Previously selected wallet: {wallet.label}. Open the wallet list to reconnect.
        </p>
      ) : null}
      {wallet.status === "wrong-network" ? (
        <p className="mt-2 text-body-sm text-pearl" role="status">
          Switch to Preprod, then reconnect. COHORT will not silently change networks.
        </p>
      ) : null}
      <p className="mt-2 text-caption text-lilac-mist">
        Looking for the 1AM extension. If it is injected, it appears in the wallet list.
        If it is not injected, install 1AM and refresh this tab.
      </p>
      <PillButton className="mt-5 w-full" onClick={() => openWalletModal()}>
        Connect wallet
      </PillButton>
      {wallet.status === "permission-required" && wallet.provider === "1AM" ? (
        <PillButton
          className="mt-3 w-full"
          variant="ghost"
          onClick={() => void connectAndProve("1AM")}
        >
          Reconnect 1AM
        </PillButton>
      ) : null}
    </>
  );
}
