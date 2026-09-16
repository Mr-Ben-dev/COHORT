/**
 * Public, non-secret pins for compile + judge verification.
 * Never put seeds, mnemonics, tokens, or private witnesses here.
 */
export const PROJECT_NAME = 'COHORT';
export const NETWORK_ID = 'preprod';
export const CONTRACT_ADDRESS = '1d5c2084222c8abea80bc8228c0c743ca183138e52f404594caa28572e7c29cc';
export const COMPACT_COMPILER = '0.31.1';
export const COMPACT_LANGUAGE = '0.23.0';
export const COMPACT_RUNTIME = '0.16.0';
export const ONCHAIN_RUNTIME = '3.0.0';
export const MIDNIGHT_JS = '4.1.1';
export const DAPP_CONNECTOR = '4.0.1';
export const WALLET_SDK = '1.2.0';
export const CIRCUIT_ID = 'proveEligible';
export const SOURCE_CONTRACT = 'CONTRACT/cohort.compact';
export const VERIFIER_SHA256 = '5af3b4b2ed345f711c5ff87367cfb0049732701c5a5336d51234b2a95fe32ab1';
export const PROVER_SHA256 = '5a31f2a515988e959ab5e6200abc41a11dc805d66f929f3c8ea89e6daa88e385';
export const PROVER_MIN_BYTES = 1_000_000;

export const INDEXER_URL = 'https://indexer.preprod.midnight.network/api/v4/graphql';
export const INDEXER_WS_URL = 'wss://indexer.preprod.midnight.network/api/v4/graphql/ws';
export const NODE_URL = 'https://rpc.preprod.midnight.network';
export const EXPLORER_URL = 'https://preprod.midnightexplorer.com/';
export const API_ORIGIN = 'https://cohort-y4zr.onrender.com';
export const WEB_ORIGIN = 'https://cohort-web-orcin.vercel.app';
export const REPO_URL = 'https://github.com/Mr-Ben-dev/COHORT';

/** Last EXECUTION_HISTORY-documented 1AM browser gold path (then proven=6). */
export const GOLD_PATH_TX = Object.freeze({
  what: '1AM in-browser proveEligible on NCT07153614 (documented gold path)',
  txHash: 'da8f79de04a120d7a0c8b433de992b21bee37a234b4af2c717aa16fb84fc1a60',
  txId: '002000dc2327f9391931cb5747f2e1f36480bb948634913ddcacc411cddea0d31d',
  network: NETWORK_ID,
  contract: CONTRACT_ADDRESS,
  provenAfter: 6,
  status: 'COMMITTED EVIDENCE',
});

/**
 * Additional documented proves from EXECUTION_HISTORY.
 * Do not treat the Node SDK tx as the browser gold path.
 */
export const HISTORICAL_TXS = Object.freeze([
  {
    what: 'Designer 1AM prove (utility-upgrade handoff)',
    txHash: '97308434388cdba0a83eec487a1cee3645b7eead9c8836ce457c3de84132e1c8',
    txId: '00cc4e4631c26250628f3b68fea771f1520b9f49316d7d8a7cb588ab48309599d9',
    block: 2524713,
    provenAfter: 5,
    status: 'COMMITTED EVIDENCE',
  },
  {
    what: 'Designer 1AM prove (honesty-pass copy)',
    txHash: '40527ba6332a5953533d696c5ebc090ed1f168a84f00e53ac02d2251b68c4276',
    txId: '003e8f36bcda1e2a9d9f50926b2cfcc8db16f9c931529b3af0d0e4c6ee0f4692c1',
    block: 2523970,
    provenAfter: 4,
    status: 'COMMITTED EVIDENCE',
  },
  {
    what: 'Designer 1AM proveEligible',
    txHash: '0e8b61cbeb1d4b044743f8512b1d1bebb4d048d4dde091af5ce992ba701a4bd0',
    block: 2523192,
    provenAfter: 3,
    status: 'COMMITTED EVIDENCE',
  },
  {
    what: 'Same-origin stub 1AM submitCallTx',
    txHash: '3b1624e9cc8c17808f67cb5c52244f197fe57c0c820c75ef5beb7e18b8bf1590',
    txId: '000657e4fb84d31e2426814305fca09a4af4b0abcf24417b176420eae0aa3a9867',
    provenAfter: 2,
    status: 'COMMITTED EVIDENCE',
  },
]);

export const FORBIDDEN_PUBLIC_DOC_NAMES = Object.freeze([
  'VaxZK',
  'NightPool',
  'ProveNow',
  'EduProof',
  'TacitPay',
  'Aletheia',
  'ShadowPayroll',
  'VeriHealth',
  'NightHire',
  'TrialSpark',
  'Deep 6',
  'Impilo',
]);
