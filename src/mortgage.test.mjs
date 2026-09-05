import { test } from "node:test";
import assert from "node:assert/strict";
import { affordability, monthlyPayment, ltvBand, MAX_LTV } from "./mortgage.mjs";

const close = (a, b, label, tol = 0.02) =>
  assert.ok(Math.abs(a - b) < tol, `${label}: got ${a.toFixed(2)}, expected ${b.toFixed(2)}`);

test("repayment formula matches published figures", () => {
  // £200,000 over 25 years at 5% is the standard worked example.
  close(monthlyPayment(200000, 5, 25), 1169.18, "200k @ 5% / 25y");
  close(monthlyPayment(150000, 4, 30), 716.12, "150k @ 4% / 30y");
  // A longer term lowers the payment and raises the total.
  assert.ok(monthlyPayment(200000, 5, 35) < monthlyPayment(200000, 5, 25));
});

test("zero interest is just the principal split over the term", () => {
  close(monthlyPayment(120000, 0, 25), 400, "0% / 25y");
});

test("income multiple caps the loan", () => {
  const r = affordability({ income1: 50000, deposit: 200000, rate: 4.5 });
  close(r.loan, 225000, "4.5 x 50,000");
  assert.equal(r.limitedBy, "income");
});

test("a thin deposit caps it first, at 95% LTV", () => {
  const r = affordability({ income1: 60000, deposit: 10000 });
  assert.equal(r.limitedBy, "deposit");
  close(r.loan, 190000, "10k deposit at 95% LTV");
  close(r.price, 200000, "price");
  close(r.ltv, MAX_LTV, "hits the LTV ceiling", 0.0001);
});

test("existing debts reduce borrowing by the multiple", () => {
  const clean = affordability({ income1: 40000, deposit: 500000 });
  const indebted = affordability({ income1: 40000, deposit: 500000, monthlyDebts: 300 });
  close(clean.loan - indebted.loan, 300 * 12 * 4.5, "£300/month costs 4.5x its annual cost");
});

test("two earners keep more than one earner on the same household income", () => {
  const couple = affordability({ income1: 30000, income2: 30000, deposit: 500000 });
  const single = affordability({ income1: 60000, deposit: 500000 });
  close(couple.loan, single.loan, "same borrowing: the multiple is on gross");
  assert.ok(couple.netMonthly > single.netMonthly,
    "but two personal allowances and two NI bands mean more take-home");
});

test("the stress test is harsher than the offered rate", () => {
  const r = affordability({ income1: 50000, deposit: 100000, rate: 4.5 });
  assert.ok(r.stressed > r.payment);
  close(r.stressed, r.payment * (r.stressed / r.payment), "consistent");
  assert.ok(r.stressedShare > r.share);
});

test("LTV bands", () => {
  assert.equal(ltvBand(0.55).label, "60% or less");
  assert.equal(ltvBand(0.75).label, "75%");
  assert.equal(ltvBand(0.9).label, "90%");
  assert.equal(ltvBand(0.95).label, "95%");
});

test("verdict degrades as the payment eats the pay packet", () => {
  // Deposit-limited, so the loan is small next to the income.
  const comfy = affordability({ income1: 90000, deposit: 10000, rate: 4.5 });
  assert.equal(comfy.verdict.level, "good");

  const stretched = affordability({ income1: 30000, deposit: 15000, rate: 4.5 });
  assert.ok(["tight", "over"].includes(stretched.verdict.level),
    `expected a warning, got ${stretched.verdict.level}`);
});

test("borrowing the full 4.5x is never comfortable, at any income", () => {
  // This is the finding the page exists to show. The regulatory ceiling is
  // not an affordability target: at 4.5x the payment takes ~43% of net pay
  // before the stress test, at every salary from £25k to £150k.
  for (const income of [25000, 40000, 60000, 90000, 150000]) {
    const r = affordability({ income1: income, deposit: 10_000_000, rate: 4.5 });
    assert.equal(r.limitedBy, "income");
    assert.ok(r.share > 0.30,
      `£${income}: payment was only ${(r.share * 100).toFixed(0)}% of net pay`);
    assert.notEqual(r.verdict.level, "good",
      `£${income} maxed out should not read as comfortable`);
  }
});

test("no income, no deposit, no crash", () => {
  const r = affordability({});
  assert.equal(r.loan, 0);
  assert.equal(r.payment, 0);
  assert.equal(r.verdict.level, "none");
  assert.ok(Number.isFinite(r.ltv));
});
