import { shell } from "./render.mjs";
import { url } from "./site.mjs";

export function adviserPage() {
  const body = `
<header class="masthead adviser-hero">
  <p class="eyebrow">Founding pilot for global-mobility advisers</p>
  <h1>From payslip and offer to a <em>sourced client report</em></h1>
  <p class="standfirst">Bring the evidence, confirm the facts and produce an international compensation comparison that shows its assumptions. The arithmetic comes from the same published-rate engine as Salary Crossing; the adviser stays in control.</p>
  <p class="adviser-actions"><a class="adviser-primary" href="https://app.salarycrossing.com/login">Adviser sign in</a><a href="mailto:hello@salarycrossing.com?subject=Salary%20Crossing%20adviser%20pilot">Ask about the founding pilot</a></p>
</header>
<section class="adviser-proof">
  <div><b>£149</b><span>30-day founding pilot</span></div>
  <div><b>5 cases</b><span>Current and proposed packages</span></div>
  <div><b>2 approvals</b><span>Before any client report is shared</span></div>
</section>
<article>
  <h2>A case workflow, rather than another calculator</h2>
  <p>The workspace is for advisers who repeatedly turn compensation documents and relocation assumptions into client-facing work. It keeps the evidence, confirmed values, calculation, comments and approval history together.</p>
  <div class="adviser-grid">
    <section><p class="eyebrow">1 · Evidence</p><h3>Add the case</h3><p>Record the current package, proposed offer, pension, benefits, household costs and relocation support. Document retention is encrypted and organisation-scoped when enabled for the pilot.</p></section>
    <section><p class="eyebrow">2 · Review</p><h3>Confirm every material fact</h3><p>AI can extract suggested values with a confidence score and source quotation. It cannot approve a figure, calculate tax or invent an omitted term.</p></section>
    <section><p class="eyebrow">3 · Calculate</p><h3>Use verified arithmetic</h3><p>The deterministic engine models tax and compulsory charges for the UK, Australia, UAE, New York, California and Texas, with each primary source attached.</p></section>
    <section><p class="eyebrow">4 · Share</p><h3>Approve the report twice</h3><p>Inputs are locked before calculation. The finished one, three and five-year comparison needs a second approval before a revocable client link is created.</p></section>
  </div>
  <h2>What the report makes explicit</h2>
  <ul>
    <li>Spendable income after modelled tax and adviser-entered household costs.</li>
    <li>Employer pension, Australian super, benefits, bonus, equity and relocation support shown separately.</li>
    <li>The destination salary that matches current take-home before and after household costs.</li>
    <li>Unsupported circumstances that require tax, immigration or legal review.</li>
    <li>The exchange-rate date, tax-year version, source links and adviser-approved assumptions.</li>
  </ul>
  <h2>Designed for a paid validation, not an endless free trial</h2>
  <p>The founding pilot costs £149 for five cases over 30 days. We will measure preparation time, extraction corrections and whether the report is suitable to send to a client. The wider product will only be built if real advisers pay, use it on real cases and return with another case.</p>
  <p class="route-cta"><a href="mailto:hello@salarycrossing.com?subject=Salary%20Crossing%20adviser%20pilot">Discuss a pilot case &rarr;</a></p>
</article>`;
  return shell({
    title: "International Compensation Reports for Global-Mobility Advisers",
    description: "Turn a current package and international offer into a sourced, adviser-approved compensation report with tax, pension, costs and multi-year scenarios.",
    canonical: url("/advisers/"), body, script: " ",
    jsonLd: {
      "@context": "https://schema.org", "@type": "SoftwareApplication",
      name: "Salary Crossing Adviser", applicationCategory: "BusinessApplication", operatingSystem: "Web",
      offers: { "@type": "Offer", price: "149", priceCurrency: "GBP", description: "30-day founding pilot for five cases" },
    },
  });
}
