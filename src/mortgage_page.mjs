import { affordability, DEFAULT_MULTIPLE, STRESS_UPLIFT } from "./mortgage.mjs";
import { money } from "./tax.mjs";
import { YEAR_LABEL } from "./rates.mjs";
import { BASE, url } from "./site.mjs";
import { shell } from "./render.mjs";
import { assets } from "./assets.mjs";

const DEFAULTS = { income1: 45000, income2: 0, deposit: 40000, monthlyDebts: 0, rate: 4.5, termYears: 25 };

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
    <tr><th scope="row">If rates rose ${STRESS_UPLIFT} points</th><td class="num">${money(r.stressed)}</td></tr>
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
      { good: "Comfortable", tight: "Tight", over: "A stretch", none: "&mdash;" }[r.verdict.level]}</dd>
    <small id="m-verdict-note">${r.verdict.text}</small>
  </div>
</dl>`;
}

export function mortgagePage() {
  const r = affordability(DEFAULTS);

  const body = `
<header class="masthead">
  <p class="eyebrow">Tax year ${YEAR_LABEL} &middot; ${DEFAULT_MULTIPLE}x loan-to-income ceiling</p>
  <h1>How much house can you <em>actually</em> afford</h1>
  <p class="standfirst">Lenders measure the payment against your gross salary. You pay it out of your take-home. This works out both, using the same tax engine as the <a href="${BASE}/">take-home calculator</a>, so the percentage you see is the one that will actually land on your bank statement.</p>
</header>

<div class="work">
  <div class="panel">${form(DEFAULTS)}</div>
  <div class="panel slip" id="m-slip">${result(r)}</div>
</div>

<article>
  <h2>The multiple is a ceiling, not a target</h2>
  <p>Regulators cap lending at <strong>4.5 times income</strong> for all but 15% of a lender's new mortgages, so most people are quoted a maximum of 4.5x and treat it as the budget. Run the numbers at that maximum and the monthly payment comes to roughly <strong>35 to 43% of take-home pay</strong> &mdash; at every income from £25,000 to £150,000. Push it through the stress test and it clears half.</p>
  <p>That is not a coincidence, it is what the ceiling means: it is the point at which lending stops, not the point at which it is comfortable. If you want the payment under a third of your net pay, you are looking at roughly 3.5x, not 4.5x.</p>

  <h2>Why two salaries beat one</h2>
  <p>Two people earning £30,000 each and one person earning £60,000 will be offered the same mortgage &mdash; the multiple is applied to gross household income either way. But the couple takes home more, because they get two personal allowances and two goes at the basic-rate band. Same loan, more money to pay it with.</p>

  <h2>The stress test</h2>
  <p>Lenders do not check whether you can afford today's rate. They check a rate several points higher, so that a remortgage in five years does not sink you. This page uses ${STRESS_UPLIFT} percentage points above whatever rate you enter, which is the conventional margin. If the stressed figure is over 40% of your take-home, expect a lender to offer you less than the multiple suggests.</p>

  <h2>What the deposit really buys</h2>
  <p>A deposit does two things. It caps how much you can borrow at 95% of the price, and it decides which rate tier you land in. Lenders price in bands &mdash; 95%, 90%, 85%, 75%, 60% &mdash; and the gap between them is real money over 25 years. Getting from a 90% to an 85% deposit is often worth more than a pay rise.</p>
</article>`;

  return shell({
    title: `Mortgage Affordability Calculator ${YEAR_LABEL} — What You Can Borrow`,
    description: `Work out what a UK lender will lend you and whether you can afford it, measured against your real take-home pay rather than gross salary. Includes the ${STRESS_UPLIFT}-point stress test.`,
    canonical: url("/mortgage/"),
    body,
    script: mortgageScript(),
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: `Mortgage Affordability Calculator ${YEAR_LABEL}`,
      applicationCategory: "FinanceApplication",
      operatingSystem: "Any",
      offers: { "@type": "Offer", price: "0", priceCurrency: "GBP" },
    },
  });
}

const mortgageScript = () => `<script type="module">
import { affordability, STRESS_UPLIFT } from "${BASE}${assets.js}/mortgage.mjs";
import { money } from "${BASE}${assets.js}/tax.mjs";

const $ = (id) => document.getElementById(id);
const num = (id) => Number($(id).value) || 0;
const VERDICT = { good: "Comfortable", tight: "Tight", over: "A stretch", none: "\\u2014" };

function update() {
  const r = affordability({
    income1: num("income1"), income2: num("income2"), deposit: num("deposit"),
    monthlyDebts: num("monthlyDebts"), rate: num("rate"),
    termYears: num("termYears") || 25, multiple: Number($("multiple").value),
  });

  $("m-price").textContent = money(r.price);
  $("m-loan").textContent = money(r.loan);
  $("m-ltv").textContent = (r.ltv * 100).toFixed(0) + "% LTV";

  $("m-rows").innerHTML =
    \`<tr><th scope="row">Monthly payment</th><td class="num">\${money(r.payment)}</td></tr>
     <tr><th scope="row">Your take-home pay</th><td class="num">\${money(r.netMonthly)}</td></tr>
     <tr class="sub"><td>the payment is this much of it</td><td class="num">\${(r.share * 100).toFixed(0)}%</td></tr>
     <tr><th scope="row">If rates rose \${STRESS_UPLIFT} points</th><td class="num">\${money(r.stressed)}</td></tr>
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
update();
</script>`;
