/**
 * Exchange rates, fetched once at build time.
 *
 * Source is the European Central Bank's daily reference rates via Frankfurter
 * — free, no key, no rate limit, and a citable authority rather than an
 * anonymous aggregator.
 *
 * The ECB does not publish AED, because the dirham is pegged to the dollar at
 * a fixed 3.6725 and has been since 1997. Deriving it through USD is the
 * correct thing to do and is stated on the page rather than hidden.
 *
 * A build must never fail because a currency API was down, so the last good
 * result is cached to disk and reused. A rate a day old is fine for "what
 * salary do I need in Dubai"; a broken build is not.
 */
import { readFile, writeFile } from "node:fs/promises";

const ECB = "https://api.frankfurter.app/latest";
const CACHE = new URL("../fx-cache.json", import.meta.url);

/** Fixed peg, not a market rate. */
export const AED_PER_USD = 3.6725;

export const CURRENCIES = ["GBP", "USD", "AUD"];

export async function fetchRates() {
  try {
    const res = await fetch(`${ECB}?from=EUR&to=${CURRENCIES.join(",")}`, {
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`ECB returned ${res.status}`);
    const body = await res.json();

    const perEur = { EUR: 1, ...body.rates };
    perEur.AED = perEur.USD * AED_PER_USD;

    const data = { date: body.date, perEur, fetchedAt: new Date().toISOString() };
    await writeFile(CACHE, JSON.stringify(data, null, 1));
    return { ...data, stale: false };
  } catch (err) {
    const cached = JSON.parse(await readFile(CACHE, "utf8"));
    console.warn(`  fx: live fetch failed (${err.message}), using ${cached.date}`);
    return { ...cached, stale: true };
  }
}

/** Units of `to` per one unit of `from`. */
export function rate(perEur, from, to) {
  if (!perEur[from] || !perEur[to]) throw new Error(`No rate for ${from}->${to}`);
  return perEur[to] / perEur[from];
}
