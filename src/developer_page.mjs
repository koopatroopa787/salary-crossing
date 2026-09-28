import { shell } from "./render.mjs";
import { url } from "./site.mjs";

export function developerPage() {
  return shell({
    title: "Free Salary Crossing Calculator API",
    description: "Use Salary Crossing's sourced UK take-home pay, cross-border salary and mortgage calculations through a read-only JSON API.",
    canonical: url("/developers/"),
    script: " ",
    body: `<header class="masthead"><p class="eyebrow">For developers and AI assistants</p><h1>Use the same calculator engine <em>as the site</em></h1><p class="standfirst">These free, read-only JSON endpoints run the public site's deterministic tax and mortgage formulas. They do not expose adviser cases or call an AI model.</p></header>
<article>
  <h2>UK take-home pay</h2>
  <p><a href="https://app.salarycrossing.com/api/v1/take-home?salary=50000">Calculate £50,000 gross pay</a>. Required: <code>salary</code>. Optional: <code>region=uk|scotland</code>, <code>pensionPct</code>, <code>pensionType=net-pay|salary-sacrifice</code> and comma-separated <code>studentPlans</code>. Results include tax, National Insurance, pension and loan breakdowns.</p>
  <h2>Cross-border salary comparison</h2>
  <p><a href="https://app.salarycrossing.com/api/v1/compare?gross=75000&amp;from=UK&amp;to=AE">Compare £75,000 in the UK with the UAE</a>. Required: <code>gross</code>. Optional: <code>from</code> and <code>to</code>, using UK, AE, AU, USNY, USCA or USTX. The result includes source and destination deductions, the equivalent gross salary, like-for-like difference and the dated exchange rate.</p>
  <h2>UK mortgage illustration</h2>
  <p><a href="https://app.salarycrossing.com/api/v1/mortgage?income1=50000&amp;deposit=40000">Illustrate affordability for £50,000 income and £40,000 deposit</a>. Required: <code>income1</code>. Optional: <code>income2</code>, <code>deposit</code>, <code>monthlyDebts</code>, <code>multiple</code>, <code>rate</code>, <code>termYears</code> and <code>region</code>.</p>
  <p><a href="https://app.salarycrossing.com/api/v1/openapi.json">OpenAPI description</a> · <a href="/about/">Methodology and primary tax sources</a></p>
  <h2>Use responsibly</h2>
  <p>Responses include source links, assumptions and limitations. Show those with the figure. These are estimates, not individual tax or lending advice. The website calculators stay in the visitor's browser; calls to this API send the values in the request URL, which may appear in server and CDN logs. Do not send names, case details or other personal information. The API is rate limited; contact us before bulk or commercial integration.</p>
</article>`,
  });
}
