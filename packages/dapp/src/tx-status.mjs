import { CohortError, ErrorCode } from './errors.mjs';
import { configureNetwork, createPublicDataProvider } from './public-state.mjs';
import { env } from './env.mjs';
import { blockfrostIndexerUrl, blockfrostIndexerWsUrl } from './blockfrost.mjs';

export async function getTransactionStatus({
  txId,
  indexerUrl = env('MIDNIGHT_INDEXER_URL', blockfrostIndexerUrl()),
  indexerWsUrl = env('MIDNIGHT_INDEXER_WS_URL', blockfrostIndexerWsUrl()),
  networkId = env('MIDNIGHT_NETWORK', 'preprod'),
} = {}) {
  if (!txId) {
    throw new CohortError(ErrorCode.TX_UNCONFIRMED, 'txId is required.');
  }
  configureNetwork(networkId);
  const provider = createPublicDataProvider({ indexerUrl, indexerWsUrl });
  try {
    const data = await provider.watchForTxData(txId);
    return {
      txId: data.txId,
      txHash: data.txHash,
      status: data.status,
      blockHeight: data.blockHeight,
      source: 'midnight-indexer',
    };
  } catch (err) {
    throw new CohortError(ErrorCode.TX_UNCONFIRMED, 'Indexer has not confirmed this transaction.', { cause: err });
  }
}
