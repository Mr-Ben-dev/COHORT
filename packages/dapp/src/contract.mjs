import { CompiledContract } from '@midnight-ntwrk/midnight-js-protocol/compact-js';
import { Contract } from '../../contract/managed/cohort/contract/index.js';

export function createWitnesses() {
  return {
    wAge: ({ privateState }) => [privateState, BigInt(privateState.age)],
    wCondition: ({ privateState }) => [privateState, Boolean(privateState.condition)],
    wMedication: ({ privateState }) => [privateState, Boolean(privateState.medication)],
    wSecret: ({ privateState }) => [privateState, privateState.secret],
    wBlind: ({ privateState }) => [privateState, privateState.blind],
  };
}

export async function createCompiledContract(witnesses = createWitnesses()) {
  let assets = '/zk';
  if (typeof process !== 'undefined' && process.versions?.node) {
    const { zkDir } = await import('./zk-fs.mjs');
    assets = zkDir();
  }
  return CompiledContract.make('cohort', Contract).pipe(
    CompiledContract.withWitnesses(witnesses),
    CompiledContract.withCompiledFileAssets(assets),
  );
}
