import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const RT = require('@midnight-ntwrk/compact-runtime');
const { Contract, ledger } = await import(
  pathToFileURL('/home/devmo/cohort-work/sandbox/managed/cohort/contract/index.js').href
);

const bytes32 = (n) => {
  const a = new Uint8Array(32);
  a[31] = n;
  return a;
};

const patient = {
  age: 42n,
  condition: true,
  medication: false,
  secret: bytes32(7),
  blind: bytes32(9),
};

const witnesses = {
  wAge: (ctx) => [ctx.privateState, ctx.privateState.age],
  wCondition: (ctx) => [ctx.privateState, ctx.privateState.condition],
  wMedication: (ctx) => [ctx.privateState, ctx.privateState.medication],
  wSecret: (ctx) => [ctx.privateState, ctx.privateState.secret],
  wBlind: (ctx) => [ctx.privateState, ctx.privateState.blind],
};

const COIN = '0'.repeat(64);
const ADDR = RT.sampleContractAddress();
const contract = new Contract(witnesses);
const ctor = contract.initialState(RT.createConstructorContext(patient, COIN));

const run = (contractState, privateState, minAge, maxAge, requireCondition, forbidMedication, trialByte = 1) => {
  const ctx = RT.createCircuitContext(ADDR, COIN, contractState, privateState);
  return contract.impureCircuits.proveEligible(
    ctx,
    bytes32(trialByte),
    minAge,
    maxAge,
    requireCondition,
    forbidMedication
  );
};

const publicLedger = (out) => ledger(out.context.currentQueryContext.state);

const results = [];
const push = (name, fn) => {
  try {
    const out = fn();
    const led = publicLedger(out);
    results.push({
      name,
      ok: true,
      result: out.result,
      proven: led.proven.toString(),
      spentSize: led.spent.size().toString(),
      referralSize: led.referrals.size().toString(),
    });
    return out;
  } catch (e) {
    results.push({ name, ok: false, error: String(e.message || e) });
    return null;
  }
};

const first = push('eligible adult with required condition and no excluded medication', () =>
  run(ctor.currentContractState, patient, 30n, 50n, true, true)
);
push('too young fails', () =>
  run(ctor.currentContractState, { ...patient, age: 17n }, 18n, 80n, false, false)
);
push('excluded medication fails', () =>
  run(ctor.currentContractState, { ...patient, medication: true }, 30n, 50n, true, true)
);
push('missing required condition fails', () =>
  run(ctor.currentContractState, { ...patient, condition: false }, 30n, 50n, true, true)
);

if (first) {
  push('replay same trial same secret fails', () =>
    run(first.context.currentQueryContext.state, patient, 30n, 50n, true, true, 1)
  );
  const other = push('same patient different trial succeeds', () =>
    run(first.context.currentQueryContext.state, patient, 30n, 50n, true, true, 2)
  );
  if (other) {
    const a = [...publicLedger(first).spent];
    const b = [...publicLedger(other).spent];
    const same = a.length === 2 && RT.toHex(a[0]) === RT.toHex(b[0]);
    results.push({
      name: 'two-trial spent set has two distinct nullifiers',
      ok: b.length === 2 && RT.toHex(b[0]) !== RT.toHex(b[1]),
      n0: RT.toHex(b[0]),
      n1: RT.toHex(b[1]),
      firstStillPresent: same,
    });
  }
}

const publicDump = JSON.stringify(first?.result);
results.push({
  name: 'public circuit result is boolean true only',
  ok: publicDump === 'true',
  publicDump,
});
results.push({
  name: 'public result string does not contain age 42',
  ok: !publicDump.includes('42'),
});

console.log(JSON.stringify(results, null, 2));
