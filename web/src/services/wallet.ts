"use client";

import type { WalletProvider, WalletState } from "@/domain/types";
import { humanError } from "@/lib/human-error";

export interface WalletService {
  connect(provider: WalletProvider): Promise<Extract<WalletState, { status: "connected" }>>;
  getConnectedApi(): ConnectedWalletApi | null;
  disconnect(): void;
}

type MidnightInjected = {
  connect?: (networkId: string) => Promise<ConnectedWalletApi>;
  name?: string;
  rdns?: string;
  getProvingProvider?: unknown;
};

export type ConnectedWalletApi = {
  getProvingProvider?: () => unknown;
  getConnectionStatus?: () => Promise<{ networkId?: string } | Record<string, unknown>>;
  hintUsage?: (methods: string[]) => Promise<void>;
  getDustBalance?: () => Promise<{ balance?: bigint } | null>;
};

let connectedApi: ConnectedWalletApi | null = null;

function midnightGlobal(): Record<string, MidnightInjected> | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { midnight?: Record<string, MidnightInjected> };
  return w.midnight && typeof w.midnight === "object" ? w.midnight : null;
}

function pick1Am(): MidnightInjected | null {
  const midnight = midnightGlobal();
  if (!midnight) return null;
  return (
    midnight["1am"] ||
    Object.values(midnight).find((api) => api?.rdns === "com.midnight.1am") ||
    Object.values(midnight).find((api) => typeof api?.connect === "function") ||
    null
  );
}

class OneAmWalletService implements WalletService {
  connect(provider: WalletProvider): Promise<Extract<WalletState, { status: "connected" }>> {
    if (provider === "Lace") {
      return Promise.reject(
        Object.assign(new Error("Lace does not expose getProvingProvider."), {
          code: "WALLET_NO_PROVING",
          publicMessage:
            "Lace cannot generate this proof in-browser. Use 1AM. COHORT will not send your facts to a hosted prover.",
        }),
      );
    }

    const injected = pick1Am();
    if (!injected || typeof injected.connect !== "function") {
      return Promise.reject(
        Object.assign(new Error("No Midnight DApp Connector is injected."), {
          code: "WALLET_UNAVAILABLE",
          publicMessage:
            "No Midnight wallet was found. Install 1AM to continue. COHORT will not create a fake wallet.",
        }),
      );
    }

    // Call connect() in this click, before any await.
    const pending = injected.connect("preprod");
    return pending.then(async (api) => {
      connectedApi = api;
      if (typeof api.getProvingProvider !== "function") {
        connectedApi = null;
        throw Object.assign(new Error("Connected wallet has no getProvingProvider."), {
          code: "WALLET_NO_PROVING",
          publicMessage:
            "This wallet cannot generate the proof in-browser. Use 1AM. COHORT will not send your facts to a hosted prover.",
        });
      }
      if (typeof api.hintUsage === "function") {
        await api.hintUsage([
          "getProvingProvider",
          "getDustBalance",
          "getShieldedAddresses",
          "getUnshieldedAddress",
          "getConfiguration",
          "balanceUnsealedTransaction",
          "submitTransaction",
        ]);
      }
      let dust: Extract<WalletState, { status: "connected" }>["dust"] = "Wallet syncing";
      if (typeof api.getDustBalance === "function") {
        try {
          const bal = await api.getDustBalance();
          if (bal && typeof bal === "object" && bal.balance === 0n) dust = "Needs DUST";
          else if (bal && typeof bal === "object") dust = "Ready";
        } catch {
          dust = "Wallet syncing";
        }
      }
      let networkId = "preprod";
      if (typeof api.getConnectionStatus === "function") {
        try {
          const status = await api.getConnectionStatus();
          if (status && typeof status === "object" && "networkId" in status && status.networkId) {
            networkId = String(status.networkId);
          }
        } catch {
          /* keep preprod pin */
        }
      }
      return {
        status: "connected" as const,
        provider: "1AM" as const,
        label: dust === "Ready" ? "1AM · Ready" : `1AM · ${dust}`,
        dust,
        networkId,
      };
    });
  }

  getConnectedApi() {
    return connectedApi;
  }

  disconnect() {
    connectedApi = null;
  }
}

export const walletService: WalletService = new OneAmWalletService();
export { humanError };
