import { findPrivateFields } from '../../../apps/api/src/public-fields.mjs';
import { CohortError, ErrorCode } from './errors.mjs';
import { ProveLifecycle } from './types.mjs';
import { connectWallet } from './wallet.mjs';

/**
 * Real submitCallTx path. Never invents a transaction hash.
 * Public proving keys are not in git yet (Phase 10). Until they are hosted,
 * this function fails closed after wallet/privacy checks.
 */
export async function proveEligibility(input = {}) {
  const envelope = { ...input };
  delete envelope.facts;
  const leaked = findPrivateFields(envelope);
  if (leaked.length) {
    throw new CohortError(
      ErrorCode.PRIVATE_FIELD,
      'Private fields cannot be placed on the public prove envelope.',
    );
  }

  const facts = input.facts;
  if (!facts || typeof facts.age !== 'number' || typeof facts.condition !== 'boolean' || typeof facts.medication !== 'boolean') {
    throw new CohortError(ErrorCode.PRIVATE_FIELD, 'Local facts {age, condition, medication} are required and must not be HTTP fields.');
  }

  if (input.wallet?.api && typeof input.wallet.api.getProvingProvider === 'function') {
    throw new CohortError(
      ErrorCode.ZK_CONFIG_MISSING,
      'Public proving keys are not hosted yet. submitCallTx will not run with a mock proof.',
      { cause: { lifecycle: ProveLifecycle.FAILED } },
    );
  }

  await connectWallet({ networkId: input.networkId || 'preprod' });
}
