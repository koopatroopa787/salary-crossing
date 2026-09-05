/**
 * Run with: node --test src/
 *
 * The rUK figures below are the published 2026/27 answers, not numbers this
 * code produced. If a rate changes in rates.mjs and these still pass, the
 * change was wrong.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { takeHome, personalAllowance, studentLoan } from "./tax.mjs";

const close = (actual, expected, label, tol = 0.01) =>
  assert.ok(Math.abs(actual - expected) < tol,
    `${label}: got ${actual.toFixed(2)}, expected ${expected.toFixed(2)}`);

test("personal allowance taper", () => {
  assert.equal(personalAllowance(50000), 12570);
  assert.equal(personalAllowance(100000), 12570);
  assert.equal(personalAllowance(110000), 7570);    // lost £5,000
  assert.equal(personalAllowance(125140), 0);
  assert.equal(personalAllowance(200000), 0);
});

test("rest of UK, no pension, no student loan", () => {
  const cases = [
    // salary,   income tax,  NI,        net
    [12570,      0,           0,         12570],
    [30000,      3486,        1394.40,   25119.60],
    [50270,      7540,        3016,      39714],
    [100000,     27432,       4010.60,   68557.40],
    [125140,     42516,       4513.40,   78110.60],
    [150000,     53703,       5010.60,   91286.40],
  ];
  for (const [salary, tax, ni, net] of cases) {
    const r = takeHome({ salary });
    close(r.incomeTax, tax, `tax on ${salary}`);
    close(r.nationalInsurance, ni, `NI on ${salary}`);
    close(r.net, net, `net on ${salary}`);
  }
});

test("the 60% trap is real and we show it", () => {
  // Between £100k and £125,140 each extra £1 costs 40p tax plus 40p on the
  // 50p of allowance it removes, plus 2p NI.
  const r = takeHome({ salary: 110000 });
  close(r.allowance, 7570, "tapered allowance");
  close(r.incomeTax, 33432, "tax at 110k");
  close(r.marginalRate, 0.62, "marginal rate inside the taper", 0.001);

  // Outside the taper it drops back.
  close(takeHome({ salary: 60000 }).marginalRate, 0.42, "higher-rate marginal");
  close(takeHome({ salary: 30000 }).marginalRate, 0.28, "basic-rate marginal");
});

test("Scotland pays slightly less at £30k and more at £60k", () => {
  const scot30 = takeHome({ salary: 30000, region: "scotland" });
  const uk30 = takeHome({ salary: 30000 });
  close(scot30.incomeTax, 3451.07, "Scottish tax at 30k");
  assert.ok(scot30.net > uk30.net, "Scotland should be cheaper at £30k");

  const scot60 = takeHome({ salary: 60000, region: "scotland" });
  const uk60 = takeHome({ salary: 60000 });
  assert.ok(scot60.net < uk60.net, "Scotland should be dearer at £60k");
});

test("salary sacrifice beats a net-pay scheme by the NI on the contribution", () => {
  const sacrifice = takeHome({ salary: 50000, pensionPct: 10, pensionType: "salary-sacrifice" });
  const netPay = takeHome({ salary: 50000, pensionPct: 10, pensionType: "net-pay" });

  close(sacrifice.pension, 5000, "contribution");
  close(netPay.pension, 5000, "contribution");
  close(sacrifice.incomeTax, netPay.incomeTax, "same income tax either way");
  close(sacrifice.net - netPay.net, 400, "8% NI saved on £5,000");
  close(sacrifice.net, 35919.60, "sacrifice net");
});

test("student loans round down, per plan", () => {
  close(studentLoan(35000, ["plan2"]).total, 505, "plan 2 at 35k");   // 5,615 x 9%
  close(studentLoan(29385, ["plan2"]).total, 0, "exactly at threshold");
  close(studentLoan(20000, ["plan2"]).total, 0, "below threshold");
  close(studentLoan(35000, ["plan2", "pg"]).total, 505 + 840, "plan 2 + postgrad");
});

test("salary sacrifice also cuts the student loan", () => {
  const sacrifice = takeHome({
    salary: 40000, pensionPct: 10, pensionType: "salary-sacrifice", studentPlans: ["plan2"],
  });
  const netPay = takeHome({
    salary: 40000, pensionPct: 10, pensionType: "net-pay", studentPlans: ["plan2"],
  });
  // Sacrifice is assessed on £36,000, net pay on £40,000.
  close(sacrifice.studentLoan, Math.floor((36000 - 29385) * 0.09), "on sacrificed pay");
  close(netPay.studentLoan, Math.floor((40000 - 29385) * 0.09), "on full pay");
});

test("no cliff edges: earning more never leaves you worse off", () => {
  for (const region of ["uk", "scotland"]) {
    let previous = -1;
    for (let salary = 0; salary <= 200000; salary += 250) {
      const { net } = takeHome({ salary, region, studentPlans: ["plan2", "pg"] });
      assert.ok(net >= previous, `${region}: net fell at £${salary}`);
      previous = net;
    }
  }
});

test("periods divide the annual figure", () => {
  const r = takeHome({ salary: 45000 });
  close(r.monthly * 12, r.net, "monthly");
  close(r.weekly * 52, r.net, "weekly");
});
