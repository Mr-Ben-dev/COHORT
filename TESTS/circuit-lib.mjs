import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
export const RT = require('@midnight-ntwrk/compact-runtime');

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const contractUrl = pathToFileURL(
  path.join(root, 'packages/contract/managed/cohort/contract/index.js'),
).href;

const { Contract, ledger } = await import(contractUrl);
export { Contract, ledger };

export const bytes32 = (n) => {
  const a = new Uint8Array(32);
  a[31] = n;
  return a;
};

export const witnesses = {
  wAge: (ctx) => [ctx.privateState, ctx.privateState.age],
  wCondition: (ctx) => [ctx.privateState, ctx.privateState.condition],
  wMedication: (ctx) => [ctx.privateState, ctx.privateState.medication],
  wSecret: (ctx) => [ctx.privateState, ctx.privateState.secret],
  wBlind: (ctx) => [ctx.privateState, ctx.privateState.blind],
};

export function makePatient(overrides = {}) {
  return {
    age: 42n,
    condition: true,
    medication: false,
    secret: bytes32(7),
    blind: bytes32(9),
    ...overrides,
  };
}

export function boot(patient = makePatient()) {
  const contract = new Contract(witnesses);
  const ctor = contract.initialState(RT.createConstructorContext(patient, '0'.repeat(64)));
  return { contract, ctor, addr: RT.sampleContractAddress() };
}

export function prove(session, privateState, args = {}) {
  const {
    minAge = 30n,
    maxAge = 50n,
    requireCondition = true,
    forbidMedication = true,
    trialByte = 1,
    contractState = session.ctor.currentContractState,
  } = args;
  const ctx = RT.createCircuitContext(session.addr, '0'.repeat(64), contractState, privateState);
  return session.contract.impureCircuits.proveEligible(
    ctx,
    bytes32(trialByte),
    minAge,
    maxAge,
    requireCondition,
    forbidMedication,
  );
}

export const publicLedger = (out) => ledger(out.context.currentQueryContext.state);
