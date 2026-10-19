import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const runnerUrl = path.join(root, 'web/src/lib/demo-runner.mjs');
const runner = await import(`file://${runnerUrl}`);

// ---------------------------------------------------------------------------
// Tier metadata: labels are explicit, unknown tiers throw (no silent mapping)
// ---------------------------------------------------------------------------

test('tier titles are distinct and honest', () => {
  assert.equal(runner.tierTitle('simulator'), 'Try in browser (no install)');
  assert.equal(runner.tierTitle('wallet'), 'Prove with wallet');
  assert.notEqual(runner.tierTitle('simulator'), runner.tierTitle('wallet'));
});

test('unknown tier throws — never silently mapped', () => {
  assert.throws(() => runner.tierTitle('mainnet'), /UNKNOWN_TIER/);
  assert.throws(() => runner.tierTitle(''), /UNKNOWN_TIER/);
  assert.throws(() => runner.tierTitle(undefined), /UNKNOWN_TIER/);
});

test('simulation disclaimer is exact and attached to tier 1', () => {
  assert.equal(runner.SIMULATION_DISCLAIMER, 'simulated proof — not on-chain');
  assert.equal(runner.tierMeta('simulator').honesty, runner.SIMULATION_DISCLAIMER);
  assert.notEqual(runner.tierMeta('wallet').honesty, runner.SIMULATION_DISCLAIMER);
});

// ---------------------------------------------------------------------------
// proveAttested ceremony gate
// ---------------------------------------------------------------------------

test('proveAttested gate refuses without ceremony and states the reason', () => {
  const g = runner.gateProveAttested({ ceremonyComplete: false });
  assert.equal(g.allowed, false);
  assert.equal(typeof g.reason, 'string');
  assert.ok(g.reason.length > 40);
  assert.match(g.reason, /ceremony/i);
});

test('proveAttested gate opens only on explicit ceremony completion', () => {
  assert.deepEqual(runner.gateProveAttested({ ceremonyComplete: true }), { allowed: true, reason: null });
  // default (flag absent) is closed — no silent opt-in
  assert.equal(runner.gateProveAttested().allowed, false);
});

// ---------------------------------------------------------------------------
// Witness helpers
// ---------------------------------------------------------------------------

test('makeWitnesses rejects out-of-range age loudly', () => {
  assert.throws(() => runner.makeWitnesses({ age: 300, condition: true, medication: false }), /BAD_WITNESS/);
  const w = runner.makeWitnesses({ age: 31, condition: true, medication: false });
  assert.equal(w.age, 31n);
  assert.equal(w.secret.length, 32);
  assert.equal(w.blind.length, 32);
});

test('bytes32FromNumber is deterministic 32 bytes', () => {
  const b = runner.bytes32FromNumber(1);
  assert.equal(b.length, 32);
  assert.equal(b[31], 1);
  assert.equal(runner.bytesToHex(b).endsWith('01'), true);
});

// ---------------------------------------------------------------------------
// Real compiled contract: load + simulator circuit runs (same code path as
// TESTS/circuit-lib.mjs, via demo-runner)
// ---------------------------------------------------------------------------

const contractModule = await runner.loadContractModule();

test('contract module loads from the managed build with Contract + ledger', () => {
  assert.equal(typeof contractModule.Contract, 'function');
  assert.equal(typeof contractModule.ledger, 'function');
  assert.match(contractModule.source, /managed/);
});

test('availableCircuits reflects the real build — proveEligible present', () => {
  const c = new contractModule.Contract(runner.witnessAdapters);
  assert.ok(runner.availableCircuits(c).includes('proveEligible'));
});

test('simulator: eligible patient proves (exact ledger counts)', () => {
  const out = runner.runProveEligibleSimulator(contractModule, {
    witnesses: runner.makeWitnesses({ age: 31, condition: true, medication: false }),
    trialByte: 1,
    minAge: 18n,
    maxAge: 80n,
  });
  assert.equal(out.ok, true);
  assert.equal(out.result, true);
  assert.equal(out.ledger.proven, '1');
  assert.equal(out.ledger.spent, '1');
  assert.equal(out.ledger.referrals, '1');
});

test('simulator: ineligible patient fails LOUDLY with the circuit message', () => {
  assert.throws(
    () =>
      runner.runProveEligibleSimulator(contractModule, {
        witnesses: runner.makeWitnesses({ age: 17, condition: true, medication: false }),
        trialByte: 1,
        minAge: 18n,
        maxAge: 80n,
      }),
    /too young/,
  );
});

test('simulator: unknown circuit is an explicit build gap, not a silent pass', () => {
  assert.throws(
    () =>
      runner.runCircuit({
        contractModule,
        circuit: 'proveNope',
        privateState: runner.makeWitnesses({ age: 31, condition: true, medication: false }),
        args: [],
      }),
    /CIRCUIT_NOT_AVAILABLE/,
  );
});

test('simulator: fresh blinds keep nullifier sets distinct across trials', () => {
  const w1 = runner.makeWitnesses({ age: 31, condition: true, medication: false });
  const first = runner.runProveEligibleSimulator(contractModule, { witnesses: w1, trialByte: 1, minAge: 18n, maxAge: 80n });
  const w2 = runner.makeWitnesses({ age: 31, condition: true, medication: false });
  const second = runner.runProveEligibleSimulator(contractModule, {
    witnesses: w2,
    trialByte: 2,
    minAge: 18n,
    maxAge: 80n,
    priorState: first.context.currentQueryContext.state,
  });
  assert.equal(second.ledger.proven, '2');
  assert.equal(second.ledger.spent, '2');
});

// ---------------------------------------------------------------------------
// Ceremony probe against the real build (documents current state honestly)
// ---------------------------------------------------------------------------

test('ceremony probe reports not-complete: ISSUER_ID is the zero placeholder', () => {
  const probe = runner.probeCeremony(contractModule);
  assert.equal(probe.ceremonyComplete, false);
  assert.equal(probe.issuerIdHex, '00'.repeat(32));
  assert.match(probe.reason, /ceremony has not run/);
});

// ---------------------------------------------------------------------------
// Truth gate seam + delegation to C1's real interface + local fallback
// ---------------------------------------------------------------------------

test('loadTruthGate returns the landed C1 module with its real interface', async () => {
  const tg = await runner.loadTruthGate();
  assert.ok(tg, 'truth-gate.mjs should be on disk (C1 landed)');
  assert.equal(typeof tg.waitForLedgerEffect, 'function');
  assert.equal(typeof tg.assertClaimedSuccess, 'function');
  assert.equal(typeof tg.fetchContractState, 'function');
});

test('waitForLedgerEffect refuses without a tx id — no silent success', async () => {
  await assert.rejects(() => runner.waitForLedgerEffect({ txId: null, truthGate: null }), /TRUTH_GATE_NO_TX/);
});

test('waitForLedgerEffect delegates to the C1 gate interface when present', async () => {
  const ledgerFn = () => ({ proven: { toString: () => '6' } });
  let captured = null;
  const fakeGate = {
    fetchContractState: async () => ({ stateHex: '0x00' }),
    waitForLedgerEffect: async (args) => {
      captured = args;
      return { confirmed: true, txHash: args.txHash, observedAtBlock: 101, attempts: 2 };
    },
    assertClaimedSuccess: (r) => {
      if (!r || r.confirmed !== true) throw new Error('Success UI blocked');
      return r;
    },
  };
  const out = await runner.waitForLedgerEffect({
    txId: 'tx-x',
    contractAddress: '0xc',
    baselineProven: 5,
    deps: { ledgerFn },
    truthGate: fakeGate,
  });
  assert.equal(out.source, 'truth-gate.mjs');
  assert.equal(out.confirmed, true);
  assert.equal(out.observedAtBlock, 101);
  assert.equal(out.baselineProven, 5);
  // the predicate requires a STRICT rise over baseline: 6 > 5 true
  assert.equal(await captured.expectedPredicate({ stateHex: '0x00' }), true);
  assert.equal(captured.txHash, 'tx-x');
});

test('waitForLedgerEffect surfaces the C1 gate refusal — no silent success', async () => {
  const ledgerFn = () => ({ proven: { toString: () => '5' } });
  const fakeGate = {
    fetchContractState: async () => ({ stateHex: '0x00' }),
    waitForLedgerEffect: async (args) => ({ confirmed: false, reason: 'timeout', txHash: args.txHash }),
    assertClaimedSuccess: () => {
      throw new Error('Success UI blocked');
    },
  };
  await assert.rejects(
    () =>
      runner.waitForLedgerEffect({
        txId: 'tx-y',
        contractAddress: '0xc',
        baselineProven: 5,
        deps: { ledgerFn },
        truthGate: fakeGate,
      }),
    /Success UI blocked/,
  );
});

test('C1 delegation reads the baseline itself when not supplied', async () => {
  const ledgerFn = () => ({ proven: { toString: () => '7' } });
  const fakeGate = {
    fetchContractState: async () => ({ stateHex: '0x00' }),
    waitForLedgerEffect: async (args) => ({ confirmed: true, txHash: args.txHash, observedAtBlock: 3, attempts: 1 }),
    assertClaimedSuccess: (r) => r,
  };
  const out = await runner.waitForLedgerEffect({
    txId: 'tx-z',
    contractAddress: '0xc',
    deps: { ledgerFn },
    truthGate: fakeGate,
  });
  assert.equal(out.baselineProven, 7);
  assert.equal(out.source, 'truth-gate.mjs');
});

test('local fallback: confirms when the proven counter rises (fake deps)', async () => {
  let txCalls = 0;
  let ledgerCalls = 0;
  const deps = {
    getTransactionStatus: async () => {
      txCalls += 1;
      return txCalls >= 2 ? { status: 'confirmed', blockHeight: 4242 } : { status: 'pending' };
    },
    readPublicVerification: async () => {
      ledgerCalls += 1;
      return { proven: ledgerCalls >= 3 ? 6 : 5 };
    },
  };
  const out = await runner.waitForLedgerEffect({
    txId: 'tx-abc',
    contractAddress: '0xcontract',
    baselineProven: 5,
    deps,
    truthGate: null,
    timeoutMs: 5000,
    intervalMs: 10,
  });
  assert.equal(out.source, 'demo-runner-local-truth-gate');
  assert.equal(out.proven, 6);
  assert.equal(out.baselineProven, 5);
  assert.equal(out.txId, 'tx-abc');
  assert.ok(out.txAttempts >= 2);
});

test('local fallback: times out LOUDLY when the ledger never moves', async () => {
  const deps = {
    getTransactionStatus: async () => ({ status: 'confirmed', blockHeight: 1 }),
    readPublicVerification: async () => ({ proven: 5 }),
  };
  await assert.rejects(
    () =>
      runner.waitForLedgerEffect({
        txId: 'tx-stuck',
        contractAddress: '0xcontract',
        baselineProven: 5,
        deps,
        truthGate: null,
        timeoutMs: 120,
        intervalMs: 30,
      }),
    /TRUTH_GATE_TIMEOUT/,
  );
});

test('pollUntil resolves on success and reports attempts', async () => {
  let n = 0;
  const out = await runner.pollUntil({ check: async () => ++n >= 3, timeoutMs: 2000, intervalMs: 5, label: 'x' });
  assert.equal(out.attempts, 3);
});

test('pollUntil never resolves success on timeout', async () => {
  await assert.rejects(
    () => runner.pollUntil({ check: async () => false, timeoutMs: 80, intervalMs: 20, label: 'never' }),
    /TRUTH_GATE_TIMEOUT/,
  );
});
