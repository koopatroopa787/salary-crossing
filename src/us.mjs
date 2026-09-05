/**
 * United States — federal, FICA, and state.
 *
 * Verified 2026-09 against:
 *   federal brackets + standard deduction
 *     https://www.irs.gov/newsroom/irs-releases-tax-inflation-adjustments-for-tax-year-2026-including-amendments-from-the-one-big-beautiful-bill
 *   FICA  https://www.irs.gov/taxtopics/tc751
 *   NY / NYC  NYS-50-T-NYS (1/26) and NYS-50-T-NYC (1/26), annual schedules
 *   CA  EDD 2026 Withholding Schedules Method B; SDI rate from EDD
 *
 * On New York: the state's own annual schedule is used, not the headline
 * bracket table. Its rates run 5.90%, 7.03%, 7.53%, 6.40%, 11.44%, 7.35% —
 * non-monotonic, because New York spreads its "tax benefit recapture" (which
 * claws back the benefit of the lower brackets above $107,650) across those
 * lines. Calculators that use the headline brackets and skip the recapture
 * understate New York tax for exactly the six-figure earners who are
 * comparing London to Manhattan. Using the state's schedule gets it by
 * construction. It is a withholding schedule, so a filed return differs
 * slightly; that is stated on the page.
 */
import { bands, summarise } from "./common.mjs";

export const STANDARD_DEDUCTION = 16100;

export const FEDERAL_BANDS = [
  { rate: 0.10, upTo: 12400 },
  { rate: 0.12, upTo: 50400 },
  { rate: 0.22, upTo: 105700 },
  { rate: 0.24, upTo: 201775 },
  { rate: 0.32, upTo: 256225 },
  { rate: 0.35, upTo: 640600 },
  { rate: 0.37 },
];

export const SOCIAL_SECURITY_RATE = 0.062;
export const SOCIAL_SECURITY_WAGE_BASE = 184500;
export const MEDICARE_RATE = 0.0145;
export const ADDITIONAL_MEDICARE_RATE = 0.009;
export const ADDITIONAL_MEDICARE_THRESHOLD = 200000;

/**
 * A "subtract, multiply, add" schedule, which is how New York publishes it.
 * Each line: applies to net wages in [from, to), tax = (wages - sub) * rate + add.
 */
function stepped(netWages, schedule) {
  if (netWages <= 0) return 0;
  const line = schedule.find((l) => netWages < (l.to ?? Infinity)) ?? schedule.at(-1);
  return (netWages - line.sub) * line.rate + line.add;
}

// NYS-50-T-NYS (1/26), Annual Tax Rate Schedule, Single.
const NY_DEDUCTION = 7400;
const NY_SCHEDULE = [
  { to: 8500,    sub: 0,       rate: 0.0390, add: 0 },
  { to: 11700,   sub: 8500,    rate: 0.0440, add: 332 },
  { to: 13900,   sub: 11700,   rate: 0.0515, add: 472 },
  { to: 80650,   sub: 13900,   rate: 0.0540, add: 586 },
  { to: 96800,   sub: 80650,   rate: 0.0590, add: 4190 },
  { to: 107650,  sub: 96800,   rate: 0.0703, add: 5143 },
  { to: 157650,  sub: 107650,  rate: 0.0753, add: 5906 },
  { to: 215400,  sub: 157650,  rate: 0.0640, add: 9673 },
  { to: 265400,  sub: 215400,  rate: 0.1144, add: 13369 },
  { to: 1077550, sub: 265400,  rate: 0.0735, add: 19091 },
  { sub: 265400, rate: 0.0735, add: 19091 },   // above this NY uses Method III
];

// NYS-50-T-NYC (1/26), Annual Tax Rate Schedule, Single. Residents only.
const NYC_DEDUCTION = 5000;
const NYC_SCHEDULE = [
  { to: 8000,  sub: 0,     rate: 0.0205, add: 0 },
  { to: 8700,  sub: 8000,  rate: 0.0280, add: 164 },
  { to: 15000, sub: 8700,  rate: 0.0325, add: 184 },
  { to: 25000, sub: 15000, rate: 0.0395, add: 388 },
  { to: 60000, sub: 25000, rate: 0.0415, add: 783 },
  { sub: 60000, rate: 0.0425, add: 2236 },
];

// EDD 2026 Method B, single, monthly table x 12. Withholding rates carry
// California's 1.1 factor, so the filing rates are those divided by 1.1.
const CA_DEDUCTION = 5706;
const CA_EXEMPTION_CREDIT = 168.30;
const CA_BANDS = [
  { rate: 0.010, upTo: 11088 },
  { rate: 0.020, upTo: 26256 },
  { rate: 0.040, upTo: 41448 },
  { rate: 0.060, upTo: 57552 },
  { rate: 0.080, upTo: 72720 },
  { rate: 0.093, upTo: 371472 },
  { rate: 0.103, upTo: 445776 },
  { rate: 0.113, upTo: 742944 },
  { rate: 0.123, upTo: 1000000 },
  { rate: 0.133 },                 // includes the 1% mental health services tax
];
export const CA_SDI_RATE = 0.013;  // no wage cap since 2024

/**
 * Each state returns its own deductions. A state not listed here is not
 * modelled, and asking for it throws rather than quietly returning a number
 * that is too low.
 */
export const STATES = {
  TX: { name: "Texas",      city: "Austin",        deductions: () => [] },
  FL: { name: "Florida",    city: "Miami",         deductions: () => [] },
  WA: { name: "Washington", city: "Seattle",       deductions: () => [] },
  NV: { name: "Nevada",     city: "Las Vegas",     deductions: () => [] },
  TN: { name: "Tennessee",  city: "Nashville",     deductions: () => [] },
  NY: {
    name: "New York", city: "New York City",
    deductions: (gross) => [
      { name: "New York State tax", amount: stepped(gross - NY_DEDUCTION, NY_SCHEDULE) },
      { name: "New York City tax",  amount: stepped(gross - NYC_DEDUCTION, NYC_SCHEDULE) },
    ],
  },
  CA: {
    name: "California", city: "San Francisco",
    deductions: (gross) => [
      { name: "California state tax",
        amount: Math.max(0, bands(Math.max(0, gross - CA_DEDUCTION), CA_BANDS) - CA_EXEMPTION_CREDIT) },
      { name: "California SDI", amount: gross * CA_SDI_RATE },
    ],
  },
};

export const meta = {
  code: "US", name: "United States", theName: "the United States", adjective: "American",
  currency: "USD", symbol: "$", locale: "en-US",
  cities: ["New York", "San Francisco", "Austin"],
  year: "2026",
  sources: [
    { label: "IRS 2026 inflation adjustments", url: "https://www.irs.gov/newsroom/irs-releases-tax-inflation-adjustments-for-tax-year-2026-including-amendments-from-the-one-big-beautiful-bill" },
    { label: "IRS Topic 751 — FICA rates", url: "https://www.irs.gov/taxtopics/tc751" },
  ],
};

export function netPay(gross, opts = {}) {
  const code = (opts.state ?? "").toUpperCase();
  if (code && !STATES[code]) {
    throw new Error(
      `State ${code} is not modelled. Available: ${Object.keys(STATES).join(", ")}.`
    );
  }
  const state = STATES[code];

  const taxable = Math.max(0, gross - STANDARD_DEDUCTION);
  const federal = bands(taxable, FEDERAL_BANDS);

  // FICA is on gross wages; the standard deduction does not touch it.
  const socialSecurity = Math.min(gross, SOCIAL_SECURITY_WAGE_BASE) * SOCIAL_SECURITY_RATE;
  const medicare = gross * MEDICARE_RATE
    + Math.max(0, gross - ADDITIONAL_MEDICARE_THRESHOLD) * ADDITIONAL_MEDICARE_RATE;

  const deductions = [
    { name: "Federal income tax", amount: federal },
    { name: "Social Security", amount: socialSecurity },
    { name: "Medicare", amount: medicare },
    ...(state ? state.deductions(gross).filter((d) => d.amount > 0) : []),
  ];

  const notes = ["Single filer taking the standard deduction."];
  if (!state) notes.push("Federal tax and FICA only — no state income tax included.");
  else if (!state.deductions(gross).length) notes.push(`${state.name} levies no state income tax on wages.`);
  else if (code === "NY") notes.push("New York State and New York City resident tax, including the supplemental tax that recaptures the lower brackets above $107,650.");
  else if (code === "CA") notes.push("California state tax plus State Disability Insurance, which has had no wage cap since 2024.");

  return summarise(gross, deductions, notes);
}

/** A concrete place, so a comparison page can say "New York" and mean it. */
export function forState(code) {
  const state = STATES[code];
  if (!state) throw new Error(`Unknown state ${code}`);
  const extra = {
    NY: [{ label: "NY State withholding tables (NYS-50-T-NYS)", url: "https://www.tax.ny.gov/pdf/publications/withholding/nys50_t_nys.pdf" },
         { label: "NYC withholding tables (NYS-50-T-NYC)", url: "https://www.tax.ny.gov/pdf/publications/withholding/nys50_t_nyc.pdf" }],
    CA: [{ label: "California 2026 withholding schedules (EDD)", url: "https://edd.ca.gov/siteassets/files/pdf_pub_ctr/26methb.pdf" },
         { label: "California SDI rate (EDD)", url: "https://edd.ca.gov/en/payroll_taxes/rates_and_withholding/" }],
  }[code] ?? [];

  return {
    meta: {
      ...meta,
      code: "US" + code,
      name: `${state.name}, USA`,
      theName: `${state.name}`,
      cities: [state.city],
      sources: [...meta.sources, ...extra],
    },
    netPay: (gross) => netPay(gross, { state: code }),
  };
}
