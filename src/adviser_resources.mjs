import { calculateReport } from "../app/report.mjs";
import { textPdf } from "../app/pdf.mjs";
import { shell, esc } from "./render.mjs";
import { url } from "./site.mjs";

const fmt = (amount, currency) => new Intl.NumberFormat("en-GB", {
  style: "currency", currency, maximumFractionDigits: 0,
}).format(Math.round(amount));

const signed = (amount, currency) => `${amount >= 0 ? "+" : "−"}${fmt(Math.abs(amount), currency)}`;

const examples = [{
  slug: "london-to-dubai-product-manager",
  title: "London to Dubai: product manager",
  description: "A fictional demonstration comparing a UK package with a Dubai offer, including pension, benefits, household costs and relocation support.",
  profile: "A product manager comparing a London package with an offer in Dubai.",
  inputs: {
    from: {
      code: "UK", gross: 75000, bonus: 5000, equity: 0, employerPension: 6000, benefits: 1200,
      costs: { housing: 1900, healthcare: 0, childcare: 0, transport: 220, other: 450 },
    },
    to: {
      code: "AE", gross: 350000, bonus: 35000, equity: 0, employerPension: 0, benefits: 30000,
      costs: { housing: 10500, healthcare: 650, childcare: 0, transport: 1300, other: 1800 },
    },
    oneTime: { allowance: 25000, movingCost: 15000 },
    assumptions: [
      "The employee is single with no children and rents in both locations.",
      "The employer-provided UAE benefits are entered at the value stated in the offer.",
      "The bonus is paid in full and treated as ordinary employment income.",
      "Household costs are adviser-entered estimates, not a city-wide cost-of-living index.",
    ],
    unsupported: [
      "Confirm the employee's UK departure date and tax-residence position.",
      "Review medical-insurance coverage and any benefit-in-kind treatment.",
      "Confirm how end-of-service benefits apply to this employment contract.",
    ],
  },
}, {
  slug: "london-to-sydney-engineering-manager",
  title: "London to Sydney: engineering manager",
  description: "A fictional UK-to-Australia compensation report showing salary, bonus, superannuation, household costs and multi-year outcomes.",
  profile: "An engineering manager comparing a London role with a Sydney offer.",
  inputs: {
    from: {
      code: "UK", gross: 90000, bonus: 9000, equity: 10000, employerPension: 7200, benefits: 1500,
      costs: { housing: 2300, healthcare: 0, childcare: 1200, transport: 260, other: 500 },
    },
    to: {
      code: "AU", gross: 190000, bonus: 19000, equity: 18000, employerPension: 0, benefits: 3500,
      costs: { housing: 4800, healthcare: 260, childcare: 2200, transport: 420, other: 900 },
    },
    oneTime: { allowance: 12000, movingCost: 18000 },
    assumptions: [
      "The employee is an Australian tax resident for the full modelled year.",
      "Australian compulsory superannuation is shown separately from spendable cash.",
      "Equity is shown at the adviser-entered stated value and is not tax-modelled.",
      "Childcare and housing costs reflect this household's estimates.",
    ],
    unsupported: [
      "Confirm whether the advertised Australian salary includes or excludes superannuation.",
      "Review equity vesting, valuation and cross-border tax treatment.",
      "Review split-year residence and the exact relocation date.",
    ],
  },
}, {
  slug: "london-to-new-york-sales-director",
  title: "London to New York: sales director",
  description: "A fictional UK-to-New York report comparing base pay, variable compensation, retirement, healthcare benefits and household costs.",
  profile: "A sales director comparing a London role with a New York offer.",
  inputs: {
    from: {
      code: "UK", gross: 110000, bonus: 25000, equity: 12000, employerPension: 9000, benefits: 2500,
      costs: { housing: 2800, healthcare: 0, childcare: 0, transport: 280, other: 650 },
    },
    to: {
      code: "USNY", gross: 210000, bonus: 45000, equity: 25000, employerPension: 10500, benefits: 18000,
      costs: { housing: 6200, healthcare: 850, childcare: 0, transport: 310, other: 1100 },
    },
    oneTime: { allowance: 20000, movingCost: 14000 },
    assumptions: [
      "The employee is single, uses the standard deduction and is resident in New York City for the full modelled year.",
      "Employer healthcare and retirement contributions are shown at the values entered by the adviser.",
      "The full target bonus is included as ordinary employment income.",
      "Equity is shown at stated value and is not tax-modelled.",
    ],
    unsupported: [
      "Confirm federal and state filing status and tax residency.",
      "Review healthcare plan deductibles and out-of-pocket limits.",
      "Review equity type, vesting schedule and tax treatment.",
    ],
  },
}];

const reportUrl = (slug) => `/advisers/sample-reports/${slug}/`;

function comparisonRows(report) {
  const fromCurrency = report.from.currency;
  const toCurrency = report.to.currency;
  const fromCash = report.from.pay.net - report.from.annualCosts;
  const toCash = report.to.pay.net - report.to.annualCosts;
  return `
  <div class="sample-table-wrap"><table class="sample-table">
    <thead><tr><th>Annual item</th><th class="num">Current package</th><th class="num">Proposed package</th></tr></thead>
    <tbody>
      <tr><td>Gross salary and target bonus</td><td class="num">${fmt(report.inputs.from.gross + report.inputs.from.bonus, fromCurrency)}</td><td class="num">${fmt(report.inputs.to.gross + report.inputs.to.bonus, toCurrency)}</td></tr>
      <tr><td>Take-home after modelled payroll deductions</td><td class="num">${fmt(report.from.pay.net, fromCurrency)}</td><td class="num">${fmt(report.to.pay.net, toCurrency)}</td></tr>
      <tr><td>Adviser-entered household costs</td><td class="num">−${fmt(report.from.annualCosts, fromCurrency)}</td><td class="num">−${fmt(report.to.annualCosts, toCurrency)}</td></tr>
      <tr><td>Spendable cash after entered costs</td><td class="num"><strong>${fmt(fromCash, fromCurrency)}</strong></td><td class="num"><strong>${fmt(toCash, toCurrency)}</strong></td></tr>
      <tr><td>Employer retirement value</td><td class="num">${fmt(report.from.retirementValue, fromCurrency)}</td><td class="num">${fmt(report.to.retirementValue, toCurrency)}</td></tr>
      <tr><td>Benefits entered by adviser</td><td class="num">${fmt(report.inputs.from.benefits, fromCurrency)}</td><td class="num">${fmt(report.inputs.to.benefits, toCurrency)}</td></tr>
      <tr><td>Equity entered by adviser</td><td class="num">${fmt(report.inputs.from.equity, fromCurrency)}</td><td class="num">${fmt(report.inputs.to.equity, toCurrency)}</td></tr>
      <tr class="sample-total"><td>Recurring package value after entered costs</td><td class="num">${fmt(report.from.recurringValue, fromCurrency)}</td><td class="num">${fmt(report.to.recurringValue, toCurrency)}</td></tr>
    </tbody>
  </table></div>`;
}

function sampleReportPage(example, report) {
  const fromCurrency = report.from.currency;
  const toCurrency = report.to.currency;
  const body = `
<header class="masthead adviser-hero">
  <p class="crumb"><a href="/advisers/">For advisers</a> / <a href="/advisers/sample-reports/">Sample reports</a></p>
  <p class="sample-badge">Fictional demonstration · not client advice</p>
  <h1>${esc(example.title)}</h1>
  <p class="standfirst">${esc(example.profile)} Every amount below is generated from the Salary Crossing calculation engine using invented case data.</p>
  <p class="adviser-actions"><a class="adviser-primary" href="report.pdf">Download the sample PDF</a><a href="mailto:hello@salarycrossing.com?subject=Salary%20Crossing%20pilot%20case">Discuss a pilot case</a></p>
</header>
<section class="sample-summary" aria-label="Comparison summary">
  <div><span>Annual recurring difference</span><b>${signed(report.difference, fromCurrency)}</b><small>in ${fromCurrency}, after entered costs and package values</small></div>
  <div><span>Take-home match</span><b>${fmt(report.equivalentDestinationGross, toCurrency)}</b><small>destination gross before household costs</small></div>
  <div><span>Cost-adjusted match</span><b>${fmt(report.costAdjustedDestinationGross, toCurrency)}</b><small>destination gross after entered household costs</small></div>
</section>
<article class="sample-report">
  <h2>Approved package comparison</h2>
  <p>The proposed package is converted at the model's exchange rate so the adviser can compare like with like. Retirement, benefits and equity remain visible instead of being presented as spendable salary.</p>
  ${comparisonRows(report)}
  <p class="sample-rate">Exchange rate used: 1 ${fromCurrency} = ${report.rate.toFixed(4)} ${toCurrency}. Rate date: ${esc(report.fxDate)}.</p>
  <h2>One-off and multi-year view</h2>
  <p>Relocation allowance of <span class="figure">${fmt(report.inputs.oneTime.allowance, toCurrency)}</span> and moving costs of <span class="figure">${fmt(report.inputs.oneTime.movingCost, toCurrency)}</span> are applied once, in the destination currency.</p>
  <div class="sample-table-wrap"><table class="sample-table">
    <thead><tr><th>Period</th><th class="num">Stay</th><th class="num">Move, converted to ${fromCurrency}</th><th class="num">Difference</th></tr></thead>
    <tbody>${report.scenarios.map((s) => `<tr><td>${s.years} year${s.years === 1 ? "" : "s"}</td><td class="num">${fmt(s.source, fromCurrency)}</td><td class="num">${fmt(s.destinationInSource, fromCurrency)}</td><td class="num">${signed(s.difference, fromCurrency)}</td></tr>`).join("")}</tbody>
  </table></div>
  <h2>Assumptions confirmed for this demonstration</h2>
  <ul>${report.inputs.assumptions.map((item) => `<li>${esc(item)}</li>`).join("")}</ul>
  <h2>Questions for professional review</h2>
  <ul>${report.inputs.unsupported.map((item) => `<li>${esc(item)}</li>`).join("")}</ul>
  <h2>Calculation record</h2>
  <p>Calculation version <span class="figure">${esc(report.calculationVersion)}</span>; ${esc(report.from.name)} tax year <span class="figure">${esc(report.taxYears.from)}</span>; ${esc(report.to.name)} tax year <span class="figure">${esc(report.taxYears.to)}</span>.</p>
  <ul>${report.sources.map((source) => `<li>${esc(source.jurisdiction)}: <a href="${esc(source.url)}">${esc(source.label)}</a></li>`).join("")}</ul>
  <div class="sample-notice"><strong>Why this is labelled as a sample</strong><p>No customer, adviser or outcome is being claimed. The case facts are fictional so a prospective adviser can inspect the format without exposing personal financial data.</p></div>
</article>`;
  return shell({
    title: `${example.title} — Sample International Compensation Report`,
    description: example.description,
    canonical: url(reportUrl(example.slug)), body, script: " ",
    jsonLd: {
      "@context": "https://schema.org", "@type": "Report", name: example.title,
      description: example.description, isPartOf: { "@type": "WebSite", name: "Salary Crossing" },
    },
  });
}

function reportPdfLines(example, report) {
  const fc = report.from.currency;
  const tc = report.to.currency;
  const cashFrom = report.from.pay.net - report.from.annualCosts;
  const cashTo = report.to.pay.net - report.to.annualCosts;
  const line = (label, left, right) => `${label}: current ${left}; proposed ${right}`;
  return [
    "FICTIONAL DEMONSTRATION - NOT CLIENT ADVICE",
    example.profile,
    `Calculation version ${report.calculationVersion}; FX date ${report.fxDate}; 1 ${fc} = ${report.rate.toFixed(4)} ${tc}.`,
    "",
    "PACKAGE COMPARISON",
    line("Gross salary and target bonus", `${fc} ${Math.round(report.inputs.from.gross + report.inputs.from.bonus).toLocaleString("en-GB")}`, `${tc} ${Math.round(report.inputs.to.gross + report.inputs.to.bonus).toLocaleString("en-GB")}`),
    line("Take-home after modelled deductions", `${fc} ${Math.round(report.from.pay.net).toLocaleString("en-GB")}`, `${tc} ${Math.round(report.to.pay.net).toLocaleString("en-GB")}`),
    line("Household costs", `${fc} ${Math.round(report.from.annualCosts).toLocaleString("en-GB")}`, `${tc} ${Math.round(report.to.annualCosts).toLocaleString("en-GB")}`),
    line("Spendable cash after entered costs", `${fc} ${Math.round(cashFrom).toLocaleString("en-GB")}`, `${tc} ${Math.round(cashTo).toLocaleString("en-GB")}`),
    line("Employer retirement value", `${fc} ${Math.round(report.from.retirementValue).toLocaleString("en-GB")}`, `${tc} ${Math.round(report.to.retirementValue).toLocaleString("en-GB")}`),
    line("Benefits", `${fc} ${Math.round(report.inputs.from.benefits).toLocaleString("en-GB")}`, `${tc} ${Math.round(report.inputs.to.benefits).toLocaleString("en-GB")}`),
    line("Equity at stated value", `${fc} ${Math.round(report.inputs.from.equity).toLocaleString("en-GB")}`, `${tc} ${Math.round(report.inputs.to.equity).toLocaleString("en-GB")}`),
    "",
    `Recurring annual difference in ${fc}: ${report.difference >= 0 ? "+" : "-"}${Math.round(Math.abs(report.difference)).toLocaleString("en-GB")}.`,
    `Destination gross that matches take-home: ${tc} ${Math.round(report.equivalentDestinationGross).toLocaleString("en-GB")}.`,
    `Destination gross that matches take-home after entered costs: ${tc} ${Math.round(report.costAdjustedDestinationGross).toLocaleString("en-GB")}.`,
    "",
    "MULTI-YEAR VIEW",
    ...report.scenarios.map((s) => `${s.years} year${s.years === 1 ? "" : "s"}: stay ${fc} ${Math.round(s.source).toLocaleString("en-GB")}; move ${fc} ${Math.round(s.destinationInSource).toLocaleString("en-GB")}; difference ${s.difference >= 0 ? "+" : "-"}${fc} ${Math.round(Math.abs(s.difference)).toLocaleString("en-GB")}.`),
    "",
    "CONFIRMED ASSUMPTIONS",
    ...report.inputs.assumptions.map((item) => `- ${item}`),
    "",
    "PROFESSIONAL REVIEW REQUIRED",
    ...report.inputs.unsupported.map((item) => `- ${item}`),
    "",
    "This is an invented case created to demonstrate report structure. It is not a testimonial, customer result or tax advice.",
  ];
}

export const adviserArticles = [{
  slug: "international-compensation-report-checklist",
  title: "International compensation report checklist",
  description: "A practical checklist for turning a payslip and cross-border offer into a reviewable client report.",
  standfirst: "A useful report preserves the evidence, separates cash from benefits and shows the adviser exactly where professional judgement is still required.",
  sections: [{
    title: "1. Capture the evidence before interpreting it",
    paragraphs: ["Keep the current payslip, offer letter, benefits schedule, bonus terms, equity documents and relocation policy with the case. Record the page or clause behind each material value. If a number has no source, label it as an assumption rather than allowing it to look confirmed."],
    bullets: ["Base salary and pay frequency", "Target and guaranteed bonus terms", "Equity type, quantity, vesting and stated value", "Employee and employer retirement contributions", "Healthcare, insurance and other employer-paid benefits", "Relocation allowance, moving costs and clawback terms"],
  }, {
    title: "2. Separate spendable cash from the wider package",
    paragraphs: ["Take-home pay, retirement contributions, employer benefits and equity answer different questions. Adding them into one unexplained total makes a package look more precise than it is. Show each component, then state exactly what a total includes."],
  }, {
    title: "3. Use household-specific costs",
    paragraphs: ["A city index cannot know whether a client needs childcare, private health cover, a second car or a particular commute. Ask for monthly estimates for housing, healthcare, childcare, transport and other recurring costs. Keep the values editable and attribute them to the client or adviser."],
  }, {
    title: "4. Compare more than the first year",
    paragraphs: ["One-off moving costs and allowances can dominate year one. Show one, three and five-year views so a relocation payment is not mistaken for recurring compensation. Keep promotions, exchange-rate changes and investment returns out of the base case unless the adviser deliberately adds a scenario."],
  }, {
    title: "5. End with questions, not false certainty",
    paragraphs: ["Residence, filing status, split years, equity taxation, social security and benefit treatment can change the result. A report should identify these issues for review and never imply that software has resolved them."],
    bullets: ["Are both tax residencies and the move date confirmed?", "Does the destination salary include compulsory retirement contributions?", "How are bonus and equity taxed and when do they vest?", "What medical costs sit outside the employer plan?", "Are any relocation payments repayable if the employee leaves?"],
  }],
}, {
  slug: "how-to-compare-an-international-offer",
  title: "How to compare an international offer without hiding the assumptions",
  description: "A transparent workflow for comparing cross-border job offers while keeping calculations, estimates and professional judgement separate.",
  standfirst: "The credible answer is rarely one salary-equivalence number. It is a short chain of sourced facts, deterministic arithmetic, household assumptions and adviser judgement.",
  sections: [{
    title: "Start with two approved compensation records",
    paragraphs: ["Create one record for the current package and one for the proposed package. The adviser should confirm every financially material value before calculation. A missing pension, employer-paid health plan or target bonus can easily matter more than a small tax difference."],
  }, {
    title: "Let software calculate only what it can defend",
    paragraphs: ["Income tax and compulsory payroll deductions should come from a versioned calculation engine with published source links. Language models can help locate a figure in a document or draft a plain-English explanation, but they should not invent a rate, choose a tax-residence position or silently fill a missing term."],
  }, {
    title: "Convert at one dated exchange rate",
    paragraphs: ["Show the rate and date next to the comparison. Do not mix rates from different days or present an exchange-rate conversion as a forecast. If currency risk matters, add clearly labelled stronger and weaker currency scenarios."],
  }, {
    title: "Show three answers",
    paragraphs: ["First, show spendable income after modelled payroll deductions. Second, subtract the household's entered recurring costs. Third, show retirement, benefits and equity alongside cash. This lets a client see whether a better total package actually improves monthly life."],
    bullets: ["Take-home match: the destination gross that produces similar after-tax pay", "Cost-adjusted match: the gross needed after the client's entered household costs", "Package comparison: cash, retirement, benefits and equity shown separately"],
  }, {
    title: "Make review limits part of the deliverable",
    paragraphs: ["List unresolved residence, filing, equity, social-security and benefit questions beside the result. This makes the report more useful to a client and gives the tax or immigration specialist a focused brief."],
  }],
}];

function articlePage(article) {
  const body = `
<header class="masthead adviser-hero">
  <p class="crumb"><a href="/advisers/">For advisers</a> / <a href="/advisers/resources/">Resources</a></p>
  <p class="eyebrow">Adviser field guide</p>
  <h1>${esc(article.title)}</h1>
  <p class="standfirst">${esc(article.standfirst)}</p>
</header>
<article class="adviser-article">
  ${article.sections.map((section) => `<section><h2>${esc(section.title)}</h2>${section.paragraphs.map((p) => `<p>${esc(p)}</p>`).join("")}${section.bullets ? `<ul>${section.bullets.map((item) => `<li>${esc(item)}</li>`).join("")}</ul>` : ""}</section>`).join("")}
  <div class="sample-notice"><strong>See the workflow applied</strong><p>Inspect the <a href="/advisers/sample-reports/">fictional sample reports</a>, including calculation versions, assumptions, review questions and source links.</p></div>
  <p class="route-cta"><a href="mailto:hello@salarycrossing.com?subject=Salary%20Crossing%20pilot%20case">Discuss a pilot case &rarr;</a></p>
</article>`;
  return shell({
    title: article.title, description: article.description,
    canonical: url(`/advisers/resources/${article.slug}/`), body, script: " ",
    jsonLd: { "@context": "https://schema.org", "@type": "Article", headline: article.title, description: article.description },
  });
}

export function adviserResourcesIndexPage() {
  const body = `
<header class="masthead adviser-hero">
  <p class="crumb"><a href="/advisers/">For advisers</a> / Resources</p>
  <p class="eyebrow">Practical resources</p>
  <h1>Inspect the method before trusting the report</h1>
  <p class="standfirst">The field guides explain the review process. The fictional reports show the exact output, assumptions and calculation record without presenting invented data as a real customer result.</p>
</header>
<section class="resource-grid">
  ${adviserArticles.map((article) => `<a href="/advisers/resources/${article.slug}/"><span>Field guide</span><strong>${esc(article.title)}</strong><small>${esc(article.description)}</small></a>`).join("")}
  <a href="/advisers/sample-reports/"><span>Demonstrations</span><strong>Three sample client reports</strong><small>UK to UAE, Australia and New York, calculated from fictional cases.</small></a>
</section>
<article>
  <h2>Built for a reviewable professional workflow</h2>
  <p>A cross-border compensation report should make four types of information easy to distinguish. Source documents establish what an employer has actually offered. A versioned engine calculates supported tax and compulsory payroll deductions. The client or adviser supplies household costs and other assumptions. The professional then resolves residence, filing, equity, social-security and legal questions that software cannot safely answer.</p>
  <p>These resources use that structure throughout. Nothing is presented as certain simply because it appears in a polished report. Material values need confirmation, calculated figures carry their rate version, and unresolved issues remain visible beside the result.</p>
  <h2>What to inspect in the demonstrations</h2>
  <ul>
    <li>Whether spendable cash is clearly separated from pension, superannuation, benefits and equity.</li>
    <li>Whether the exchange-rate date and supported tax years are easy to find.</li>
    <li>Whether one-off relocation payments are kept out of recurring annual value.</li>
    <li>Whether the one, three and five-year view reproduces the approved inputs.</li>
    <li>Whether professional-review questions are prominent enough for a client conversation.</li>
  </ul>
</article>`;
  return shell({
    title: "Resources for Global-Mobility Advisers", description: "Field guides and fictional sample reports for transparent international compensation comparisons.",
    canonical: url("/advisers/resources/"), body, script: " ",
    jsonLd: { "@context": "https://schema.org", "@type": "CollectionPage", name: "Resources for Global-Mobility Advisers" },
  });
}

export function sampleReportsIndexPage(fx) {
  const cards = examples.map((example) => {
    const report = calculateReport(example.inputs, fx);
    return `<a href="${reportUrl(example.slug)}"><span>Fictional demonstration</span><strong>${esc(example.title)}</strong><small>${signed(report.difference, report.from.currency)} annual recurring difference in ${esc(report.from.currency)} after entered costs and package values.</small></a>`;
  }).join("");
  const body = `
<header class="masthead adviser-hero">
  <p class="crumb"><a href="/advisers/">For advisers</a> / Sample reports</p>
  <p class="sample-badge">Invented case data · live calculation engine</p>
  <h1>Sample international compensation reports</h1>
  <p class="standfirst">These demonstrations show the report structure without claiming a customer, testimonial or result. Each financial figure is generated from the same versioned engine used by the adviser workspace.</p>
</header>
<section class="resource-grid">${cards}</section>
<article>
  <h2>What these reports demonstrate</h2>
  <p>Each case begins with a current package and a proposed international offer. The calculation models supported employment taxes and compulsory contributions, then adds the pension, benefits, equity, household costs and relocation amounts entered for that case. The destination package is converted using one dated exchange rate so the comparison can be reproduced.</p>
  <p>The summary shows three different answers because no single number is sufficient. The take-home match compares payroll outcomes before household costs. The cost-adjusted match adds the client's own recurring estimates. The package table then keeps retirement, employer benefits and equity visible rather than presenting them as cash salary.</p>
  <h2>What these reports do not claim</h2>
  <p>The people and offers are invented. They are not customer stories, testimonials or evidence of time saved. The demonstrations assume a full tax year and ordinary employment income within the supported jurisdictions. They do not determine residence, filing status, immigration position, equity taxation or the suitability of a move. Those questions are listed for an adviser to resolve.</p>
  <p>The report format is being tested through a paid founding pilot. The commercial test is whether advisers can use it on real cases, reduce preparation time and send the approved output to a client. Interest alone is not treated as validation.</p>
</article>`;
  return shell({
    title: "Sample International Compensation Reports", description: "Three fictional, fully disclosed international compensation reports for adviser review.",
    canonical: url("/advisers/sample-reports/"), body, script: " ",
    jsonLd: { "@context": "https://schema.org", "@type": "CollectionPage", name: "Sample International Compensation Reports" },
  });
}

export function buildAdviserResources(fx) {
  const reports = examples.map((example) => {
    const report = calculateReport(example.inputs, fx);
    return {
      slug: example.slug,
      html: sampleReportPage(example, report),
      pdf: textPdf(reportPdfLines(example, report), { title: `Salary Crossing sample: ${example.title}` }),
    };
  });
  return {
    resourceIndex: adviserResourcesIndexPage(),
    articles: adviserArticles.map((article) => ({ slug: article.slug, html: articlePage(article) })),
    reportIndex: sampleReportsIndexPage(fx),
    reports,
    paths: [
      "/advisers/resources/",
      ...adviserArticles.map((article) => `/advisers/resources/${article.slug}/`),
      "/advisers/sample-reports/",
      ...examples.map((example) => reportUrl(example.slug)),
    ],
  };
}
