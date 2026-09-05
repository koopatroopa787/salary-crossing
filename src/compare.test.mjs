import { test } from "node:test";
import assert from "node:assert/strict";
import { compare, equivalentGross, country, CODES } from "./compare.mjs";
import * as us from "./countries/us.mjs";
import * as au from "./countries/au.mjs";

const close = (a, b, label, tol = 1) =>
  assert.ok(Math.abs(a - b) < tol, `${label}: got ${a.toFixed(2)}, expected ${b.toFixed(2)}`);

test("every country module honours the contract", () => {
  for (const code of CODES) {
    const c = country(code);
    assert.ok(c.meta.code && c.meta.currency && c.meta.symbol, `${code} metadata`);
    assert.ok(c.meta.sources.length > 0, `${code} must cite a source`);
    const r = c.netPay(60000);
    assert.equal(r.net, r.gross - r.totalDeductions, `${code} arithmetic`);
    assert.ok(r.net <= r.gross && r.net >= 0, `${code} plausible net`);
    for (const d of r.deductions) {
      assert.ok(d.amount >= 0 && Number.isFinite(d.amount), `${code}: ${d.name}`);
    }
  }
});

test("net rises with gross everywhere — bisection depends on it", () => {
  for (const code of CODES) {
    const c = country(code);
    let previous = -1;
    for (let g = 0; g <= 400000; g += 2000) {
      const { net } = c.netPay(g);
      assert.ok(net >= previous, `${code}: net fell at ${g}`);
      previous = net;
    }
  }
});

test("Dubai takes nothing", () => {
  const r = country("AE").netPay(120000);
  assert.equal(r.net, 120000);
  assert.equal(r.totalDeductions, 0);
  assert.equal(r.effectiveRate, 0);
});

test("US federal tax at published figures", () => {
  // $100,000 gross, single, standard deduction $16,100 -> taxable $83,900.
  // 10% x 12,400 = 1,240; 12% x 38,000 = 4,560; 22% x 33,500 = 7,370.
  const r = us.netPay(100000);
  const federal = r.deductions.find((d) => d.name === "Federal income tax").amount;
  close(federal, 1240 + 4560 + 7370, "federal on $100k");

  const ss = r.deductions.find((d) => d.name === "Social Security").amount;
  close(ss, 100000 * 0.062, "social security");

  // Above the wage base the Social Security contribution stops rising.
  const high = us.netPay(300000);
  close(high.deductions.find((d) => d.name === "Social Security").amount,
    us.SOCIAL_SECURITY_WAGE_BASE * 0.062, "capped at the wage base");

  // The extra 0.9% Medicare only bites above $200,000.
  close(high.deductions.find((d) => d.name === "Medicare").amount,
    300000 * 0.0145 + 100000 * 0.009, "additional medicare");
});

test("US refuses to guess at a state it has not modelled", () => {
  // Illinois and Oregon have real income taxes that nobody has encoded here,
  // so asking for them is an error rather than a too-low answer.
  assert.throws(() => us.netPay(100000, { state: "IL" }), /not modelled/);
  assert.throws(() => us.netPay(100000, { state: "OR" }), /not modelled/);
  for (const s of ["NY", "CA", "TX"]) {
    assert.doesNotThrow(() => us.netPay(100000, { state: s }), s);
  }
});

test("Australian tax at published figures", () => {
  // A$100,000: 15% x 26,800 = 4,020; 30% x 55,000 = 16,500. Plus 2% levy.
  const r = au.netPay(100000);
  close(r.deductions.find((d) => d.name === "Income tax").amount, 4020 + 16500, "AU tax on 100k");
  close(r.deductions.find((d) => d.name === "Medicare levy").amount, 2000, "levy");
  // Under the tax-free threshold, nothing at all.
  assert.equal(au.netPay(18000).totalDeductions, 0);
});

test("equivalent gross round-trips", () => {
  // Whatever you need over there, converting it back must land where you began.
  const rate = 4.7;   // GBP -> AED, illustrative
  const needed = equivalentGross(75000, "UK", "AE", rate);
  const backAgain = equivalentGross(needed, "AE", "UK", 1 / rate);
  close(backAgain, 75000, "round trip", 5);
});

test("Dubai needs less gross than London for the same net", () => {
  const rate = 4.7;
  const c = compare({ gross: 75000, from: "UK", to: "AE", rate });
  // £75,000 leaves about £53,000; at 4.7 that is ~AED 250,000, and since
  // nothing is deducted you need exactly that much gross.
  close(c.to.gross, c.from.net * rate, "no tax means net equals gross", 1);
  assert.ok(c.to.gross < c.from.gross * rate,
    "should need less gross in a no-tax country");
  assert.ok(c.likeForLike.betterOff, "the same salary goes further untaxed");
});

test("the comparison is self-consistent", () => {
  for (const [from, to] of [["UK", "USNY"], ["UK", "AU"], ["USCA", "UK"], ["AU", "AE"]]) {
    const c = compare({ gross: 90000, from, to, rate: 1.3 });
    close(c.to.net, c.from.net * 1.3, `${from}->${to}: nets must match`, 2);
    assert.ok(c.to.gross > 0 && Number.isFinite(c.to.gross), `${from}->${to} finite`);
  }
});

test("a zero salary does not break anything", () => {
  const c = compare({ gross: 0, from: "UK", to: "USNY", rate: 1.3 });
  assert.equal(c.from.net, 0);
  close(c.to.gross, 0, "nothing needed", 1);
});

test("New York carries state and city tax; Texas carries neither", () => {
  const ny = country("USNY").netPay(150000);
  const tx = country("USTX").netPay(150000);
  const names = ny.deductions.map((d) => d.name);
  assert.ok(names.includes("New York State tax"), "state tax");
  assert.ok(names.includes("New York City tax"), "city tax");
  assert.equal(tx.deductions.length, 3, "Texas is federal + FICA only");
  assert.ok(ny.net < tx.net - 8000,
    `NYC should cost well over $8k more than Austin; gap was ${(tx.net - ny.net).toFixed(0)}`);
});

test("New York's recapture makes its schedule non-monotonic on purpose", () => {
  // Between $157,650 and $215,400 New York's published rate drops to 6.40%
  // because the recapture has already been applied in the band below. Tax
  // must still rise with income even though the rate falls.
  let previous = -1;
  for (let g = 100000; g <= 300000; g += 2500) {
    const t = country("USNY").netPay(g).totalDeductions;
    assert.ok(t > previous, `total tax fell at $${g}`);
    previous = t;
  }
});

test("California charges SDI on every dollar", () => {
  const low = country("USCA").netPay(50000);
  const high = country("USCA").netPay(500000);
  const sdi = (r) => r.deductions.find((d) => d.name === "California SDI").amount;
  close(sdi(low), 50000 * 0.013, "SDI at 50k");
  close(sdi(high), 500000 * 0.013, "SDI at 500k — no cap since 2024");
});
