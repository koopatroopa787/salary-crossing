import { compare, country } from "../src/compare.mjs";
import { matchAfterCosts, monthlyCosts } from "../src/living_costs.mjs";
import { rate as fxRate } from "../src/fx.mjs";

export const INPUT_VERSION = 1;
export const CALCULATION_VERSION = "2026.09.23-1";

const amount = (value) => {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? Math.min(number, 100_000_000) : 0;
};

export function defaultInputs() {
  return {
    version: INPUT_VERSION,
    from: { code: "UK", gross: 75000, bonus: 0, equity: 0, employerPension: 0, benefits: 0, costs: {} },
    to: { code: "AE", gross: 350000, bonus: 0, equity: 0, employerPension: 0, benefits: 0, costs: {} },
    oneTime: { allowance: 0, movingCost: 0 },
    assumptions: [],
    unsupported: [],
  };
}

export function normalizeInputs(raw = {}) {
  const base = defaultInputs();
  const side = (value, fallback) => ({
    code: country(value?.code ?? fallback.code).meta.code,
    gross: amount(value?.gross ?? fallback.gross),
    bonus: amount(value?.bonus), equity: amount(value?.equity),
    employerPension: amount(value?.employerPension), benefits: amount(value?.benefits),
    costs: Object.fromEntries(["housing", "healthcare", "childcare", "transport", "other"].map((key) => [key, amount(value?.costs?.[key])])),
  });
  const from = side(raw.from, base.from);
  let to = side(raw.to, base.to);
  if (to.code === from.code) to = side({ ...raw.to, code: from.code === "UK" ? "AE" : "UK" }, base.to);
  return {
    version: INPUT_VERSION, from, to,
    oneTime: { allowance: amount(raw.oneTime?.allowance), movingCost: amount(raw.oneTime?.movingCost) },
    assumptions: (Array.isArray(raw.assumptions) ? raw.assumptions : []).map(String).map((x) => x.trim()).filter(Boolean).slice(0, 30),
    unsupported: (Array.isArray(raw.unsupported) ? raw.unsupported : []).map(String).map((x) => x.trim()).filter(Boolean).slice(0, 30),
  };
}

export function calculateReport(rawInputs, fx) {
  const inputs = normalizeInputs(rawInputs);
  const from = country(inputs.from.code);
  const to = country(inputs.to.code);
  const rate = fxRate(fx.perEur, from.meta.currency, to.meta.currency);
  const fromTaxable = inputs.from.gross + inputs.from.bonus;
  const toTaxable = inputs.to.gross + inputs.to.bonus;
  const fromPay = from.netPay(fromTaxable);
  const toPay = to.netPay(toTaxable);
  const fromRetirement = inputs.from.employerPension || Number(fromPay.retirement?.amount) || 0;
  const toRetirement = inputs.to.employerPension || Number(toPay.retirement?.amount) || 0;
  const fromAnnualCosts = monthlyCosts(inputs.from.costs) * 12;
  const toAnnualCosts = monthlyCosts(inputs.to.costs) * 12;
  const fromRecurring = fromPay.net - fromAnnualCosts + inputs.from.equity + fromRetirement + inputs.from.benefits;
  const toRecurring = toPay.net - toAnnualCosts + inputs.to.equity + toRetirement + inputs.to.benefits;
  const toRecurringInFrom = toRecurring / rate;
  const equivalence = compare({ gross: fromTaxable, from: inputs.from.code, to: inputs.to.code, rate });
  const costAdjusted = matchAfterCosts({
    gross: fromTaxable, from: inputs.from.code, to: inputs.to.code, rate,
    fromCosts: inputs.from.costs, toCosts: inputs.to.costs,
  });
  const scenarios = [1, 3, 5].map((years) => {
    const source = fromRecurring * years;
    const destination = toRecurring * years + inputs.oneTime.allowance - inputs.oneTime.movingCost;
    return { years, source, destination, destinationInSource: destination / rate, difference: destination / rate - source };
  });
  return {
    inputs, rate, fxDate: fx.date, calculationVersion: CALCULATION_VERSION,
    taxYears: { from: from.meta.year, to: to.meta.year },
    from: { ...from.meta, pay: fromPay, retirementValue: fromRetirement, annualCosts: fromAnnualCosts, recurringValue: fromRecurring },
    to: { ...to.meta, pay: toPay, retirementValue: toRetirement, annualCosts: toAnnualCosts, recurringValue: toRecurring, recurringValueInSource: toRecurringInFrom },
    difference: toRecurringInFrom - fromRecurring,
    equivalentDestinationGross: equivalence.to.gross,
    costAdjustedDestinationGross: costAdjusted.gross,
    scenarios,
    sources: [...from.meta.sources.map((source) => ({ ...source, jurisdiction: from.meta.name })), ...to.meta.sources.map((source) => ({ ...source, jurisdiction: to.meta.name }))],
    warnings: [
      "The model assumes ordinary employment income, full-year tax residence and standard allowances.",
      "Bonus is treated as ordinary employment income. Equity is shown as stated value and is not tax-modelled.",
      ...inputs.unsupported.map((item) => `Professional review required: ${item}`),
    ],
  };
}
