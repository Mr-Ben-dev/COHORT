// TESTS/attestation-counter.test.mjs — SQUAD C4
// Tests the pure formatting/badge/fetch logic of
// web/src/components/attestation-counter.tsx by extracting the marked
// plain-JS logic block from that file verbatim (no copy-paste drift)
// and evaluating it against a mocked fetch.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const TSX = path.join(here, "..", "web", "src", "components", "attestation-counter.tsx");

const START = "// __COUNTER_LOGIC_START__";
const END = "// __COUNTER_LOGIC_END__";

function loadLogic() {
  const src = readFileSync(TSX, "utf8");
  const i = src.indexOf(START);
  const j = src.indexOf(END);
  assert.ok(i !== -1 && j !== -1 && j > i, "pure-logic markers missing from attestation-counter.tsx");
  const block = src.slice(i + START.length, j);
  // The block must be dependency-free plain JS: no imports, no JSX.
  assert.ok(!/import\s+/.test(block), "logic block must not contain imports");
  const factory = new Function(
    `${block}; return { parseCounterPayload, formatCounter, counterBadge, loadAttestationCounter };`
  );
  return factory();
}

const { parseCounterPayload, formatCounter, counterBadge, loadAttestationCounter } = loadLogic();

/** Mock fetch resolving to { ok, json() } for a given payload. */
function mockFetch(payload, { ok = true } = {}) {
  const calls = [];
  const fn = async (url, init) => {
    calls.push({ url, init });
    return { ok, json: async () => payload };
  };
  fn.calls = calls;
  return fn;
}

describe("parseCounterPayload", () => {
  it("live source + number -> live with floored count", () => {
    assert.deepEqual(parseCounterPayload({ attestationsVerified: 42, source: "live" }), {
      status: "live",
      count: 42,
    });
    assert.deepEqual(parseCounterPayload({ attestationsVerified: 7.9, source: "live" }), {
      status: "live",
      count: 7,
    });
  });

  it("zero is a real count, not 'not deployed'", () => {
    assert.deepEqual(parseCounterPayload({ attestationsVerified: 0, source: "live" }), {
      status: "live",
      count: 0,
    });
  });

  it("null count -> not-deployed, never a number", () => {
    assert.deepEqual(parseCounterPayload({ attestationsVerified: null, source: "not-deployed" }), {
      status: "not-deployed",
      count: null,
    });
    // Even without an explicit source label, a null count is "not deployed yet".
    assert.deepEqual(parseCounterPayload({ attestationsVerified: null }), {
      status: "not-deployed",
      count: null,
    });
  });

  it("live source with non-numeric count is an unexpected response", () => {
    assert.throws(
      () => parseCounterPayload({ attestationsVerified: "lots", source: "live" }),
      /unexpected response/
    );
    assert.throws(
      () => parseCounterPayload({ attestationsVerified: -3, source: "live" }),
      /unexpected response/
    );
  });

  it("garbage payloads throw", () => {
    for (const bad of [null, undefined, "x", 42, [], [1]]) {
      assert.throws(() => parseCounterPayload(bad), /unexpected response/, JSON.stringify(bad));
    }
  });
});

describe("formatCounter", () => {
  it("groups thousands", () => {
    assert.equal(formatCounter(0), "0");
    assert.equal(formatCounter(42), "42");
    assert.equal(formatCounter(1234567), "1,234,567");
  });

  it("never renders a placeholder number for invalid input", () => {
    assert.equal(formatCounter(null), "—");
    assert.equal(formatCounter(undefined), "—");
    assert.equal(formatCounter(NaN), "—");
  });
});

describe("counterBadge", () => {
  it("live -> green LIVE ON-CHAIN", () => {
    assert.deepEqual(counterBadge("live"), { label: "LIVE ON-CHAIN", tone: "live" });
  });

  it("pending -> amber NOT DEPLOYED YET with the Wave-3 deploy copy", () => {
    const badge = counterBadge("pending");
    assert.equal(badge.tone, "pending");
    assert.ok(badge.label.includes("NOT DEPLOYED YET"));
    assert.ok(badge.label.includes("Wave-3"));
  });
});

describe("loadAttestationCounter (mocked fetch)", () => {
  it("uses the same-origin relative path, no wallet, no absolute URL", async () => {
    const fetch = mockFetch({ attestationsVerified: 5, source: "live" });
    const result = await loadAttestationCounter(fetch);
    assert.equal(fetch.calls.length, 1);
    assert.equal(fetch.calls[0].url, "/api/attestation-counters");
    assert.ok(!fetch.calls[0].url.startsWith("http"), "must stay same-origin");
    assert.deepEqual(result, { status: "live", count: 5 });
  });

  it("non-2xx rejects with the honest API error", async () => {
    const fetch = mockFetch(null, { ok: false });
    await assert.rejects(() => loadAttestationCounter(fetch), /couldn't reach the counter API/);
  });

  it("network failure rejects", async () => {
    const failing = async () => {
      throw new Error("boom");
    };
    await assert.rejects(() => loadAttestationCounter(failing));
  });

  it("not-deployed payload resolves with count null (UI renders no number)", async () => {
    const fetch = mockFetch({ attestationsVerified: null, source: "not-deployed" });
    const result = await loadAttestationCounter(fetch);
    assert.equal(result.status, "not-deployed");
    assert.equal(result.count, null);
  });

  it("malformed payload rejects instead of rendering a guessed number", async () => {
    const fetch = mockFetch({ attestationsVerified: "lots", source: "live" });
    await assert.rejects(() => loadAttestationCounter(fetch), /unexpected response/);
  });
});
