import { submitCallTx } from '@midnight-ntwrk/midnight-js-contracts';
import { findPrivateFields } from '../../../apps/api/src/public-fields.mjs';
import { CohortError, ErrorCode } from './errors.mjs';
import { ProveLifecycle, assertPrivateFactsShape } from './types.mjs';
import { connectWallet } from './wallet.mjs';
import { encodeTrialId, randomBytes32 } from './encoding.mjs';
import { createCompiledContract } from './contract.mjs';
import { createCallProviders } from './providers.mjs';
import { configureNetwork, readPublicVerification } from './public-state.mjs';
import { getTrial } from './trials.mjs';
import { PROVE_ELIGIBLE_CLAIMS } from './claims.mjs';

function requireTrialPolicy(trial) {
  if (!trial || typeof trial !== 'object') {
    throw new CohortError(ErrorCode.UNSUPPORTED_CRITERIA, 'Public trial policy from /api/trials is required as circuit args.');
  }
  const { trialId, minAge, maxAge, requireCondition, forbidMedication } = trial;
  if (typeof trialId !== 'string' || typeof minAge !== 'number' || typeof maxAge !== 'number') {
    throw new CohortError(ErrorCode.UNSUPPORTED_CRITERIA, 'Trial policy is missing typed age bounds.');
  }
  if (typeof requireCondition !== 'boolean' || typeof forbidMedication !== 'boolean') {
    throw new CohortError(ErrorCode.UNSUPPORTED_CRITERIA, 'Trial policy is missing hand-mapped flags.');
  }
  return { trialId, minAge, maxAge, requireCondition, forbidMedication };
}

function policiesMatch(a, b) {
  return (
    a.trialId === b.trialId &&
    a.minAge === b.minAge &&
    a.maxAge === b.maxAge &&
    a.requireCondition === b.requireCondition &&
    a.forbidMedication === b.forbidMedication
  );
}

/** Circuit args must be the served /api/trials policy, never a user-typed bound. */
export async function bindOfficialTrial(input = {}) {
  const trialId = input.trial?.trialId || input.trialId;
  if (!trialId) {
    throw new CohortError(ErrorCode.UNSUPPORTED_CRITERIA, 'trialId is required so circuit args can bind to /api/trials.');
  }
  const official = await getTrial(trialId, { origin: input.origin });
  if (!official) {
    throw new CohortError(ErrorCode.UNSUPPORTED_CRITERIA, 'Unknown trial — not in the typed ClinicalTrials.gov subset.');
  }
  const policy = requireTrialPolicy(official);
  if (input.trial) {
    const caller = requireTrialPolicy(input.trial);
    if (!policiesMatch(caller, policy)) {
      throw new CohortError(
        ErrorCode.UNSUPPORTED_CRITERIA,
        'Circuit args must match the served /api/trials policy. User-typed bounds are rejected.',
      );
    }
  }
  return policy;
}

async function assertDust(wallet) {
  let dust = wallet?.dust ?? null;
  if (dust == null && typeof wallet?.api?.getDustBalance === 'function') {
    try {
      dust = await wallet.api.getDustBalance();
    } catch {
      dust = null;
    }
  }
  if (dust && typeof dust === 'object' && dust.balance === 0n) {
    throw new CohortError(ErrorCode.INSUFFICIENT_DUST, 'Wallet DUST balance is 0. Register NIGHT for DUST before proving.');
  }
}

function localPreview(facts, trial) {
  if (facts.age < trial.minAge || facts.age > trial.maxAge) return false;
  if (trial.requireCondition && !facts.condition) return false;
  if (trial.forbidMedication && facts.medication) return false;
  return true;
}

/** Mint per-proof secret/blind. Reusing a secret for the same trial is rejected on-chain. */
export function mintWitnessSecrets(facts = {}) {
  const secret = facts.secret instanceof Uint8Array && facts.secret.length === 32 ? facts.secret : randomBytes32();
  const blind = facts.blind instanceof Uint8Array && facts.blind.length === 32 ? facts.blind : randomBytes32();
  return { secret, blind };
}

/**
 * Real midnight-js 4.1.1 submitCallTx path via 1AM getProvingProvider.
 * Never invents a transaction hash. Never posts private facts.
 */
function emitStage(input, stage) {
  if (typeof input?.onStage === 'function') {
    try {
      input.onStage(stage);
    } catch {
      /* UI progress must never abort a real prove. */
    }
  }
}

export async function proveEligibility(input = {}) {
  const envelope = { ...input };
  delete envelope.facts;
  delete envelope.wallet;
  delete envelope.zkConfigProvider;
  delete envelope.onStage;
  const leaked = findPrivateFields(envelope);
  if (leaked.length) {
    throw new CohortError(
      ErrorCode.PRIVATE_FIELD,
      'Private fields cannot be placed on the public prove envelope.',
    );
  }

  const facts = input.facts;
  if (!assertPrivateFactsShape(facts)) {
    throw new CohortError(ErrorCode.PRIVATE_FIELD, 'Local facts {age, condition, medication} are required and must not be HTTP fields.');
  }

  emitStage(input, ProveLifecycle.PREPARING);
  const trial = await bindOfficialTrial(input);
  if (!localPreview(facts, trial)) {
    throw new CohortError(
      ErrorCode.UNSUPPORTED_CRITERIA,
      'Local typed-subset preview failed. This is not a proof and no transaction was submitted.',
    );
  }

  let wallet = input.wallet;
  if (!wallet?.api) {
    wallet = await connectWallet({ networkId: input.networkId || 'preprod' });
  }
  if (typeof wallet.api?.getProvingProvider !== 'function') {
    throw new CohortError(
      ErrorCode.WALLET_NO_PROVING,
      'Connected wallet does not expose getProvingProvider. COHORT will not send witnesses to a hosted prover.',
    );
  }

  await assertDust(wallet);

  const networkId = input.networkId || 'preprod';
  configureNetwork(networkId);
  emitStage(input, ProveLifecycle.PROVING);

  const privateStateId = 'cohortPrivateState';
  const { secret, blind } = mintWitnessSecrets(facts);
  const privateState = {
    age: facts.age,
    condition: facts.condition,
    medication: facts.medication,
    secret,
    blind,
  };

  try {
    const providers = await createCallProviders({ ...input, wallet });
    await providers.privateStateProvider.set(privateStateId, privateState);
    const compiledContract = await createCompiledContract();
    emitStage(input, ProveLifecycle.WAITING_FOR_WALLET);
    emitStage(input, ProveLifecycle.SUBMITTING);
    const result = await submitCallTx(providers, {
      compiledContract,
      circuitId: 'proveEligible',
      contractAddress: providers.contractAddress,
      privateStateId,
      args: [
        encodeTrialId(trial.trialId),
        BigInt(trial.minAge),
        BigInt(trial.maxAge),
        trial.requireCondition,
        trial.forbidMedication,
      ],
    });
    const txId = result.public?.txId;
    const txHash = result.public?.txHash;
    if (!txId && !txHash) {
      throw new CohortError(ErrorCode.TX_UNCONFIRMED, 'submitCallTx returned no transaction identifier.');
    }
    emitStage(input, ProveLifecycle.CONFIRMING);
    let verification = null;
    try {
      verification = await readPublicVerification({
        contractAddress: PROVE_ELIGIBLE_CLAIMS.contractAddress,
        indexerUrl: input.indexerUrl,
        indexerWsUrl: input.indexerWsUrl,
        networkId,
      });
    } catch {
      verification = null;
    }
    if (input.postPublicReferral && input.origin && (txId || txHash)) {
      const origin = String(input.origin).replace(/\/$/, '');
      await fetch(`${origin}/api/referral`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          trialId: trial.trialId,
          txHash: txHash || null,
          contractAddress: PROVE_ELIGIBLE_CLAIMS.contractAddress,
          networkId,
        }),
      });
    }

    emitStage(input, ProveLifecycle.CONFIRMED);
    return {
      lifecycle: ProveLifecycle.CONFIRMED,
      txId,
      txHash,
      blockHeight: result.public?.blockHeight,
      proven: verification?.proven ?? null,
      source: 'submitCallTx',
      claims: PROVE_ELIGIBLE_CLAIMS,
    };
  } catch (err) {
    emitStage(input, ProveLifecycle.FAILED);
    if (err instanceof CohortError) throw err;
    throw new CohortError(ErrorCode.PROVING_FAILED, 'Proving or submission failed.', { cause: err });
  }
}
