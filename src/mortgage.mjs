/**
 * What a UK lender will actually lend you, and whether you can actually pay it.
 *
 * Two caps apply and the smaller one wins:
 *
 *   Income multiple — regulators cap lending at 4.5x income for all but 15% of
 *   a lender's new mortgages (BoE FPC loan-to-income flow limit), so 4.5x is
 *   the working ceiling for most borrowers even though some get 5x or 5.5x.
 *
 *   Loan to value — you cannot borrow more than 95% of the price, so a small
 *   deposit caps the purchase long before your salary does.
 *
 * The part other calculators skip: they measure the payment against GROSS
 * income, which nobody has ever been paid. This one runs the same tax engine
 * the take-home pages use and measures it against what actually arrives.
 */
import { takeHome } from "./tax.mjs";

export const DEFAULT_MULTIPLE = 4.5;
export const MAX_LTV = 0.95;
/** Lenders test you against a rate well above the one you're offered. */
export const STRESS_UPLIFT = 3.0;

const bounded = (value, min, max, fallback = min) => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};

/** Monthly capital-and-interest payment. */
export function monthlyPayment(principal, annualRatePct, termYears) {
  const safePrincipal = bounded(principal, 0, 100_000_000);
  const safeRate = bounded(annualRatePct, 0, 20);
  const safeTerm = bounded(termYears, 0, 100);
  const n = Math.round(safeTerm * 12);
  if (n <= 0 || safePrincipal <= 0) return 0;
  const r = safeRate / 100 / 12;
  if (r === 0) return safePrincipal / n;
  const growth = Math.pow(1 + r, n);
  return (safePrincipal * r * growth) / (growth - 1);
}

export function affordability({
  income1 = 0,
  income2 = 0,
  deposit = 0,
  monthlyDebts = 0,
  multiple = DEFAULT_MULTIPLE,
  rate = 4.5,
  termYears = 25,
  region = "uk",
} = {}) {
  const safeIncome1 = bounded(income1, 0, 10_000_000);
  const safeIncome2 = bounded(income2, 0, 10_000_000);
  const safeDeposit = bounded(deposit, 0, 10_000_000);
  const safeDebts = bounded(monthlyDebts, 0, 20_000);
  const safeMultiple = bounded(multiple, 1, 10, DEFAULT_MULTIPLE);
  const safeRate = bounded(rate, 0, 20, 4.5);
  const safeTerm = bounded(termYears, 5, 40, 25);
  const householdIncome = safeIncome1 + safeIncome2;

  // Lenders knock existing commitments off the income before applying the
  // multiple: a £300 car payment costs you roughly £16,200 of borrowing.
  const assessable = Math.max(0, householdIncome - safeDebts * 12);
  const byIncome = assessable * safeMultiple;

  // With a deposit D and a 95% cap, the largest loan is D/0.05 * 0.95.
  const byDeposit = safeDeposit > 0 ? (safeDeposit / (1 - MAX_LTV)) * MAX_LTV : 0;

  const loan = Math.max(0, Math.min(byIncome, byDeposit));
  const price = loan + safeDeposit;
  const ltv = price > 0 ? loan / price : 0;
  const limitedBy = byIncome <= byDeposit ? "income" : "deposit";

  const payment = monthlyPayment(loan, safeRate, safeTerm);
  const stressed = monthlyPayment(loan, safeRate + STRESS_UPLIFT, safeTerm);

  // Net pay is per person, so two £30k earners keep more than one £60k earner.
  const netMonthly =
    (takeHome({ salary: safeIncome1, region }).net + takeHome({ salary: safeIncome2, region }).net) / 12;

  const share = netMonthly > 0 ? payment / netMonthly : 0;
  const stressedShare = netMonthly > 0 ? stressed / netMonthly : 0;

  return {
    householdIncome,
    assessable,
    loan,
    deposit: safeDeposit,
    price,
    ltv,
    limitedBy,
    multiple: safeMultiple,
    payment,
    stressed,
    netMonthly,
    share,
    stressedShare,
    totalInterest: payment * safeTerm * 12 - loan,
    ltvBand: ltvBand(ltv),
    verdict: verdict(share, stressedShare),
  };
}

/** Lenders price in 5% steps; the difference between bands is real money. */
export function ltvBand(ltv) {
  if (ltv <= 0.6) return { label: "60% or less", note: "the cheapest rates lenders offer" };
  if (ltv <= 0.75) return { label: "75%", note: "still comfortably priced" };
  if (ltv <= 0.85) return { label: "85%", note: "a step up in rate" };
  if (ltv <= 0.9) return { label: "90%", note: "noticeably dearer" };
  return { label: "95%", note: "the dearest tier, and the smallest choice of lenders" };
}

/**
 * Thresholds are the conventional lender comfort zones, not a rule in any
 * handbook. Stated as such on the page rather than dressed up as a decision.
 */
function verdict(share, stressedShare) {
  if (share === 0) return { level: "none", text: "Enter your income and deposit." };
  if (stressedShare <= 0.4) {
    return { level: "good", text: "Comfortable. The payment stays under 40% of your take-home even at the stressed rate." };
  }
  if (share <= 0.4) {
    return { level: "tight", text: "Affordable now, but a rate rise would stretch you. Lenders will notice this too." };
  }
  return { level: "over", text: "Over the level most lenders are comfortable with. Expect to be offered less than the multiple suggests." };
}
