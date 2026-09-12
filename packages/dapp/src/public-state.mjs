import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CohortError, ErrorCode } from './errors.mjs';
import { PROVE_ELIGIBLE_CLAIMS } from './claims.mjs';

let ledgerFnPromise;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

async function loadLedger() {
  if (!ledgerFnPromise) {
    const url = pathToFileURL(path.join(root, 'packages/contract/managed/cohort/contract/index.js')).href;
    ledgerFnPromise = import(url).then((m) => m.ledger);
  }
  return ledgerFnPromise;
}

export function configureNetwork(networkId = 'preprod') {
  setNetworkId(networkId);
  return networkId;
}

export function createPublicDataProvider({ indexerUrl, indexerWsUrl }) {
  if (!indexerUrl || !indexerWsUrl) {
    throw new CohortError(ErrorCode.INDEXER_UNAVAILABLE, 'Indexer URLs are required for public state.');
  }
  return indexerPublicDataProvider(indexerUrl, indexerWsUrl);
}

export async function readPublicVerification({
  contractAddress = PROVE_ELIGIBLE_CLAIMS.contractAddress,
  indexerUrl = process.env.MIDNIGHT_INDEXER_URL || 'https://indexer.preprod.midnight.network/api/v4/graphql',
  indexerWsUrl = process.env.MIDNIGHT_INDEXER_WS_URL || 'wss://indexer.preprod.midnight.network/api/v4/graphql/ws',
  networkId = process.env.MIDNIGHT_NETWORK || 'preprod',
} = {}) {
  configureNetwork(networkId);
  const provider = createPublicDataProvider({ indexerUrl, indexerWsUrl });
  const hex = contractAddress.startsWith('0x') ? contractAddress : contractAddress;
  const state = await provider.queryContractState(hex);
  if (!state) {
    throw new CohortError(ErrorCode.INDEXER_UNAVAILABLE, 'Indexer returned no contract state for this address.');
  }
  const ledger = await loadLedger();
  const pub = ledger(state.data);
  return {
    networkId,
    contractAddress: hex,
    proven: Number(pub.proven.toString()),
    spentCount: Number(pub.spent.size().toString()),
    referralCount: Number(pub.referrals.size().toString()),
    source: 'midnight-indexer',
  };
}
