"use client";

import type { WalletProvider, WalletState } from "@/domain/types";
import {
  discoverWallets,
  findInjected,
  isOneAmInjected,
  type DiscoveredWallet,
} from "@/lib/wallet-discovery";
import { clearPreferredRdns, readPreferredRdns, writePreferredRdns } from "@/lib/wallet-preference";
import { humanError } from "@/lib/human-error";

export interface WalletService {
  connect(provider: WalletProvider): Promise<Extract<WalletState, { status: "connected" }>>;
  getConnectedApi(): ConnectedWalletApi | null;
  disconnect(): void;
  forgetPreference(): void;
  abandonPendingConnect(): void;
  snapshot(): WalletSnapshot;
}

export type ConnectedWalletApi = {
  getProvingProvider?: () => unknown;
  getConnectionStatus?: () => Promise<{ status?: string; networkId?: string } | Record<string, unknown>>;
  getConfiguration?: () => Promise<{
    indexerUri?: string;
    indexerWsUri?: string;
    proverServerUri?: string;
    nodeUri?: string;
    networkId?: string;
  }>;
  hintUsage?: (methods: string[]) => Promise<void>;
  getDustBalance?: () => Promise<{ balance?: bigint; cap?: bigint } | null>;
  getUnshieldedBalances?: () => Promise<unknown>;
};

export type WalletSnapshot = {
  wallets: DiscoveredWallet[];
  preferredRdns: string | null;
};

let connectedApi: ConnectedWalletApi | null = null;
let connectSeq = 0;

function asProvider(kind: DiscoveredWallet["kind"]): WalletProvider {
  return kind === "Lace" ? "Lace" : "1AM";
}

function isPreprod(networkId: string): boolean {
  const n = networkId.toLowerCase();
  return n === "preprod" || n === "undeployed";
}

export { isOneAmInjected, discoverWallets };

class ConnectorWalletService implements WalletService {
  snapshot(): WalletSnapshot {
    return { wallets: discoverWallets(), preferredRdns: readPreferredRdns() };
  }

  connect(provider: WalletProvider): Promise<Extract<WalletState, { status: "connected" }>> {
    const injected = findInjected(provider);
    if (!injected || typeof injected.connect !== "function") {
      return Promise.reject(
        Object.assign(new Error("No Midnight DApp Connector is injected."), {
          code: "WALLET_UNAVAILABLE",
          publicMessage:
            provider === "Lace"
              ? "Lace is not injected in this tab. Install the Midnight Lace extension from lace.io, then refresh."
              : "No Midnight wallet was found. Install 1AM to continue. COHORT will not create a fake wallet.",
        }),
      );
    }
    if (injected.apiVersion && !String(injected.apiVersion).startsWith("4.")) {
      return Promise.reject(
        Object.assign(new Error("Unsupported wallet API version."), {
          code: "WALLET_UNAVAILABLE",
          publicMessage: "This wallet API version is not supported. COHORT expects DApp Connector 4.x.",
        }),
      );
    }

    const rdns =
      typeof injected.rdns === "string" && injected.rdns
        ? injected.rdns
        : provider === "Lace"
          ? "io.lace.midnight"
          : "com.midnight.1am";

    const seq = ++connectSeq;
    const pending = injected.connect("preprod");
    return pending.then(async (api) => {
      const throwIfStale = () => {
        if (seq !== connectSeq) {
          throw Object.assign(new Error("Wallet connect superseded."), {
            code: "WALLET_SUPERSEDED",
          });
        }
      };
      throwIfStale();
      const nextApi = api as ConnectedWalletApi;
      if (typeof nextApi.hintUsage === "function") {
        await nextApi.hintUsage([
          "getProvingProvider",
          "getDustBalance",
          "getShieldedAddresses",
          "getUnshieldedAddress",
          "getUnshieldedBalances",
          "getConfiguration",
          "getConnectionStatus",
          "balanceUnsealedTransaction",
          "submitTransaction",
        ]);
        throwIfStale();
      }

      let networkId = "preprod";
      let connectionStatus = "connected";
      if (typeof nextApi.getConnectionStatus === "function") {
        const status = await nextApi.getConnectionStatus();
        throwIfStale();
        if (status && typeof status === "object") {
          if ("networkId" in status && status.networkId) networkId = String(status.networkId);
          if ("status" in status && status.status) connectionStatus = String(status.status);
        }
      }
      if (connectionStatus !== "connected") {
        throw Object.assign(new Error("Wallet is not connected."), {
          code: "WALLET_UNAVAILABLE",
          publicMessage: "The wallet did not stay connected. Approve COHORT, then try again.",
        });
      }
      if (typeof nextApi.getConfiguration === "function") {
        try {
          const cfg = await nextApi.getConfiguration();
          throwIfStale();
          if (cfg?.networkId) networkId = String(cfg.networkId);
        } catch (err) {
          if (err && typeof err === "object" && "code" in err && String((err as { code?: string }).code) === "WALLET_SUPERSEDED") {
            throw err;
          }
          /* some wallets expose status but not configuration */
        }
      }
      if (!isPreprod(networkId)) {
        throw Object.assign(new Error("Wrong network."), {
          code: "WALLET_WRONG_NETWORK",
          publicMessage: `This wallet is on ${networkId}, not Preprod. Switch the wallet to Preprod, then reconnect.`,
        });
      }

      const canProve = typeof nextApi.getProvingProvider === "function";
      let dust: Extract<WalletState, { status: "connected" }>["dust"] = "Wallet syncing";
      if (typeof nextApi.getDustBalance === "function") {
        try {
          const bal = await nextApi.getDustBalance();
          throwIfStale();
          if (bal && typeof bal === "object" && bal.balance === 0n) dust = "Needs DUST";
          else if (bal && typeof bal === "object") dust = "Ready";
        } catch (err) {
          if (err && typeof err === "object" && "code" in err && String((err as { code?: string }).code) === "WALLET_SUPERSEDED") {
            throw err;
          }
          dust = "Wallet syncing";
        }
      }

      throwIfStale();
      connectedApi = nextApi;
      writePreferredRdns(rdns);
      const label =
        provider === "Lace"
          ? canProve
            ? `Lace · ${dust}`
            : "Lace connected"
          : dust === "Ready"
            ? "1AM · Ready"
            : `1AM · ${dust}`;

      return {
        status: "connected" as const,
        provider,
        label,
        dust,
        networkId,
        rdns,
        canProve,
      };
    });
  }

  getConnectedApi() {
    return connectedApi;
  }

  disconnect() {
    connectedApi = null;
  }

  abandonPendingConnect() {
    connectSeq += 1;
    connectedApi = null;
  }

  forgetPreference() {
    connectSeq += 1;
    connectedApi = null;
    clearPreferredRdns();
  }
}

export const walletService: WalletService = new ConnectorWalletService();
export { humanError };

export async function pollConnectionOrNull(): Promise<"connected" | "disconnected" | "wrong-network"> {
  const api = connectedApi;
  if (!api || typeof api.getConnectionStatus !== "function") {
    return connectedApi ? "connected" : "disconnected";
  }
  try {
    const status = await api.getConnectionStatus();
    const st = status && typeof status === "object" && "status" in status ? String(status.status) : "";
    const networkId =
      status && typeof status === "object" && "networkId" in status ? String(status.networkId || "") : "";
    if (st && st !== "connected") return "disconnected";
    if (networkId && !isPreprod(networkId)) return "wrong-network";
    return "connected";
  } catch {
    return "disconnected";
  }
}
