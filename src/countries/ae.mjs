/**
 * United Arab Emirates.
 *
 * There is no personal income tax on employment income, confirmed by the UAE
 * government portal. Pension contributions are compulsory for UAE and GCC
 * nationals only; expatriate employees pay nothing and receive an end-of-
 * service gratuity instead, so for the relocation case this really is zero.
 *
 * Modelling nothing is still modelling: the file exists so the comparison can
 * cite a source for the zero rather than assuming it.
 */
import { summarise } from "./common.mjs";

export const meta = {
  code: "AE", name: "United Arab Emirates", theName: "the United Arab Emirates", adjective: "Emirati",
  currency: "AED", symbol: "AED ", locale: "en-AE",
  cities: ["Dubai", "Abu Dhabi"],
  year: "2026",
  sources: [
    { label: "u.ae — income tax", url: "https://u.ae/en/information-and-services/finance-and-investment/taxation/other-taxes/income-tax" },
    { label: "UAE Federal Tax Authority", url: "https://tax.gov.ae/en/" },
  ],
};

export function netPay(gross) {
  return summarise(gross, [], [
    "No personal income tax and no social security for expatriate employees.",
    "Employers owe an end-of-service gratuity instead of a pension contribution.",
  ]);
}
