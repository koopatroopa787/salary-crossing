/**
 * Compute the findings before writing a word about them.
 *
 * Everything printed here is derived from the same engine the site runs on,
 * so an article can quote it and a reader can reproduce it.
 */
import { takeHome } from "./src/tax.mjs";
import { affordability } from "./src/mortgage.mjs";
import { country } from "./src/compare.mjs";

const gbp = (n) => "£" + Math.round(n).toLocaleString("en-GB");
const usd = (n) => "$" + Math.round(n).toLocaleString("en-US");

console.log("=== 1. What £1,000 more actually leaves you, by salary ===");
const raiseAt = (s) => takeHome({ salary: s + 1000 }).net - takeHome({ salary: s }).net;
let worst = { keep: Infinity };
for (let s = 20000; s <= 160000; s += 1000) {
  const keep = raiseAt(s);
  if (keep < worst.keep) worst = { salary: s, keep };
}
console.log(`  worst place to get a raise: ${gbp(worst.salary)} -> keeps ${gbp(worst.keep)} of ${gbp(1000)}`);
for (const s of [30000, 50000, 60000, 99000, 100000, 110000, 125000, 126000, 150000]) {
  const k = raiseAt(s);
  console.log(`  ${gbp(s).padStart(9)}  keeps ${gbp(k).padStart(6)}  (${(k / 10).toFixed(0)}p in the pound)`);
}

console.log("\n=== 2. The 60% band: where it starts and ends ===");
let bandStart = null, bandEnd = null;
for (let s = 95000; s <= 130000; s += 100) {
  const m = takeHome({ salary: s }).marginalRate;
  if (m >= 0.55 && bandStart === null) bandStart = s;
  if (bandStart !== null && m < 0.55 && bandEnd === null) bandEnd = s;
}
console.log(`  runs ${gbp(bandStart)} to ${gbp(bandEnd ?? 125140)}`);
const a = takeHome({ salary: 100000 }).net, b = takeHome({ salary: 125140 }).net;
console.log(`  ${gbp(100000)} nets ${gbp(a)}; ${gbp(125140)} nets ${gbp(b)}`);
console.log(`  so ${gbp(25140)} more gross buys ${gbp(b - a)} more net`);

console.log("\n=== 3. Scotland vs England: where the crossover is ===");
let crossover = null;
for (let s = 12000; s <= 200000; s += 100) {
  const e = takeHome({ salary: s, region: "uk" }).net;
  const sc = takeHome({ salary: s, region: "scotland" }).net;
  if (sc < e && crossover === null) crossover = s;
}
console.log(`  Scotland first costs more at ${gbp(crossover)}`);
for (const s of [20000, 25000, 28000, 30000, 50000, 75000, 100000, 150000]) {
  const e = takeHome({ salary: s, region: "uk" }).net;
  const sc = takeHome({ salary: s, region: "scotland" }).net;
  const d = sc - e;
  console.log(`  ${gbp(s).padStart(9)}  ${d >= 0 ? "+" : ""}${gbp(d).padStart(7)} in Scotland`);
}

console.log("\n=== 4. Two earners vs one, same household income ===");
for (const total of [60000, 80000, 100000, 150000]) {
  const one = takeHome({ salary: total }).net;
  const two = takeHome({ salary: total / 2 }).net * 2;
  console.log(`  ${gbp(total).padStart(9)}  one earner ${gbp(one)}  |  split evenly ${gbp(two)}  |  gap ${gbp(two - one)}`);
}

console.log("\n=== 5. Maxing 4.5x income: payment as share of take-home ===");
for (const inc of [30000, 50000, 75000, 100000, 150000]) {
  const r = affordability({ income1: inc, deposit: 10_000_000, rate: 4.5 });
  console.log(`  ${gbp(inc).padStart(9)}  borrow ${gbp(r.loan).padStart(10)}  pay ${gbp(r.payment)}/m = ${(r.share * 100).toFixed(0)}% of net (stressed ${(r.stressedShare * 100).toFixed(0)}%)`);
}

console.log("\n=== 6. New York vs Austin: the pay cut you can afford ===");
for (const s of [100000, 150000, 200000, 300000]) {
  const ny = country("USNY").netPay(s).net;
  // What Austin gross gives the same net?
  let lo = 0, hi = s * 2;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (country("USTX").netPay(mid).net < ny) lo = mid; else hi = mid;
  }
  const tx = (lo + hi) / 2;
  console.log(`  NYC ${usd(s).padStart(9)} (net ${usd(ny)})  =  Austin ${usd(tx).padStart(9)}  -> can take a ${usd(s - tx)} cut`);
}
