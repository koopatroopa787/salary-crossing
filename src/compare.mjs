/**
 * Cross-border comparison.
 *
 * The question people actually type is not "what is the tax rate in Dubai",
 * it is "I earn £75,000 in London, what do I need there to be no worse off".
 * That is an inverse problem: find the gross in country B whose net, converted
 * back, matches the net in country A.
 *
 * Solved by bisection over the country's own netPay function rather than by
 * inverting each tax code algebraically. One method works for every country,
 * including ones with tapers and cliff edges, and it cannot drift away from
 * the forward calculation because it *is* the forward calculation.
 */
import * as uk from "./countries/uk.mjs";
import * as ae from "./countries/ae.mjs";
import * as us from "./countries/us.mjs";
import * as au from "./countries/au.mjs";
import { forState } from "./countries/us.mjs";

// "The United States" is not a tax jurisdiction anyone actually moves to —
// people move to New York or Austin, and those differ by tens of thousands.
// Each US destination is a concrete state so the page can name a real place.
export const COUNTRIES = {
  UK: uk,
  AE: ae,
  AU: au,
  USNY: forState("NY"),
  USCA: forState("CA"),
  USTX: forState("TX"),
};
export const CODES = Object.keys(COUNTRIES);

export function country(code) {
  const c = COUNTRIES[String(code).toUpperCase()];
  if (!c) throw new Error(`Unknown country: ${code}. Known: ${CODES.join(", ")}`);
  return c;
}

/**
 * Gross salary in `toCode` that leaves the same net as `gross` in `fromCode`,
 * once converted at `rate` (units of the destination currency per unit of the
 * source currency).
 */
export function equivalentGross(gross, fromCode, toCode, rate, opts = {}) {
  const from = country(fromCode);
  const to = country(toCode);

  const targetNet = from.netPay(gross, opts.from ?? {}).net * rate;

  // Net is monotonically increasing in gross in every country here — the UK
  // suite proves it explicitly — so bisection is guaranteed to converge.
  let low = 0;
  let high = Math.max(targetNet * 4, 1000);
  for (let i = 0; i < 200 && to.netPay(high, opts.to ?? {}).net < targetNet; i++) high *= 2;

  for (let i = 0; i < 60; i++) {
    const mid = (low + high) / 2;
    if (to.netPay(mid, opts.to ?? {}).net < targetNet) low = mid;
    else high = mid;
  }
  return (low + high) / 2;
}

/** Everything a comparison page needs, in one object. */
export function compare({ gross, from: fromCode, to: toCode, rate, fromOpts = {}, toOpts = {} }) {
  const from = country(fromCode);
  const to = country(toCode);

  const here = from.netPay(gross, fromOpts);
  const needed = equivalentGross(gross, fromCode, toCode, rate, { from: fromOpts, to: toOpts });
  const there = to.netPay(needed, toOpts);

  // The like-for-like case: the same gross, converted, taxed over there.
  const sameGross = to.netPay(gross * rate, toOpts);
  const sameGrossNetInSource = sameGross.net / rate;

  return {
    from: { ...from.meta, gross, ...here },
    to: { ...to.meta, gross: needed, ...there },
    rate,
    /** What the identical salary would leave you if you simply moved. */
    likeForLike: {
      gross: gross * rate,
      net: sameGross.net,
      netInSourceCurrency: sameGrossNetInSource,
      difference: sameGrossNetInSource - here.net,
      betterOff: sameGrossNetInSource > here.net,
    },
    /** Positive means the destination taxes less at this income. */
    effectiveRateGap: here.effectiveRate - there.effectiveRate,
  };
}

export const fmt = (amount, meta) =>
  meta.symbol + Math.round(amount).toLocaleString(meta.locale ?? "en-GB");
