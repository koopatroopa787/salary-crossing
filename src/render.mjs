/**
 * HTML for every page on the site.
 *
 * The salary pages are generated, not written, but each one answers a query
 * with a genuinely different number and a genuinely different situation —
 * £34,000 and £110,000 are not the same page with a word swapped. That is the
 * line between programmatic SEO and the thin content Google throws away.
 */
import { takeHome, money } from "./tax.mjs";
import { YEAR_LABEL, YEAR_RANGE, REGIONS, PERSONAL_ALLOWANCE } from "./rates.mjs";
import { BASE, SITE_NAME, CONTACT, AUTHOR, url } from "./site.mjs";
import { assets } from "./assets.mjs";

const esc = (s) => String(s).replace(/[&<>"]/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

const FONTS = "https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,300..600;1,6..72,300..500"
  + "&family=Public+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap";

export function shell({ title, description, canonical, body, jsonLd, script }) {
  return `<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${canonical}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${FONTS}">
<link rel="stylesheet" href="${BASE}${assets.style}">
${jsonLd ? `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>` : ""}
</head>
<body>
<div class="shell">
<nav class="top">
  <a class="brand" href="${BASE}/">${esc(SITE_NAME)}</a>
  <a href="${BASE}/compare/">Compare</a>
  <a href="${BASE}/take-home/">UK take-home</a>
  <a href="${BASE}/mortgage/">Mortgage</a>
  <a href="${BASE}/salaries/">Every salary</a>
</nav>
${body}
<footer>
  <p>Figures are for a single employee on PAYE with a standard tax code, paid the same amount each month. National Insurance is worked out per pay period in real life, so an uneven year &mdash; a bonus month, a mid-year job change &mdash; will differ. This is an estimate, not tax advice.</p>
  <p>Rates for ${YEAR_LABEL} (${YEAR_RANGE}) checked against <a href="https://www.gov.uk/income-tax-rates">gov.uk income tax rates</a>, <a href="https://www.gov.uk/scottish-income-tax">Scottish income tax</a>, <a href="https://www.gov.uk/national-insurance-rates-letters">National Insurance rates</a> and <a href="https://www.gov.uk/repaying-your-student-loan/what-you-pay">student loan repayment</a>.</p>
  ${AUTHOR.name ? `<p>Written and maintained by ${esc(AUTHOR.name)}. ${esc(AUTHOR.bio)}</p>` : ""}
  <p>Questions or a figure that looks wrong: <a href="mailto:${CONTACT}">${CONTACT}</a></p>
</footer>
</div>
${script ?? calculatorScript()}
</body>
</html>
`;
}

/* ── the interactive widget, shared by every page ────────────────────────── */

function calculatorForm(salary, region = "uk") {
  return `
<div class="work">
  <div class="panel">
    <form id="f" autocomplete="off">
      <div class="field">
        <label for="salary">Gross annual salary</label>
        <div class="money-input">
          <span>£</span>
          <input type="number" id="salary" value="${salary}" min="0" max="10000000" step="500" inputmode="numeric">
        </div>
      </div>
      <div class="field">
        <label for="region">Where you pay tax</label>
        <select id="region">
          <option value="uk"${region === "uk" ? " selected" : ""}>England, Wales &amp; N. Ireland</option>
          <option value="scotland"${region === "scotland" ? " selected" : ""}>Scotland</option>
        </select>
        <p class="hint">Scotland sets its own bands and has six of them.</p>
      </div>
      <div class="split">
        <div class="field">
          <label for="pensionPct">Pension</label>
          <div class="money-input">
            <input type="number" id="pensionPct" value="0" min="0" max="100" step="0.5" style="padding-left:12px">
          </div>
          <p class="hint">% of salary</p>
        </div>
        <div class="field">
          <label for="pensionType">Scheme</label>
          <select id="pensionType">
            <option value="net-pay" selected>Net pay / auto-enrolment</option>
            <option value="salary-sacrifice">Salary sacrifice</option>
          </select>
          <p class="hint">Sacrifice also cuts NI.</p>
        </div>
      </div>
      <fieldset>
        <legend>Student loan</legend>
        <div class="checks">
          <label class="check"><input type="checkbox" value="plan1"> Plan 1</label>
          <label class="check"><input type="checkbox" value="plan2"> Plan 2</label>
          <label class="check"><input type="checkbox" value="plan4"> Plan 4</label>
          <label class="check"><input type="checkbox" value="plan5"> Plan 5</label>
          <label class="check"><input type="checkbox" value="pg"> Postgrad</label>
        </div>
      </fieldset>
    </form>
  </div>
  ${payslip(salary, region)}
</div>`;
}

/**
 * Rendered at build time from the same module the browser runs, so the number
 * a crawler reads is the number a visitor sees before any JavaScript loads.
 */
function payslip(salary, region) {
  const r = takeHome({ salary, region });
  const rows = [
    `<tr><th scope="row">Gross salary</th><td class="num">${money(r.gross)}</td></tr>`,
    `<tr class="deduct"><th scope="row">Income tax</th><td class="num">${money(r.incomeTax)}</td></tr>`,
    ...r.incomeTaxBands.map((b) =>
      `<tr class="sub"><td>${b.name} at ${Math.round(b.rate * 100)}% on ${money(b.amount)}</td><td class="num">${money(b.tax)}</td></tr>`),
    `<tr class="deduct"><th scope="row">National Insurance</th><td class="num">${money(r.nationalInsurance)}</td></tr>`,
    `<tr class="total"><td>Take-home pay</td><td class="num">${money(r.net)}</td></tr>`,
  ].join("\n          ");

  return `
  <div class="panel slip">
    <div class="headline">
      <div>
        <div class="big" id="monthly">${money(r.monthly)}</div>
        <div class="unit">per month, after everything</div>
      </div>
      <div class="annual">
        a year<b id="annual">${money(r.net)}</b>
        <span id="weekly">${money(r.weekly)} a week</span>
      </div>
    </div>
    <table>
      <caption>How it breaks down</caption>
      <tbody id="rows">
          ${rows}
      </tbody>
    </table>
    <dl class="rates">
      <div>
        <dt>Overall tax rate</dt>
        <dd id="eff">${(r.effectiveRate * 100).toFixed(1)}%</dd>
        <small>Tax and NI as a share of the whole salary.</small>
      </div>
      <div>
        <dt>On your next £100</dt>
        <dd id="marg"${r.marginalRate >= 0.6 ? ' class="warn"' : ""}>${Math.round(r.marginalRate * 100)}%</dd>
        <small id="marg-note">${marginalNote(r.marginalRate, salary)}</small>
      </div>
    </dl>
  </div>`;
}

function marginalNote(rate, salary) {
  if (rate >= 0.6) return "You are inside the personal-allowance taper. Every pound also destroys 50p of allowance.";
  if (salary < PERSONAL_ALLOWANCE) return "Below the personal allowance and the NI threshold.";
  if (rate >= 0.4) return "Higher-rate tax, but National Insurance has dropped to 2%.";
  return "Basic rate plus National Insurance.";
}

/* ── the explainer, shared ───────────────────────────────────────────────── */

const EXPLAINER = `
<article>
  <h2>Why the second number matters more than the first</h2>
  <p>Most calculators stop at the take-home figure. The more useful number is the <strong>marginal rate</strong> &mdash; what the taxman takes from the next pound you earn &mdash; because that is what decides whether a pay rise, a bonus, or an extra shift is worth it.</p>
  <p>For most people it is <span class="figure">28%</span>: twenty pence of income tax and eight pence of National Insurance in every pound. Cross <span class="figure">£50,270</span> and it becomes <span class="figure">42%</span>, because income tax steps up to 40% while NI drops to 2%. Add a Plan 2 student loan and it is <span class="figure">51%</span>.</p>

  <h2>The 60% band nobody legislated</h2>
  <p>Between <span class="figure">£100,000</span> and <span class="figure">£125,140</span> the personal allowance is withdrawn at £1 for every £2 earned. You are taxed at 40% on the pound itself, and at 40% again on the 50p of allowance it destroys. With National Insurance that is an effective <strong>62% on every pound in that band</strong> &mdash; a higher rate than anyone pays at £1,000,000.</p>
  <p>This is why a £5,000 rise from £100,000 to £105,000 hands you about £1,900. Putting the same £5,000 into a pension instead costs you roughly £1,900 of take-home and puts £5,000 into your pot.</p>

  <h2>Salary sacrifice versus a normal pension</h2>
  <p>Both get you full income tax relief. Only salary sacrifice avoids National Insurance, because the pay never legally becomes yours &mdash; your employer contributes it directly.</p>
  <ul>
    <li><strong>Net pay / auto-enrolment:</strong> the contribution comes out before income tax, but after NI.</li>
    <li><strong>Salary sacrifice:</strong> comes out before both, so a basic-rate taxpayer keeps an extra 8% of whatever they contribute, and it lowers student loan repayments too.</li>
  </ul>
  <p>On a £50,000 salary contributing 10%, that difference is <span class="figure">£400</span> a year for the identical £5,000 going into the pension.</p>
</article>`;

/* ── pages ───────────────────────────────────────────────────────────────── */

export function takeHomePage() {
  const body = `
<header class="masthead">
  <p class="eyebrow">Tax year ${YEAR_LABEL} &middot; ${YEAR_RANGE}</p>
  <h1>What actually lands in <em>your</em> account</h1>
  <p class="standfirst">Your salary is not your pay. Put the headline figure in and see it broken down the way your payslip does it &mdash; including the rate you'll pay on your <em>next</em> pound, which is the number that decides whether a raise is worth taking.</p>
</header>
${calculatorForm(35000)}
${EXPLAINER}`;

  return shell({
    title: `UK Take-Home Pay Calculator ${YEAR_LABEL}`,
    description: `Work out your take-home pay for the ${YEAR_LABEL} tax year. Income tax, National Insurance, student loan and pension, plus the marginal rate on your next pound.`,
    canonical: url("/take-home/"),
    body,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: `UK Take-Home Pay Calculator ${YEAR_LABEL}`,
      applicationCategory: "FinanceApplication",
      operatingSystem: "Any",
      offers: { "@type": "Offer", price: "0", priceCurrency: "GBP" },
    },
  });
}

/** One sentence that is actually different for every salary. */
function situation(salary, r) {
  const bits = [];
  const band = r.incomeTaxBands.at(-1);

  if (salary <= PERSONAL_ALLOWANCE) {
    bits.push(`At £${salary.toLocaleString("en-GB")} you are under the £12,570 personal allowance, so you pay no income tax and no National Insurance at all.`);
  } else if (r.marginalRate >= 0.6) {
    bits.push(`£${salary.toLocaleString("en-GB")} sits inside the personal-allowance taper, the worst-value stretch of the whole income tax system: every extra pound costs you ${Math.round(r.marginalRate * 100)}p.`);
  } else if (band && band.rate >= 0.4) {
    const over = salary - 50270;
    bits.push(`£${salary.toLocaleString("en-GB")} is a higher-rate salary &mdash; ${money(over)} of it is taxed at 40%.`);
  } else {
    const room = 50270 - salary;
    bits.push(`£${salary.toLocaleString("en-GB")} is a basic-rate salary, with ${money(room)} of headroom before the 40% band starts at £50,270.`);
  }

  bits.push(`You keep <b>${money(r.net)}</b> of it, which is ${money(r.monthly)} a month.`);
  return bits.join(" ");
}

/** What one more £1,000 of salary is actually worth here. */
function raiseTable(salary, region) {
  const steps = [-2000, -1000, 0, 1000, 2000, 5000].map((d) => salary + d).filter((s) => s > 0);
  const rows = steps.map((s) => {
    const r = takeHome({ salary: s, region });
    const base = takeHome({ salary, region });
    const diff = r.net - base.net;
    const here = s === salary;
    return `<tr class="${here ? "here" : ""}">
      <th scope="row">${money(s)}</th>
      <td class="num">${money(r.monthly)}</td>
      <td class="num">${money(r.net)}</td>
      <td class="num keep">${here ? "&mdash;" : (diff >= 0 ? "+" : "&minus;") + money(Math.abs(diff))}</td>
    </tr>`;
  }).join("\n");

  return `
<div class="raise">
  <table>
    <caption>What a change in salary is actually worth</caption>
    <thead><tr><th scope="col">Gross</th><th class="num" scope="col">Monthly</th><th class="num" scope="col">Take-home</th><th class="num" scope="col">Difference</th></tr></thead>
    <tbody>
${rows}
    </tbody>
  </table>
</div>`;
}

export function salaryPage(salary, neighbours) {
  const r = takeHome({ salary });
  const pretty = "£" + salary.toLocaleString("en-GB");

  const body = `
<p class="crumb"><a href="${BASE}/">Calculator</a> / <a href="${BASE}/salaries/">Every salary</a> / ${pretty}</p>
<header class="masthead">
  <p class="eyebrow">Tax year ${YEAR_LABEL}</p>
  <h1>${pretty} after tax</h1>
  <p class="verdict">${situation(salary, r)}</p>
</header>
${calculatorForm(salary)}
${raiseTable(salary)}
<ul class="neighbours">
  ${neighbours.map((n) => `<li><a href="${BASE}/salary/${n}/">£${n.toLocaleString("en-GB")} after tax</a></li>`).join("\n  ")}
</ul>
${EXPLAINER}`;

  return shell({
    title: `${pretty} After Tax ${YEAR_LABEL} — Take-Home Pay`,
    description: `${pretty} a year is ${money(r.net)} after tax, or ${money(r.monthly)} a month, for ${YEAR_LABEL}. Full breakdown of income tax, National Insurance and your marginal rate.`,
    canonical: url(`/salary/${salary}/`),
    body,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [{
        "@type": "Question",
        name: `How much is ${pretty} after tax in the UK?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `${pretty} a year is ${money(r.net)} after tax and National Insurance in ${YEAR_LABEL}, which is ${money(r.monthly)} a month. Income tax takes ${money(r.incomeTax)} and National Insurance ${money(r.nationalInsurance)}.`,
        },
      }],
    },
  });
}

export function indexPage(salaries) {
  const groups = [
    ["Under £30,000", salaries.filter((s) => s < 30000)],
    ["£30,000 to £59,999", salaries.filter((s) => s >= 30000 && s < 60000)],
    ["£60,000 to £99,999", salaries.filter((s) => s >= 60000 && s < 100000)],
    ["£100,000 and above", salaries.filter((s) => s >= 100000)],
  ];

  const body = `
<header class="masthead">
  <p class="eyebrow">Tax year ${YEAR_LABEL}</p>
  <h1>Take-home pay, salary by salary</h1>
  <p class="standfirst">Every salary worked out in full for ${YEAR_LABEL}, including what the next £1,000 is actually worth at that point on the scale.</p>
</header>
${groups.filter(([, list]) => list.length).map(([label, list]) => `
<h2 style="font-family:'Instrument Serif',Georgia,serif;font-weight:400;font-size:24px;margin:32px 0 8px">${label}</h2>
<ul class="neighbours">
  ${list.map((s) => `<li><a href="${BASE}/salary/${s}/">£${s.toLocaleString("en-GB")}</a></li>`).join("\n  ")}
</ul>`).join("")}`;

  return shell({
    title: `UK Take-Home Pay by Salary ${YEAR_LABEL}`,
    description: `Take-home pay worked out for every salary from £15,000 to £200,000 for the ${YEAR_LABEL} tax year.`,
    canonical: url("/salaries/"),
    body,
  });
}

const calculatorScript = () => `<script type="module">
import { takeHome, money } from "${BASE}${assets.js}/tax.mjs";
import { PERSONAL_ALLOWANCE } from "${BASE}${assets.js}/rates.mjs";

const $ = (id) => document.getElementById(id);
const rowsEl = $("rows");
if (rowsEl) {
  const row = (label, value, cls = "") =>
    \`<tr class="\${cls}"><th scope="row">\${label}</th><td class="num">\${money(value)}</td></tr>\`;

  const note = (rate, salary) => {
    if (rate >= 0.6) return "You are inside the personal-allowance taper. Every pound also destroys 50p of allowance.";
    if (salary < PERSONAL_ALLOWANCE) return "Below the personal allowance and the NI threshold.";
    if (rate >= 0.4) return "Higher-rate tax, but National Insurance has dropped to 2%.";
    return "Basic rate plus National Insurance.";
  };

  function update() {
    const salary = Number($("salary").value) || 0;
    const region = $("region").value;
    const pensionType = $("pensionType").value;
    const r = takeHome({
      salary, region, pensionType,
      pensionPct: Number($("pensionPct").value) || 0,
      studentPlans: [...document.querySelectorAll(".check input:checked")].map((c) => c.value),
    });

    $("monthly").textContent = money(r.monthly);
    $("annual").textContent = money(r.net);
    $("weekly").textContent = money(r.weekly) + " a week";

    let html = row("Gross salary", r.gross);
    if (r.pension > 0) {
      html += row(pensionType === "salary-sacrifice" ? "Pension (sacrificed)" : "Pension", r.pension, "deduct");
    }
    html += row("Income tax", r.incomeTax, "deduct");
    for (const b of r.incomeTaxBands) {
      html += \`<tr class="sub"><td>\${b.name} at \${Math.round(b.rate * 100)}% on \${money(b.amount)}</td><td class="num">\${money(b.tax)}</td></tr>\`;
    }
    html += row("National Insurance", r.nationalInsurance, "deduct");
    if (r.studentLoan > 0) {
      html += row("Student loan", r.studentLoan, "deduct");
      if (r.studentLoanRows.length > 1) {
        for (const l of r.studentLoanRows) {
          html += \`<tr class="sub"><td>\${l.name}</td><td class="num">\${money(l.amount)}</td></tr>\`;
        }
      }
    }
    html += \`<tr class="total"><td>Take-home pay</td><td class="num">\${money(r.net)}</td></tr>\`;
    rowsEl.innerHTML = html;

    $("eff").textContent = (r.effectiveRate * 100).toFixed(1) + "%";
    const marg = $("marg");
    marg.textContent = Math.round(r.marginalRate * 100) + "%";
    marg.classList.toggle("warn", r.marginalRate >= 0.6);
    $("marg-note").textContent = note(r.marginalRate, salary);
  }

  $("f").addEventListener("input", update);
  update();
}
</script>`;
