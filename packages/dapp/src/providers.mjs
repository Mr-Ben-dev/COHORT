import { FetchZkConfigProvider } from '@midnight-ntwrk/midnight-js-fetch-zk-config-provider';
import { dappConnectorProofProvider } from '@midnight-ntwrk/midnight-js-dapp-connector-proof-provider';
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import { asContractAddress } from '@midnight-ntwrk/midnight-js-types';
import { CostModel, Transaction } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import { fromHex, toHex } from '@midnight-ntwrk/midnight-js-utils';
import { CohortError, ErrorCode } from './errors.mjs';
import { createPublicDataProvider } from './public-state.mjs';
import { sessionStoragePassword } from './encoding.mjs';
import { PROVE_ELIGIBLE_CLAIMS } from './claims.mjs';

function isNode() {
  return typeof process !== 'undefined' && Boolean(process.versions?.node);
}

export async function createZkConfigProvider({ zkConfigProvider, zkBaseUrl, origin } = {}) {
  if (zkConfigProvider) return zkConfigProvider;
  if (zkBaseUrl) {
    const base = zkBaseUrl.endsWith('/') ? zkBaseUrl : `${zkBaseUrl}/`;
    return new FetchZkConfigProvider(base);
  }
  if (isNode()) {
    const { NodeZkConfigProvider } = await import('@midnight-ntwrk/midnight-js-node-zk-config-provider');
    const { zkDir, zkArtifactsPresent } = await import('./zk-fs.mjs');
    if (!zkArtifactsPresent()) {
      throw new CohortError(
        ErrorCode.ZK_CONFIG_MISSING,
        'Public proving keys are not present in packages/contract/zk. submitCallTx will not run with a mock proof.',
      );
    }
    return new NodeZkConfigProvider(zkDir());
  }
  const baseOrigin = origin || globalThis.location?.origin;
  if (!baseOrigin) {
    throw new CohortError(
      ErrorCode.ZK_CONFIG_MISSING,
      'Public proving keys URL is missing. submitCallTx will not run with a mock proof.',
    );
  }
  const base = `${String(baseOrigin).replace(/\/$/, '')}/zk/`;
  return new FetchZkConfigProvider(base);
}

export async function assertZkConfig(zkConfigProvider) {
  try {
    const vk = await zkConfigProvider.getVerifierKey('proveEligible');
    if (!vk || vk.byteLength < 32) {
      throw new Error('verifier key too small');
    }
  } catch (err) {
    if (err instanceof CohortError) throw err;
    throw new CohortError(
      ErrorCode.ZK_CONFIG_MISSING,
      'Public proving keys could not be loaded. submitCallTx will not run with a mock proof.',
      { cause: err },
    );
  }
}

function connectorWalletProviders(api, shieldedAddresses) {
  return {
    getCoinPublicKey: () => shieldedAddresses.shieldedCoinPublicKey,
    getEncryptionPublicKey: () => shieldedAddresses.shieldedEncryptionPublicKey,
    async balanceTx(tx) {
      const received = await api.balanceUnsealedTransaction(toHex(tx.serialize()));
      return Transaction.deserialize('signature', 'proof', 'binding', fromHex(received.tx));
    },
    async submitTx(tx) {
      await api.submitTransaction(toHex(tx.serialize()));
      return tx.identifiers()[0];
    },
  };
}

export async function createCallProviders(input) {
  const api = input.wallet?.api;
  if (!api || typeof api.getProvingProvider !== 'function') {
    throw new CohortError(ErrorCode.WALLET_NO_PROVING, 'Connected wallet does not expose getProvingProvider.');
  }
  if (typeof api.getShieldedAddresses !== 'function' || typeof api.balanceUnsealedTransaction !== 'function') {
    throw new CohortError(
      ErrorCode.WALLET_UNAVAILABLE,
      'Wallet is missing balanceUnsealedTransaction / getShieldedAddresses. Cannot submitCallTx.',
    );
  }

  const zkConfigProvider = await createZkConfigProvider(input);
  await assertZkConfig(zkConfigProvider);

  const costModel = CostModel.initialCostModel();
  let proofProvider;
  try {
    proofProvider = await dappConnectorProofProvider(api, zkConfigProvider, costModel);
  } catch (err) {
    throw new CohortError(ErrorCode.PROVING_FAILED, 'Wallet proving provider could not be created.', { cause: err });
  }

  const shieldedAddresses = await api.getShieldedAddresses();
  const walletAndMidnight = connectorWalletProviders(api, shieldedAddresses);
  const accountId = String(shieldedAddresses.shieldedCoinPublicKey || 'cohort-session');
  const password = sessionStoragePassword();

  let indexerUrl = input.indexerUrl || process.env.MIDNIGHT_INDEXER_URL || 'https://indexer.preprod.midnight.network/api/v4/graphql';
  let indexerWsUrl = input.indexerWsUrl || process.env.MIDNIGHT_INDEXER_WS_URL || 'wss://indexer.preprod.midnight.network/api/v4/graphql/ws';
  if (typeof api.getConfiguration === 'function') {
    try {
      const cfg = await api.getConfiguration();
      if (cfg?.indexerUri) indexerUrl = cfg.indexerUri;
      if (cfg?.indexerWsUri) indexerWsUrl = cfg.indexerWsUri;
    } catch {
      // keep env defaults
    }
  }

  const privateStateProvider = levelPrivateStateProvider({
    midnightDbName: isNode() ? `midnight-level-db-cohort-${Date.now()}` : 'midnight-level-db-cohort',
    privateStoragePasswordProvider: () => password,
    accountId,
  });
  const contractAddress = asContractAddress(input.contractAddress || PROVE_ELIGIBLE_CLAIMS.contractAddress);
  privateStateProvider.setContractAddress(contractAddress);

  return {
    privateStateProvider,
    publicDataProvider: createPublicDataProvider({ indexerUrl, indexerWsUrl }),
    zkConfigProvider,
    proofProvider,
    walletProvider: walletAndMidnight,
    midnightProvider: walletAndMidnight,
    contractAddress,
  };
}
