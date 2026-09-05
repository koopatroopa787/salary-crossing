/**
 * Australia — resident individual, 2026-27 income year (1 July 2026 to 30 June 2027).
 *
 * The 16% rate on the second bracket dropped to 15% from 1 July 2026 under the
 * Treasury Laws Amendment (More Cost of Living Relief) Act 2025, and drops
 * again to 14% from 1 July 2027 — so this file has a known expiry date.
 *
 * Superannuation is deliberately absent from the deductions. It is paid by the
 * employer on top of salary, not taken out of it, so subtracting it would
 * understate Australian pay against every other country here.
 *
 * Verified 2026-09 against:
 *   https://www.ato.gov.au/tax-rates-and-codes/tax-rates-australian-residents
 *   https://www.ato.gov.au/about-ato/new-legislation/in-detail/individuals/personal-income-tax-new-tax-cuts-for-every-australian-taxpayer
 */
import { bands, summarise } from "./common.mjs";

export const TAX_FREE_THRESHOLD = 18200;

export const RESIDENT_BANDS = [
  { rate: 0.00, upTo: 18200 },
  { rate: 0.15, upTo: 45000 },
  { rate: 0.30, upTo: 135000 },
  { rate: 0.37, upTo: 190000 },
  { rate: 0.45 },
];

export const MEDICARE_LEVY = 0.02;
/** Below this the levy phases in rather than applying in full. */
export const MEDICARE_LOWER_THRESHOLD = 27222;

export const meta = {
  code: "AU", name: "Australia", theName: "Australia", adjective: "Australian",
  currency: "AUD", symbol: "A$", locale: "en-AU",
  cities: ["Sydney", "Melbourne", "Brisbane", "Perth"],
  year: "2026-27",
  sources: [
    { label: "ATO — resident tax rates", url: "https://www.ato.gov.au/tax-rates-and-codes/tax-rates-australian-residents" },
    { label: "ATO — Medicare levy", url: "https://www.ato.gov.au/individuals-and-families/medicare-and-private-health-insurance/medicare-levy" },
  ],
};

export function netPay(gross) {
  const tax = bands(gross, RESIDENT_BANDS);
  // The levy is not charged at all on very low incomes; above the phase-in it
  // is a flat 2%. The phase-in itself is ignored, which only affects incomes
  // under about A$34,000 and errs slightly high there.
  const levy = gross > MEDICARE_LOWER_THRESHOLD ? gross * MEDICARE_LEVY : 0;

  return summarise(gross, [
    { name: "Income tax", amount: tax },
    { name: "Medicare levy", amount: levy },
  ], [
    "Resident for tax purposes, no private health insurance surcharge.",
    "Superannuation is paid by the employer on top of salary, so it is not deducted here.",
  ]);
}
