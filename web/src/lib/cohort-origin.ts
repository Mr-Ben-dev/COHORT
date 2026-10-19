/**
 * Public COHORT origin (Render). Safe for the browser bundle.
 * Never put GitHub / Render / Vercel tokens, seeds, or mnemonics here.
 */
export const COHORT_API_ORIGIN = (
  process.env.NEXT_PUBLIC_COHORT_API_ORIGIN || "https://cohort-y4zr.onrender.com"
).replace(/\/$/, "");

export const MIDNIGHT_NETWORK = process.env.NEXT_PUBLIC_MIDNIGHT_NETWORK || "preprod";

export const COHORT_CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ||
  "1d5c2084222c8abea80bc8228c0c743ca183138e52f404594caa28572e7c29cc";

// Blockfrost operates the official Preprod indexer (old midnight.network
// Preprod hosts are shut down). Calls need ?project_id=<token> from
// BLOCKFROST_PROJECT_ID — never a NEXT_PUBLIC_* variable; the wallet's
// getConfiguration() indexer URIs or an explicit MIDNIGHT_INDEXER_URL
// (with ?project_id=) supply it at runtime.
export const MIDNIGHT_INDEXER_URL =
  process.env.NEXT_PUBLIC_INDEXER_URL ||
  "https://midnight-preprod.blockfrost.io/api/v0";

export const MIDNIGHT_INDEXER_WS_URL =
  process.env.NEXT_PUBLIC_INDEXER_WS_URL ||
  "wss://midnight-preprod.blockfrost.io/api/v0/ws";
