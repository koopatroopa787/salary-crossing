/**
 * UK take-home pay. Pure functions, no I/O, no dependencies.
 *
 * The same module runs in the browser (live calculator) and in Node (static
 * page generator), so a pre-rendered "£35,000 take-home" page and the widget
 * on it can never disagree.
 */
import {
  PERSONAL_ALLOWANCE, TAPER_START, REGIONS, NI_BANDS, STUDENT_PLANS,
} from "./rates.mjs";

/** The allowance left after the £100k taper. */
export function personalAllowance(adjustedNetIncome) {
  if (adjustedNetIncome <= TAPER_START) return PERSONAL_ALLOWANCE;
  const lost = Math.floor((adjustedNetIncome - TAPER_START) / 2);
  return Math.max(0, PERSONAL_ALLOWANCE - lost);
}

/** Walk a band table, returning the total and a per-band breakdown. */
function applyBands(amount, bands) {
  let total = 0;
  let floor = 0;
  const rows = [];
  for (const band of bands) {
    const ceiling = band.upTo ?? Infinity;
    const inBand = Math.max(0, Math.min(amount, ceiling) - floor);
    if (inBand > 0 && band.rate > 0) {
      const tax = inBand * band.rate;
      total += tax;
      rows.push({ name: band.name, rate: band.rate, amount: inBand, tax });
    }
    floor = ceiling;
    if (amount <= ceiling) break;
  }
  return { total, rows };
}

export function incomeTax(taxableIncome, region = "uk") {
  const bands = (REGIONS[region] ?? REGIONS.uk).bands;
  return applyBands(Math.max(0, taxableIncome), bands);
}

export function nationalInsurance(nicableEarnings) {
  return applyBands(Math.max(0, nicableEarnings), NI_BANDS);
}

/**
 * Student loan repayments.
 *
 * HMRC deducts a whole number of pounds per pay period and rounds down, so a
 * salary just over a threshold repays nothing. Rounding down the annual figure
 * is the closest a yearly model gets, and it errs low rather than overstating
 * what someone owes.
 */
export function studentLoan(income, plans = []) {
  const rows = [];
  let total = 0;
  for (const key of plans) {
    const plan = STUDENT_PLANS[key];
    if (!plan) continue;
    const due = Math.floor(Math.max(0, income - plan.threshold) * plan.rate);
    if (due > 0) {
      rows.push({ name: plan.label, amount: due });
      total += due;
    }
  }
  return { total, rows };
}

/**
 * @param {number} salary        gross annual salary
 * @param {string} region        "uk" | "scotland"
 * @param {number} pensionPct    employee contribution, percent of salary
 * @param {string} pensionType   "salary-sacrifice" | "net-pay"
 * @param {string[]} studentPlans e.g. ["plan2", "pg"]
 */
export function takeHome({
  salary = 0,
  region = "uk",
  pensionPct = 0,
  pensionType = "net-pay",
  studentPlans = [],
} = {}) {
  const gross = Math.max(0, salary);
  const pension = gross * (Math.max(0, pensionPct) / 100);

  // Salary sacrifice gives up the pay itself, so it escapes National Insurance
  // and student loan as well as tax. A net-pay scheme only reduces taxable pay
  // — the same contribution, a materially different result, which is why the
  // choice is on the form rather than assumed.
  const sacrificed = pensionType === "salary-sacrifice";
  const nicable = sacrificed ? gross - pension : gross;
  const beforeAllowance = gross - pension;

  const allowance = personalAllowance(beforeAllowance);
  const taxable = Math.max(0, beforeAllowance - allowance);

  const tax = incomeTax(taxable, region);
  const ni = nationalInsurance(nicable);
  const loan = studentLoan(nicable, studentPlans);

  const deductions = tax.total + ni.total + loan.total + pension;
  const net = gross - deductions;

  return {
    gross,
    pension,
    allowance,
    taxableIncome: taxable,
    incomeTax: tax.total,
    incomeTaxBands: tax.rows,
    nationalInsurance: ni.total,
    nationalInsuranceBands: ni.rows,
    studentLoan: loan.total,
    studentLoanRows: loan.rows,
    totalDeductions: deductions,
    net,
    monthly: net / 12,
    weekly: net / 52,
    daily: net / 260,               // 5-day working week
    /** Tax + NI as a share of gross. Excludes pension: that is still your money. */
    effectiveRate: gross > 0 ? (tax.total + ni.total) / gross : 0,
    /** What you keep out of the next £100 earned. */
    marginalRate: marginalRate(salary, { region, pensionPct, pensionType, studentPlans }),
  };
}

/** Rate on the next £1, found by differencing — no second rule set to keep in sync. */
function marginalRate(salary, opts) {
  const step = 100;
  const at = (s) => {
    const gross = Math.max(0, s);
    const pension = gross * (Math.max(0, opts.pensionPct) / 100);
    const sacrificed = opts.pensionType === "salary-sacrifice";
    const nicable = sacrificed ? gross - pension : gross;
    const beforeAllowance = gross - pension;
    const taxable = Math.max(0, beforeAllowance - personalAllowance(beforeAllowance));
    return incomeTax(taxable, opts.region).total
      + nationalInsurance(nicable).total
      + studentLoan(nicable, opts.studentPlans).total;
  };
  return (at(salary + step) - at(salary)) / step;
}

export const money = (n) =>
  "£" + Math.round(n).toLocaleString("en-GB");

export const money2 = (n) =>
  "£" + n.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
