/**
 * Shared machinery for every country module.
 *
 * The contract each country implements:
 *
 *   meta      { code, name, adjective, currency, symbol, cities, year, sources }
 *   netPay(gross, opts) -> { gross, deductions[], net, effectiveRate, notes[] }
 *
 * Deductions are itemised rather than summed because the interesting part of
 * a cross-border comparison is usually *what* is taken, not how much: the UK
 * takes National Insurance, Australia takes a Medicare levy, the US takes
 * FICA, and Dubai takes nothing. A single "tax" number hides the story.
 */

/** Walk a progressive band table. Bands are cumulative upper bounds. */
export function bands(amount, table) {
  let total = 0;
  let floor = 0;
  for (const b of table) {
    const ceiling = b.upTo ?? Infinity;
    const inBand = Math.max(0, Math.min(amount, ceiling) - floor);
    if (inBand > 0) total += inBand * b.rate;
    floor = ceiling;
    if (amount <= ceiling) break;
  }
  return total;
}

/** Rate on the next unit of currency, by differencing the real function. */
export function marginalOf(netPay, gross, opts, step = 100) {
  const a = netPay(gross, opts);
  const b = netPay(gross + step, opts);
  return 1 - (b.net - a.net) / step;
}

export function summarise(gross, deductions, notes = []) {
  const taken = deductions.reduce((sum, d) => sum + d.amount, 0);
  return {
    gross,
    deductions,
    totalDeductions: taken,
    net: gross - taken,
    effectiveRate: gross > 0 ? taken / gross : 0,
    notes,
  };
}
