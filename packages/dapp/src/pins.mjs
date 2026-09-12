/**
 * Public-network pins (Preview / Preprod / Mainnet).
 * Source: https://docs.midnight.network/relnotes/support-matrix (verified 2026-09-12)
 * Do not bump to Compact 0.34 / ledger 9 / midnight-js 5.x / the ledger-9 prove wrapper on public nets.
 */
export const PUBLIC_NETWORK_PINS = Object.freeze({
  compactRuntime: '0.16.0',
  midnightJs: '4.1.1',
  dappConnectorApi: '4.0.1',
  walletSdk: '1.2.0',
  onchainRuntimeV3: '3.0.0',
  compactJs: '2.5.1',
  ledger: '8',
});

export const FORBIDDEN_PUBLIC_NET = Object.freeze({
  compactCompiler: '0.34',
  compactLanguage: '0.26',
  midnightJsMajor: 5,
  forbidLedger9ProveArm: true,
});
