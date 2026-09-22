/**
 * Optional, user-entered living costs for a cross-border comparison.
 *
 * The site does not guess what a family spends. These helpers only use the
 * visitor's own monthly estimates, then solve for the salary that leaves the
 * same disposable income after tax and those costs.
 */
import { country, grossForNet } from "./compare.mjs";

export const COST_FIELDS = [
  { key: "housing", label: "Housing", param: "h" },
  { key: "healthcare", label: "Healthcare / insurance", param: "m" },
  { key: "childcare", label: "Childcare / schooling", param: "c" },
  { key: "transport", label: "Transport", param: "t" },
  { key: "other", label: "Other essentials", param: "o" },
];

const cleanAmount = (value) => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.min(n, 1000000) : 0;
};

export function cleanCosts(input = {}) {
  return Object.fromEntries(COST_FIELDS.map(({ key }) => [key, cleanAmount(input[key])]));
}

export function monthlyCosts(input = {}) {
  return Object.values(cleanCosts(input)).reduce((sum, value) => sum + value, 0);
}

export function matchAfterCosts({ gross, from, to, rate, fromCosts = {}, toCosts = {}, fromOpts = {}, toOpts = {} }) {
  const source = country(from).netPay(Math.max(0, Number(gross) || 0), fromOpts);
  const sourceAnnualCosts = monthlyCosts(fromCosts) * 12;
  const destinationAnnualCosts = monthlyCosts(toCosts) * 12;
  const sourceDisposable = source.net - sourceAnnualCosts;
  const targetDestinationNet = Math.max(0, sourceDisposable * rate + destinationAnnualCosts);
  const neededGross = grossForNet(targetDestinationNet, to, toOpts);
  const destination = country(to).netPay(neededGross, toOpts);

  return {
    gross: neededGross,
    sourceNet: source.net,
    destinationNet: destination.net,
    sourceAnnualCosts,
    destinationAnnualCosts,
    sourceDisposable,
    destinationDisposable: destination.net - destinationAnnualCosts,
    exact: targetDestinationNet > 0 || sourceDisposable * rate + destinationAnnualCosts === 0,
  };
}

/** Read compact cost fields such as fh (from housing) and tc (to childcare). */
export function costsFromParams(params, prefix) {
  return cleanCosts(Object.fromEntries(COST_FIELDS.map(({ key, param }) => [key, params.get(prefix + param)])));
}

/** A copyable URL fragment. Zero-value costs are omitted to keep links short. */
export function comparisonHash({ from, to, gross, fromCosts = {}, toCosts = {} }) {
  const rawGross = Number(gross);
  const safeGross = Number.isFinite(rawGross) && rawGross > 0 ? Math.min(rawGross, 10000000) : 0;
  const params = new URLSearchParams({ from: String(from).toUpperCase(), to: String(to).toUpperCase(), gross: String(safeGross) });
  for (const [prefix, costs] of [["f", cleanCosts(fromCosts)], ["t", cleanCosts(toCosts)]]) {
    for (const { key, param } of COST_FIELDS) if (costs[key] > 0) params.set(prefix + param, String(costs[key]));
  }
  return "#" + params.toString();
}
