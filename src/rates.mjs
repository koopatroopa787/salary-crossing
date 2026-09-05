/**
 * Every number HMRC sets, in one file, with the page it came from.
 *
 * This is the only file that changes in April. Nothing else in the codebase
 * knows a tax figure, so the annual update is one commit to one file — which
 * is the whole reason the site is cheap to maintain.
 *
 * Verified 2026-09 against:
 *   income tax bands + taper   https://www.gov.uk/income-tax-rates
 *   Scottish bands             https://www.gov.uk/scottish-income-tax
 *   Class 1 NI                 https://www.gov.uk/national-insurance-rates-letters
 *   student loans              https://www.gov.uk/repaying-your-student-loan/what-you-pay
 *
 * Band limits are expressed as TAXABLE income (income after the personal
 * allowance), which is how HMRC defines them. That matters at the top: the
 * additional-rate threshold is £125,140 of taxable income, and it lines up
 * with £125,140 of gross only because the allowance has already tapered to
 * zero by then. Writing the bands in gross terms breaks above £100,000.
 */

export const YEAR = "2026-27";
export const YEAR_LABEL = "2026/27";
export const YEAR_RANGE = "6 April 2026 to 5 April 2027";

export const PERSONAL_ALLOWANCE = 12570;
export const TAPER_START = 100000;      // £1 of allowance lost per £2 over this

export const REGIONS = {
  uk: {
    label: "England, Wales & Northern Ireland",
    short: "rest of the UK",
    bands: [
      { name: "Basic rate",      rate: 0.20, upTo: 37700 },
      { name: "Higher rate",     rate: 0.40, upTo: 125140 },
      { name: "Additional rate", rate: 0.45 },
    ],
  },
  scotland: {
    label: "Scotland",
    short: "Scotland",
    // Published as gross ranges (£12,571–£16,537 etc); converted to taxable by
    // subtracting the full allowance, except the top rate, which HMRC already
    // states as £125,140 of taxable income.
    bands: [
      { name: "Starter rate",      rate: 0.19, upTo: 3967 },    // to £16,537 gross
      { name: "Basic rate",        rate: 0.20, upTo: 16956 },   // to £29,526
      { name: "Intermediate rate", rate: 0.21, upTo: 31092 },   // to £43,662
      { name: "Higher rate",       rate: 0.42, upTo: 62430 },   // to £75,000
      { name: "Advanced rate",     rate: 0.45, upTo: 125140 },
      { name: "Top rate",          rate: 0.48 },
    ],
  },
};

// Employee Class 1, category A. Thresholds are gross pay, not taxable pay —
// National Insurance ignores the personal allowance entirely.
export const NI_BANDS = [
  { name: "Below the primary threshold", rate: 0.00, upTo: 12570 },
  { name: "Main rate",                   rate: 0.08, upTo: 50270 },
  { name: "Above the upper earnings limit", rate: 0.02 },
];

export const STUDENT_PLANS = {
  plan1: { label: "Plan 1", threshold: 26900, rate: 0.09 },
  plan2: { label: "Plan 2", threshold: 29385, rate: 0.09 },
  plan4: { label: "Plan 4 (Scotland)", threshold: 33795, rate: 0.09 },
  plan5: { label: "Plan 5", threshold: 25000, rate: 0.09 },
  pg:    { label: "Postgraduate Loan", threshold: 21000, rate: 0.06 },
};
