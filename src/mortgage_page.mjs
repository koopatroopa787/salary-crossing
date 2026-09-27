import { affordability, DEFAULT_MULTIPLE, STRESS_UPLIFT } from "./mortgage.mjs";
import { money } from "./tax.mjs";
import { YEAR_LABEL } from "./rates.mjs";
import { BASE, url } from "./site.mjs";
import { shell } from "./render.mjs";
import { assets } from "./assets.mjs";

const DEFAULTS = { income1: 45000, income2: 0, deposit: 40000, monthlyDebts: 0, rate: 4.5, termYears: 25 };

const salaryBorrowingTable = () => {
  const salaries = [20000, 30000, 40000, 50000, 60000, 70000, 100000];
  const rows = salaries.map((salary) => `
    <tr>
      <th scope="row"><a href="${BASE}/salary/${salary}/">${money(salary)}</a></th>
      <td class="num">${money(salary * 4)}</td>
      <td class="num keep">${money(salary * 4.5)}</td>
      <td class="num">${money(salary * 5)}</td>
    </tr>`).join("");

  return `<div class="raise">
  <table>
    <caption>Mortgage by salary before deposit and affordability checks</caption>
    <thead><tr><th scope="col">Annual salary</th><th class="num" scope="col">4x</th><th class="num" scope="col">4.5x</th><th class="num" scope="col">5x</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
</div>`;
};

const requiredIncomeTable = () => {
  const loans = [100000, 150000, 200000, 250000, 300000, 400000];
  return `<div class="raise">
  <table>
    <caption>Salary needed at a 4.5x income multiple</caption>
    <thead><tr><th scope="col">Mortgage</th><th class="num" scope="col">Minimum gross income</th></tr></thead>
    <tbody>${loans.map((loan) => `<tr><th scope="row">${money(loan)}</th><td class="num">${money(Math.ceil(loan / 4.5))}</td></tr>`).join("")}</tbody>
  </table>
</div>`;
};

function form(d) {
  return `
<form id="m" autocomplete="off">
  <div class="field">
    <label for="income1">Your annual income</label>
    <div class="money-input"><span>£</span>
      <input type="number" id="income1" value="${d.income1}" min="0" max="10000000" step="1000" inputmode="numeric"></div>
  </div>
  <div class="field">
    <label for="income2">Second applicant (optional)</label>
    <div class="money-input"><span>£</span>
      <input type="number" id="income2" value="${d.income2}" min="0" max="10000000" step="1000" inputmode="numeric"></div>
  </div>
  <div class="field">
    <label for="deposit">Deposit</label>
    <div class="money-input"><span>£</span>
      <input type="number" id="deposit" value="${d.deposit}" min="0" max="10000000" step="1000" inputmode="numeric"></div>
  </div>
  <div class="field">
    <label for="monthlyDebts">Monthly credit commitments</label>
    <div class="money-input"><span>£</span>
      <input type="number" id="monthlyDebts" value="${d.monthlyDebts}" min="0" max="20000" step="25" inputmode="numeric"></div>
    <p class="hint">Car finance, loans, card minimums. Not rent or bills.</p>
  </div>
  <div class="split">
    <div class="field">
      <label for="rate">Interest rate</label>
      <div class="money-input">
        <input type="number" id="rate" value="${d.rate}" min="0" max="20" step="0.05" style="padding-left:12px"></div>
      <p class="hint">% &mdash; use the rate you've been quoted.</p>
    </div>
    <div class="field">
      <label for="termYears">Term</label>
      <div class="money-input">
        <input type="number" id="termYears" value="${d.termYears}" min="5" max="40" step="1" style="padding-left:12px"></div>
      <p class="hint">years</p>
    </div>
  </div>
  <div class="field">
    <label for="multiple">Income multiple</label>
    <select id="multiple">
      <option value="4">4x &mdash; cautious</option>
      <option value="4.5" selected>4.5x &mdash; the usual ceiling</option>
      <option value="5">5x &mdash; some lenders</option>
      <option value="5.5">5.5x &mdash; professionals, high earners</option>
    </select>
  </div>
</form>`;
}

function result(r) {
  return `
<div class="headline">
  <div>
    <div class="big" id="m-price">${money(r.price)}</div>
    <div class="unit">the most you could buy</div>
  </div>
  <div class="annual">
    borrowing<b id="m-loan">${money(r.loan)}</b>
    <span id="m-ltv">${(r.ltv * 100).toFixed(0)}% LTV</span>
  </div>
</div>
<table>
  <caption>Month to month</caption>
  <tbody id="m-rows">
    <tr><th scope="row">Monthly payment</th><td class="num">${money(r.payment)}</td></tr>
    <tr><th scope="row">Your take-home pay</th><td class="num">${money(r.netMonthly)}</td></tr>
    <tr class="sub"><td>the payment is this much of it</td><td class="num">${(r.share * 100).toFixed(0)}%</td></tr>
    <tr><th scope="row">Illustration: rate ${STRESS_UPLIFT} points higher</th><td class="num">${money(r.stressed)}</td></tr>
    <tr class="sub"><td>which would be</td><td class="num">${(r.stressedShare * 100).toFixed(0)}% of take-home</td></tr>
  </tbody>
</table>
<dl class="rates">
  <div>
    <dt>Limited by</dt>
    <dd id="m-limit" style="font-size:17px">${r.limitedBy === "income" ? "Your income" : "Your deposit"}</dd>
    <small id="m-limit-note">${r.limitedBy === "income"
      ? `${r.multiple}x household income is the ceiling here.`
      : `You can borrow 95% of the price at most, so the deposit sets it.`}</small>
  </div>
  <div>
    <dt>Verdict</dt>
    <dd id="m-verdict" style="font-size:17px" class="${r.verdict.level === "over" ? "warn" : ""}">${
      { good: "Lower pressure", tight: "Rate-sensitive", over: "High payment share", none: "&mdash;" }[r.verdict.level]}</dd>
    <small id="m-verdict-note">${r.verdict.text}</small>
  </div>
</dl>`;
}

export function mortgagePage() {
  const r = affordability(DEFAULTS);

  const body = `
<header class="masthead">
  <p class="eyebrow">UK mortgage calculator &middot; tax year ${YEAR_LABEL}</p>
  <h1>How much mortgage can I afford on my <em>salary?</em></h1>
  <p class="standfirst">Enter your salary, deposit, debts and interest rate to estimate how much you could borrow, the property price it supports and the monthly payment as a percentage of your real take-home pay.</p>
</header>

<div class="work">
  <div class="panel">${form(DEFAULTS)}</div>
  <div class="panel slip" id="m-slip">${result(r)}</div>
</div>

<article>
  <h2>What mortgage can I get on my salary?</h2>
  <p>UK lenders commonly start with a loan of around 4 to 4.5 times the applicants' combined gross income. Some lend 5 times income or more in narrower cases. That first number is only a ceiling: the deposit, regular debts, loan term, interest rate and the lender's own affordability test can all reduce it.</p>
  ${salaryBorrowingTable()}

  <h2>How many times my salary can I borrow?</h2>
  <p><strong>4.5 times household income is a useful upper estimate, not a promise.</strong> At that multiple, a £30,000 salary points to a £135,000 mortgage, £40,000 to £180,000 and £50,000 to £225,000 before the lender checks the rest of the application. Use the calculator above for a payment and deposit check rather than relying on the multiple alone.</p>

  <h2>What salary do I need for a £200,000 or £250,000 mortgage?</h2>
  <p>At 4.5 times income, a £200,000 mortgage needs roughly £44,445 of combined gross income and a £250,000 mortgage roughly £55,556. A lender can require more if you have debts, dependants, a short term or other committed spending.</p>
  ${requiredIncomeTable()}

  <h2>What percentage of salary should go on a mortgage?</h2>
  <p>There is no universal safe percentage because the payment comes from take-home pay while lenders quote income multiples against gross pay. MoneyHelper says people commonly spend 28% to 35% of income on a mortgage, but also says there is no single percentage everyone should target. This calculator shows the payment as a share of net monthly income and adds an illustrative payment at a rate ${STRESS_UPLIFT} percentage points higher. That scenario is a household resilience check, not a prediction of the rate or amount a lender will use.</p>

  <h2>The multiple is a ceiling, not a target</h2>
  <p>The Bank of England's flow limit is designed to keep mortgages at or above <strong>4.5 times income</strong> to no more than 15% of new lending in aggregate. Individual lenders and products vary, but 4.5x remains a useful working ceiling. Run the numbers at that maximum and the monthly payment comes to <strong>36% of take-home pay at £30,000, rising to 49% at £150,000</strong>. It rises with income, because the multiple is applied to gross while the payment comes out of net. In this page's three-point-higher illustration, it reaches two thirds.</p>
  <p>That is not a coincidence, it is what the ceiling means: it is the point at which lending stops, not the point at which it is comfortable. If you want the payment under a third of your net pay, you are looking at roughly 3.5x, not 4.5x. The full arithmetic is in <a href="${BASE}/insights/four-and-a-half-times-income/">4.5&times; is a ceiling, not a budget</a>.</p>

  <h2>Why two salaries beat one</h2>
  <p>Two people earning £30,000 each and one person earning £60,000 will be offered the same mortgage &mdash; the multiple is applied to gross household income either way. But the couple takes home more, because they get two personal allowances and two goes at the basic-rate band. Same loan, more money to pay it with.</p>

  <h2>How lenders test affordability</h2>
  <p>Lenders assess income, debts and regular spending, and many must consider the effect of likely interest-rate rises during the first five years. The FCA does not prescribe one uplift for every application: lenders can design their own approach, and an initial fixed rate lasting at least five years is generally exempt from that particular future-rate test. This page therefore shows a simple <strong>rate plus ${STRESS_UPLIFT} percentage points</strong> scenario so you can see how your own monthly budget would respond. It does not reproduce any lender's underwriting model or predict a lending decision.</p>

  <h2>What the deposit really buys</h2>
  <p>A deposit does two things. It caps how much you can borrow at 95% of the price, and it decides which rate tier you land in. Lenders price in bands &mdash; 95%, 90%, 85%, 75%, 60% &mdash; and the gap between them is real money over 25 years. Getting from a 90% to an 85% deposit is often worth more than a pay rise.</p>

  <h2>Budgeting for repairs after you buy</h2>
  <p>A survey can turn up a boiler, rewiring, windows or other work that sits outside the mortgage payment. If you already have a contractor's price, <a href="https://getfairprice.app/">GetFairPrice</a> &mdash; another independent tool from the same maker &mdash; compares the quote with an indicative market range and gives you questions to ask before accepting it.</p>

  <h2>Sources and methodology</h2>
  <p>This is an independent planning illustration, last reviewed on 27 September 2026. It applies the selected income multiple and deposit limit, calculates a standard capital-and-interest payment, then compares that payment with estimated UK take-home pay. A lender will use its own product rules, credit checks and affordability model.</p>
  <ul>
    <li><a href="https://www.moneyhelper.org.uk/en/homes/buying-a-home/mortgage-affordability-calculator">MoneyHelper mortgage affordability guidance</a> &mdash; income, spending, debts and the usual 4.5-times starting ceiling.</li>
    <li><a href="https://www.fca.org.uk/firms/interest-rate-stress-test-rule">FCA interest-rate stress-test rule</a> &mdash; how lenders may assess likely future rate rises and when the rule does not apply.</li>
    <li><a href="https://www.bankofengland.co.uk/financial-stability-report/2026/july-2026">Bank of England Financial Stability Report, July 2026</a> &mdash; the current high loan-to-income flow limit and market context.</li>
  </ul>
</article>`;

  return shell({
    title: `How Much Mortgage Can I Afford on My Salary? UK ${YEAR_LABEL}`,
    description: `UK mortgage calculator based on salary, deposit, debts and take-home pay. Estimate what you can borrow, monthly payments and the income needed for a mortgage.`,
    canonical: url("/mortgage/"),
    body,
    script: mortgageScript(),
    jsonLd: {
      "@context": "https://schema.org",
      "@graph": [{
        "@type": "WebApplication",
        name: `UK Mortgage Calculator by Salary ${YEAR_LABEL}`,
        applicationCategory: "FinanceApplication",
        operatingSystem: "Any",
        dateModified: "2026-09-27",
        offers: { "@type": "Offer", price: "0", priceCurrency: "GBP" },
      }, {
        "@type": "FAQPage",
        mainEntity: [{
          "@type": "Question",
          name: "How much mortgage can I afford on my salary?",
          acceptedAnswer: { "@type": "Answer", text: "A rough UK starting point is 4 to 4.5 times combined gross income, but deposit, debts, interest rate, loan term and lender affordability checks can reduce the amount." },
        }, {
          "@type": "Question",
          name: "How much income do I need for a £200,000 mortgage?",
          acceptedAnswer: { "@type": "Answer", text: "At a 4.5 times income multiple, a £200,000 mortgage requires about £44,445 of combined gross annual income before other affordability checks." },
        }, {
          "@type": "Question",
          name: "How much income do I need for a £250,000 mortgage?",
          acceptedAnswer: { "@type": "Answer", text: "At a 4.5 times income multiple, a £250,000 mortgage requires about £55,556 of combined gross annual income before other affordability checks." },
        }],
      }],
    },
  });
}

const mortgageScript = () => `<script type="module">
import { affordability, STRESS_UPLIFT } from "${BASE}${assets.js}/mortgage.mjs";
import { money } from "${BASE}${assets.js}/tax.mjs";

const $ = (id) => document.getElementById(id);
const num = (id, min = 0, max = 10000000, fallback = 0) => {
  const n = Number($(id).value);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};
const VERDICT = { good: "Lower pressure", tight: "Rate-sensitive", over: "High payment share", none: "\\u2014" };

function update() {
  const r = affordability({
    income1: num("income1"), income2: num("income2"), deposit: num("deposit"),
    monthlyDebts: num("monthlyDebts", 0, 20000), rate: num("rate", 0, 20, 4.5),
    termYears: num("termYears", 5, 40, 25), multiple: Number($("multiple").value),
  });

  $("m-price").textContent = money(r.price);
  $("m-loan").textContent = money(r.loan);
  $("m-ltv").textContent = (r.ltv * 100).toFixed(0) + "% LTV";

  $("m-rows").innerHTML =
    \`<tr><th scope="row">Monthly payment</th><td class="num">\${money(r.payment)}</td></tr>
     <tr><th scope="row">Your take-home pay</th><td class="num">\${money(r.netMonthly)}</td></tr>
     <tr class="sub"><td>the payment is this much of it</td><td class="num">\${(r.share * 100).toFixed(0)}%</td></tr>
     <tr><th scope="row">Illustration: rate \${STRESS_UPLIFT} points higher</th><td class="num">\${money(r.stressed)}</td></tr>
     <tr class="sub"><td>which would be</td><td class="num">\${(r.stressedShare * 100).toFixed(0)}% of take-home</td></tr>\`;

  $("m-limit").textContent = r.limitedBy === "income" ? "Your income" : "Your deposit";
  $("m-limit-note").textContent = r.limitedBy === "income"
    ? r.multiple + "x household income is the ceiling here."
    : "You can borrow 95% of the price at most, so the deposit sets it.";

  const v = $("m-verdict");
  v.textContent = VERDICT[r.verdict.level];
  v.classList.toggle("warn", r.verdict.level === "over");
  $("m-verdict-note").textContent = r.verdict.text;
}

$("m").addEventListener("input", update);
$("m").addEventListener("change", (event) => {
  const input = event.target;
  if (input.matches('input[type="number"]')) {
    const min = input.min === "" ? -Infinity : Number(input.min);
    const max = input.max === "" ? Infinity : Number(input.max);
    const value = Number(input.value);
    input.value = String(Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : Number(input.defaultValue));
    update();
  }
});
update();
</script>`;
