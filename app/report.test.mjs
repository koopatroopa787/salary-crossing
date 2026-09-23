import test from "node:test";
import assert from "node:assert/strict";
import { calculateReport, normalizeInputs } from "./report.mjs";

const fx = { date: "2026-09-23", perEur: { EUR: 1, GBP: .87, AUD: 1.76, USD: 1.18, AED: 4.33 } };

test("approved values drive one, three and five-year scenarios", () => {
  const report = calculateReport({
    from: { code: "UK", gross: 75000, bonus: 5000, costs: { housing: 1800 } },
    to: { code: "AU", gross: 170000, bonus: 10000, costs: { housing: 3200 }, benefits: 3000 },
    oneTime: { allowance: 10000, movingCost: 4000 },
    assumptions: ["Bonus paid at target"], unsupported: ["Equity tax treatment"],
  }, fx);
  assert.deepEqual(report.scenarios.map((row) => row.years), [1, 3, 5]);
  assert.ok(report.to.retirementValue > 0, "Australian employer super is part of total value");
  assert.ok(report.sources.some((source) => source.url.includes("ato.gov.au")));
  assert.ok(report.warnings.some((warning) => warning.includes("Equity tax treatment")));
  assert.equal(report.inputs.assumptions[0], "Bonus paid at target");
  assert.match(report.calculationVersion, /^2026\./);
  assert.deepEqual(report.taxYears, { from: "2026/27", to: "2026-27" });
});

test("case inputs reject unsupported jurisdictions and excessive values", () => {
  assert.throws(() => normalizeInputs({ from: { code: "made-up" } }), /Unknown country/);
  const inputs = normalizeInputs({ from: { code: "UK", gross: 9e20 }, to: { code: "AE" } });
  assert.equal(inputs.from.gross, 100_000_000);
});
