import { takeHome } from "../src/tax.mjs";
import { YEAR, STUDENT_PLANS } from "../src/rates.mjs";
import { affordability } from "../src/mortgage.mjs";
import { CODES, compare, country } from "../src/compare.mjs";
import { rate as fxRate } from "../src/fx.mjs";

const bad = (message) => Object.assign(new Error(message), { status: 400 });

function numberParam(params, name, { required = false, fallback = 0, max = 10_000_000 } = {}) {
  const raw = params.get(name);
  if (raw == null || raw === "") {
    if (required) throw bad(`${name} is required.`);
    return fallback;
  }
  if (!/^\d+(?:\.\d{1,2})?$/.test(raw)) throw bad(`${name} must be a non-negative number with at most two decimal places.`);
  const value = Number(raw);
  if (!Number.isFinite(value) || value > max) throw bad(`${name} exceeds the supported range.`);
  return value;
}

function choice(params, name, options, fallback) {
  const value = params.get(name) ?? fallback;
  if (!options.includes(value)) throw bad(`${name} must be one of: ${options.join(", ")}.`);
  return value;
}

const API = "https://app.salarycrossing.com/api/v1";

export function publicApiResult(url, fx) {
  const params = url.searchParams;
  if (url.pathname === "/api/v1/take-home") {
    const salary = numberParam(params, "salary", { required: true });
    const region = choice(params, "region", ["uk", "scotland"], "uk");
    const pensionPct = numberParam(params, "pensionPct", { max: 100 });
    const pensionType = choice(params, "pensionType", ["net-pay", "salary-sacrifice"], "net-pay");
    const plansText = params.get("studentPlans") ?? "";
    const studentPlans = plansText ? plansText.split(",") : [];
    if (studentPlans.some((plan) => !Object.hasOwn(STUDENT_PLANS, plan)) || new Set(studentPlans).size !== studentPlans.length) {
      throw bad(`studentPlans must contain distinct values from: ${Object.keys(STUDENT_PLANS).join(", ")}.`);
    }
    return {
      tool: "uk-take-home", inputs: { salary, region, pensionPct, pensionType, studentPlans },
      taxYear: YEAR, currency: "GBP", result: takeHome({ salary, region, pensionPct, pensionType, studentPlans }),
      sources: country("UK").meta.sources,
      method: "https://salarycrossing.com/about/", page: "https://salarycrossing.com/take-home/",
      caveat: "Annual estimate for ordinary employment, standard allowances and the selected inputs. It is not a payslip or personal tax advice.",
    };
  }
  if (url.pathname === "/api/v1/compare") {
    const gross = numberParam(params, "gross", { required: true });
    const from = choice(params, "from", CODES, "UK");
    const to = choice(params, "to", CODES, "AE");
    if (from === to) throw bad("from and to must be different jurisdictions.");
    const source = country(from), destination = country(to);
    const exchangeRate = fxRate(fx.perEur, source.meta.currency, destination.meta.currency);
    return {
      tool: "cross-border-salary", inputs: { gross, from, to }, fx: { rate: exchangeRate, asOf: fx.date, source: "European Central Bank reference rates via Frankfurter; AED derived from USD peg" },
      result: compare({ gross, from, to, rate: exchangeRate }),
      sources: { from: source.meta.sources, to: destination.meta.sources },
      method: "https://salarycrossing.com/about/", page: `https://salarycrossing.com/compare/${from.toLowerCase()}-to-${to.toLowerCase()}/`,
      caveat: "Illustrative single-person employment comparison. It excludes personal tax residency, relocation costs and local living costs unless separately considered. FX rates change.",
    };
  }
  if (url.pathname === "/api/v1/mortgage") {
    const income1 = numberParam(params, "income1", { required: true });
    const income2 = numberParam(params, "income2");
    const deposit = numberParam(params, "deposit");
    const monthlyDebts = numberParam(params, "monthlyDebts", { max: 20_000 });
    const multiple = numberParam(params, "multiple", { fallback: 4.5, max: 10 });
    const rate = numberParam(params, "rate", { fallback: 4.5, max: 20 });
    const termYears = numberParam(params, "termYears", { fallback: 25, max: 40 });
    const region = choice(params, "region", ["uk", "scotland"], "uk");
    if (multiple < 1 || termYears < 5) throw bad("multiple must be at least 1 and termYears at least 5.");
    const inputs = { income1, income2, deposit, monthlyDebts, multiple, rate, termYears, region };
    return {
      tool: "uk-mortgage-affordability", inputs, taxYear: YEAR, currency: "GBP", result: affordability(inputs),
      sources: [
        { label: "Bank of England mortgage loan to income flow limit", url: "https://www.bankofengland.co.uk/prudential-regulation/publication/2014/june/loan-to-income-ratios-in-mortgage-lending" },
        ...country("UK").meta.sources,
      ],
      method: "https://salarycrossing.com/about/", page: "https://salarycrossing.com/mortgage/",
      caveat: "Illustrative affordability, not a lender decision or mortgage offer. The rate is a user assumption, not a live quote.",
    };
  }
  return null;
}

export const openApi = {
  openapi: "3.0.3",
  info: { title: "Salary Crossing public calculators", version: "1.0.0", description: "Read-only deterministic estimates. No account or client case access." },
  servers: [{ url: API }],
  paths: Object.fromEntries([
    ["/take-home", "salary", "Annual UK gross salary", 50000],
    ["/compare", "gross", "Annual gross salary in the source jurisdiction", 75000],
    ["/mortgage", "income1", "First applicant annual gross income", 50000],
  ].map(([path, name, description, example]) => [path, { get: {
    summary: path === "/compare" ? "Compare cross-border take-home pay" : path === "/mortgage" ? "Estimate UK mortgage affordability" : "Calculate UK take-home pay",
    parameters: [{ name, in: "query", required: true, description, schema: { type: "number", minimum: 0, maximum: 10000000, example } }],
    responses: { 200: { description: "Sourced calculation", content: { "application/json": { schema: { type: "object" } } } }, 400: { description: "Invalid input" } },
  } }])),
};
