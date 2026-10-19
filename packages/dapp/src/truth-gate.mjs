/**
 * Truth gate: never report attest/prove success on wallet-acceptance alone.
 *
 * A wallet saying "transaction accepted" is NOT proof the ledger changed.
 * Any caller that wants to show a success UI MUST await `truthGatedCall`
 * and MUST pass the result through `assertClaimedSuccess` before rendering
 * success. Results that did not pass through the gate fail
 * `isClaimedSuccess` — even if they look like `{ confirmed: true }` —
 * because the gate brands its own results with a module-private symbol that
 * outside code cannot forge.
 *
 * Typical flow:
 *
 *   const result = await truthGatedCall(wallet.submitTx(balancedTx), {
 *     contractAddress: CohortDapp.claims.contractAddress,
 *     expectedPredicate: ({ stateHex }) =>
 *       ledger(stateHex).provenCounter > provenBefore, // close over YOUR pre-tx baseline
 *   });
 *   assertClaimedSuccess(result); // throws unless the ledger effect was observed
 *   showSuccessUI(result);
 *
 * Ledger reads go through the Blockfrost-operated Midnight indexer GraphQL
 * endpoint (see ./blockfrost.mjs). The token is read from
 * BLOCKFROST_PROJECT_ID and sent as `?project_id=` — it is never logged,
 * never committed, never put anywhere else.
 */
import { CohortError, ErrorCode } from './errors.mjs';
import { env } from './env.mjs';
import {
  blockfrostIndexerUrl,
  blockfrostTokenConfigured,
  blockfrostTokenMissingReason,
} from './blockfrost.mjs';

/** Module-private brand. Results without it are not truth-gated claims. */
const TRUTH_GATED = Symbol('cohort.truthGated');

export const TRUTH_GATE_DEFAULTS = Object.freeze({
  pollIntervalMs: 4000,
  timeoutMs: 120000,
});

const CONTRACT_ACTION_QUERY = `
query TruthGateContractState($address: HexEncoded!) {
  contractAction(address: $address) {
    __typename
    address
    state
    transaction {
      hash
      block {
        height
      }
    }
  }
}
`.trim();

function brand(result) {
  Object.defineProperty(result, TRUTH_GATED, {
    value: true,
    enumerable: false,
    writable: false,
    configurable: false,
  });
  return result;
}

/** True only if `result` is a CONFIRMED success that actually passed through the truth gate. */
export function isClaimedSuccess(result) {
  return Boolean(
    result && result[TRUTH_GATED] === true && result.confirmed === true,
  );
}

/** True only if `result` is an UNCONFIRMED outcome that actually passed through the truth gate. */
export function isClaimedFailure(result) {
  return Boolean(
    result && result[TRUTH_GATED] === true && result.confirmed === false,
  );
}

/**
 * Throw unless `result` is a truth-gated, ledger-observed success.
 * Call this immediately before rendering any success UI.
 */
export function assertClaimedSuccess(result) {
  if (!isClaimedSuccess(result)) {
    throw new CohortError(
      ErrorCode.TX_UNCONFIRMED,
      'Success UI blocked: no truth-gated ledger confirmation. ' +
        'Await truthGatedCall() and show success only after the on-chain effect is observed.',
      { cause: result },
    );
  }
  return result;
}

function resolveFetch(fetchImpl) {
  const fn = fetchImpl ?? globalThis.fetch;
  if (typeof fn !== 'function') {
    throw new CohortError(
      ErrorCode.INCOMPATIBLE_RUNTIME,
      'No fetch implementation available for truth-gate polling.',
    );
  }
  return fn;
}

function indexerUrl(indexerUrlOverride) {
  return indexerUrlOverride ?? env('MIDNIGHT_INDEXER_URL', blockfrostIndexerUrl());
}

function httpError(status, bodyText) {
  const hint = blockfrostTokenConfigured()
    ? ''
    : ` ${blockfrostTokenMissingReason()}.`;
  return new CohortError(
    ErrorCode.INDEXER_UNAVAILABLE,
    `Indexer HTTP ${status}.${hint}`,
    { cause: new Error(String(bodyText).slice(0, 200)) },
  );
}

/**
 * Fetch the latest on-chain action (and its raw serialized ledger state) for
 * a contract address. Returns null when the indexer knows no action for the
 * address yet (e.g. freshly deployed, not indexed) — the caller keeps
 * polling rather than treating absence as failure or success.
 */
export async function fetchContractState({
  contractAddress,
  fetch: fetchImpl,
  indexerUrl: indexerUrlOverride,
} = {}) {
  if (!contractAddress || typeof contractAddress !== 'string') {
    throw new CohortError(ErrorCode.TX_UNCONFIRMED, 'contractAddress is required.');
  }
  const doFetch = resolveFetch(fetchImpl);
  const url = indexerUrl(indexerUrlOverride);
  let res;
  try {
    res = await doFetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: CONTRACT_ACTION_QUERY,
        variables: { address: contractAddress },
      }),
    });
  } catch (err) {
    throw new CohortError(ErrorCode.INDEXER_UNAVAILABLE, 'Indexer request failed.', {
      cause: err,
    });
  }
  if (!res || typeof res.ok !== 'boolean') {
    throw new CohortError(
      ErrorCode.INDEXER_UNAVAILABLE,
      'Indexer returned an unreadable response.',
    );
  }
  if (!res.ok) {
    const bodyText = await res.text().catch(() => '');
    throw httpError(res.status, bodyText);
  }
  let json;
  try {
    json = await res.json();
  } catch (err) {
    throw new CohortError(
      ErrorCode.INDEXER_UNAVAILABLE,
      'Indexer returned non-JSON.',
      { cause: err },
    );
  }
  if (json?.errors?.length) {
    throw new CohortError(
      ErrorCode.INDEXER_UNAVAILABLE,
      `Indexer GraphQL error: ${String(json.errors[0]?.message ?? 'unknown').slice(0, 200)}`,
    );
  }
  const action = json?.data?.contractAction ?? null;
  if (!action) return null;
  const tx = action.transaction ?? {};
  return {
    contractAddress,
    actionTypename: action.__typename ?? null,
    stateHex: typeof action.state === 'string' ? action.state : null,
    transactionHash: typeof tx.hash === 'string' ? tx.hash : null,
    blockHeight:
      tx.block && Number.isInteger(tx.block.height) ? tx.block.height : null,
    raw: action,
  };
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Poll the indexer until `expectedPredicate` observes the transaction's
 * effect in the on-chain contract state, then return
 * `{ confirmed: true, txHash, observedAtBlock }`.
 *
 * - `expectedPredicate(snapshot, { attempt, txHash })` must return (or
 *   resolve to) a truthy value only when the effect is ACTUALLY present in
 *   the polled state. Close over your pre-tx baseline (e.g. the proven
 *   counter read BEFORE submitting) and require the delta — a predicate
 *   that was already true before the tx would confirm on stale state.
 * - `snapshot` is `{ contractAddress, actionTypename, stateHex,
 *   transactionHash, blockHeight, raw }`; `stateHex` is null while the
 *   indexer has no action for the address yet.
 * - Transient indexer/network errors and predicate exceptions never count
 *   as success; polling continues until the deadline. On timeout the
 *   function returns `{ confirmed: false, reason: 'timeout', txHash }` —
 *   it NEVER reports success early.
 */
export async function waitForLedgerEffect({
  contractAddress,
  expectedPredicate,
  txHash = null,
  pollIntervalMs = TRUTH_GATE_DEFAULTS.pollIntervalMs,
  timeoutMs = TRUTH_GATE_DEFAULTS.timeoutMs,
  fetch: fetchImpl,
  indexerUrl: indexerUrlOverride,
  onPoll,
} = {}) {
  if (typeof expectedPredicate !== 'function') {
    throw new CohortError(
      ErrorCode.TX_UNCONFIRMED,
      'expectedPredicate must be a function.',
    );
  }
  const deadline = Date.now() + Math.max(0, Number(timeoutMs) || 0);
  let attempts = 0;
  let lastError = null;

  for (;;) {
    attempts += 1;
    let snapshot = null;
    try {
      snapshot = await fetchContractState({
        contractAddress,
        fetch: fetchImpl,
        indexerUrl: indexerUrlOverride,
      });
    } catch (err) {
      // Transient: keep polling. Absence of an observation is never success.
      lastError = err;
    }

    if (snapshot) {
      let observed = false;
      try {
        observed = Boolean(
          await expectedPredicate(snapshot, { attempt: attempts, txHash }),
        );
      } catch (err) {
        // Predicate (e.g. ledger decode) failures never count as success.
        lastError = err;
      }
      if (observed) {
        return brand({
          confirmed: true,
          txHash,
          observedAtBlock: snapshot.blockHeight,
          attempts,
          actionTypename: snapshot.actionTypename,
          transactionHash: snapshot.transactionHash,
        });
      }
    }

    if (typeof onPoll === 'function') {
      try {
        await onPoll({ attempt: attempts, snapshot, txHash });
      } catch {
        // Observer hooks must never break the gate.
      }
    }

    if (Date.now() >= deadline) {
      return brand({
        confirmed: false,
        reason: 'timeout',
        txHash,
        attempts,
        lastError: lastError ? String(lastError.message ?? lastError) : null,
      });
    }
    const remaining = deadline - Date.now();
    await sleep(Math.max(0, Math.min(Number(pollIntervalMs) || 0, remaining)));
  }
}

function normalizeTxHash(submitted) {
  if (typeof submitted === 'string' && submitted.length > 0) return submitted;
  if (submitted && typeof submitted === 'object') {
    for (const key of ['txHash', 'txId', 'hash', 'identifier']) {
      const v = submitted[key];
      if (typeof v === 'string' && v.length > 0) return v;
    }
  }
  return null;
}

/**
 * Gate UI success state behind on-chain observation.
 *
 * `txPromise` is the wallet's transaction-submission promise. Its REJECTION
 * propagates immediately — a rejected submission is never polled and never
 * confirmed. Its resolution only yields a tx hash; success is reported
 * solely by `waitForLedgerEffect` observing the ledger effect.
 *
 * `gateOpts` is passed through to `waitForLedgerEffect` (contractAddress,
 * expectedPredicate, pollIntervalMs, timeoutMs, fetch, indexerUrl, onPoll)
 * plus an optional `txHash` fallback used when the submission result
 * carries no identifiable hash.
 */
export async function truthGatedCall(txPromise, gateOpts = {}) {
  // Await WITHOUT catching: submission rejection propagates immediately.
  const submitted = await txPromise;
  const txHash = normalizeTxHash(submitted) ?? gateOpts.txHash ?? null;
  return waitForLedgerEffect({ ...gateOpts, txHash });
}
