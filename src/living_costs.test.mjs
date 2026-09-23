import { test } from "node:test";
import assert from "node:assert/strict";
import { compare } from "./compare.mjs";
import { cleanCosts, monthlyCosts, matchAfterCosts, comparisonHash, costsFromParams } from "./living_costs.mjs";

const close = (a, b, label, tolerance = 1) =>
  assert.ok(Math.abs(a - b) < tolerance, `${label}: got ${a.toFixed(2)}, expected ${b.toFixed(2)}`);

test("living-cost inputs reject negative and non-numeric values", () => {
  assert.deepEqual(cleanCosts({ housing: -1, healthcare: "bad", transport: 250 }), {
    housing: 0, healthcare: 0, childcare: 0, transport: 250, other: 0,
  });
  assert.equal(monthlyCosts({ housing: 1500, childcare: 700, transport: 200 }), 2400);
});

test("zero costs produce the existing take-home match", () => {
  const taxOnly = compare({ gross: 75000, from: "UK", to: "AE", rate: 4.7 });
  const withCosts = matchAfterCosts({ gross: 75000, from: "UK", to: "AE", rate: 4.7 });
  close(withCosts.gross, taxOnly.to.gross, "same gross when there are no costs");
});

test("the required salary matches disposable income after user costs", () => {
  const result = matchAfterCosts({
    gross: 75000, from: "UK", to: "AU", rate: 1.95,
    fromCosts: { housing: 1800, transport: 200 },
    toCosts: { housing: 3200, healthcare: 150, transport: 300 },
  });
  close(result.destinationDisposable, result.sourceDisposable * 1.95, "disposable income", 2);
  assert.ok(result.gross > 0);
  assert.equal(result.sourceCostsAffordable, true);
});

test("costs above current take-home are identified instead of presented as a match", () => {
  const result = matchAfterCosts({
    gross: 30000, from: "UK", to: "AE", rate: 4.7,
    fromCosts: { housing: 5000 },
  });
  assert.equal(result.sourceCostsAffordable, false);
  assert.ok(result.sourceDisposable < 0);
});

test("shared links round-trip the visitor's non-zero costs", () => {
  const hash = comparisonHash({
    from: "UK", to: "USNY", gross: 90000,
    fromCosts: { housing: 2100, other: 450 },
    toCosts: { housing: 4200, healthcare: 600 },
  });
  const params = new URLSearchParams(hash.slice(1));
  assert.equal(params.get("gross"), "90000");
  assert.equal(params.get("fh"), "2100");
  assert.equal(params.has("fc"), false);
  assert.deepEqual(costsFromParams(params, "t"), {
    housing: 4200, healthcare: 600, childcare: 0, transport: 0, other: 0,
  });
});
