/**
 * Blockfrost-operated Midnight endpoints (Preprod).
 *
 * The retired official Midnight Preprod indexer/RPC hosts were shut down
 * (HTTP 410 since 2026-10-09). The official replacement, per
 * https://docs.midnight.network/guides/networks-and-environments, is
 * Blockfrost, which serves the SAME Midnight indexer GraphQL schema at:
 *   indexer (GraphQL): https://midnight-preprod.blockfrost.io/api/v0
 *   indexer (WS):      wss://midnight-preprod.blockfrost.io/api/v0/ws
 *   node RPC:          https://rpc.midnight-preprod.blockfrost.io
 *
 * Every Blockfrost call requires a project token, appended as
 * `?project_id=<token>`. Without it Blockfrost answers HTTP 403.
 * The token is NEVER hardcoded: it comes from the BLOCKFROST_PROJECT_ID
 * environment variable only.
 */
import { env } from './env.mjs';

export const BLOCKFROST_INDEXER_HOST = 'midnight-preprod.blockfrost.io';
export const BLOCKFROST_RPC_HOST = 'rpc.midnight-preprod.blockfrost.io';

export const BLOCKFROST_INDEXER_URL = 'https://midnight-preprod.blockfrost.io/api/v0';
export const BLOCKFROST_INDEXER_WS_URL = 'wss://midnight-preprod.blockfrost.io/api/v0/ws';
export const BLOCKFROST_RPC_URL = 'https://rpc.midnight-preprod.blockfrost.io';

/** Project token from the environment. Empty string when not configured. */
export function blockfrostProjectId() {
  return String(env('BLOCKFROST_PROJECT_ID', '') || '').trim();
}

export function blockfrostTokenConfigured() {
  return blockfrostProjectId().length > 0;
}

export function isBlockfrostUrl(url) {
  try {
    const host = new URL(url).hostname;
    return host === BLOCKFROST_INDEXER_HOST || host === BLOCKFROST_RPC_HOST;
  } catch {
    return false;
  }
}

/**
 * Append `?project_id=<token>` to a Blockfrost URL when the token is
 * configured. Non-Blockfrost URLs and URLs that already carry project_id
 * are returned unchanged. Never throws.
 */
export function withProjectId(url) {
  if (!url || typeof url !== 'string') return url;
  try {
    if (!isBlockfrostUrl(url)) return url;
    const u = new URL(url);
    if (u.searchParams.has('project_id')) return url;
    const token = blockfrostProjectId();
    if (!token) return url;
    u.searchParams.set('project_id', token);
    return u.toString();
  } catch {
    return url;
  }
}

export function blockfrostIndexerUrl() {
  return withProjectId(BLOCKFROST_INDEXER_URL);
}

export function blockfrostIndexerWsUrl() {
  return withProjectId(BLOCKFROST_INDEXER_WS_URL);
}

export function blockfrostRpcUrl() {
  return withProjectId(BLOCKFROST_RPC_URL);
}

/** Clear, non-cryptic label for the missing-token state. Never fake data. */
export function blockfrostTokenMissingReason() {
  return 'indexer token not configured (set BLOCKFROST_PROJECT_ID)';
}
