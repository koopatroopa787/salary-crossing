/** United Kingdom. Wraps the existing engine so there is still one tax model. */
import { takeHome } from "../tax.mjs";
import { YEAR_LABEL } from "../rates.mjs";
import { summarise } from "./common.mjs";

export const meta = {
  code: "UK", name: "United Kingdom", theName: "the United Kingdom", adjective: "British",
  currency: "GBP", symbol: "£", locale: "en-GB",
  cities: ["London", "Manchester", "Edinburgh"],
  year: YEAR_LABEL,
  sources: [
    { label: "gov.uk income tax rates", url: "https://www.gov.uk/income-tax-rates" },
    { label: "gov.uk National Insurance", url: "https://www.gov.uk/national-insurance-rates-letters" },
  ],
};

export function netPay(gross, opts = {}) {
  const r = takeHome({ salary: gross, region: opts.region ?? "uk" });
  const deductions = [
    { name: "Income tax", amount: r.incomeTax },
    { name: "National Insurance", amount: r.nationalInsurance },
  ];
  if (r.studentLoan > 0) deductions.push({ name: "Student loan", amount: r.studentLoan });
  return summarise(gross, deductions, [
    "Employee National Insurance, standard tax code, no pension contributions.",
  ]);
}
