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

export const MIDNIGHT_INDEXER_URL =
  process.env.NEXT_PUBLIC_INDEXER_URL ||
  "https://indexer.preprod.midnight.network/api/v4/graphql";

export const MIDNIGHT_INDEXER_WS_URL =
  process.env.NEXT_PUBLIC_INDEXER_WS_URL ||
  "wss://indexer.preprod.midnight.network/api/v4/graphql/ws";
