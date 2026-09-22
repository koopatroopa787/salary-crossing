import { compare, country, fmt } from "./compare.mjs";
import { BASE, url } from "./site.mjs";
import { shell } from "./render.mjs";
import { comparisonHash } from "./living_costs.mjs";

const pct = (n) => (n * 100).toFixed(1) + "%";
const searchName = (code, meta) => ({
  UK: "UK", AE: "Dubai", AU: "Australia",
  USNY: "New York", USCA: "California", USTX: "Texas",
}[code] ?? meta.name);

/** The sentence that makes the page worth landing on. */
function verdict(c) {
  const l = c.likeForLike;
  const gap = Math.abs(l.difference);
  const taxFree = c.to.totalDeductions === 0;
  const fate = taxFree
    ? `which you would keep in full`
    : `which leaves ${fmt(l.net, c.to)} after tax`;
  return `Move on the same salary and you would keep ${l.betterOff ? "more" : "less"}: `
    + `${fmt(c.from.gross, c.from)} converts to ${fmt(l.gross, c.to)}, ${fate} — `
    + `${fmt(gap, c.from)} ${l.betterOff ? "more" : "less"} a year in your pocket.`;
}

function deductionRows(side) {
  const rows = side.deductions.length
    ? side.deductions.map((d) =>
        `<tr class="deduct"><th scope="row">${d.name}</th><td class="num">${fmt(d.amount, side)}</td></tr>`)
    : [`<tr class="sub"><td colspan="2">No income tax and no social security.</td></tr>`];
  return rows.join("\n        ");
}

function retirementValue(side) {
  const r = side.retirement;
  if (!r) return "Not modelled";
  return Number.isFinite(r.amount) ? `+${fmt(r.amount, side)} a year` : r.value;
}

function retirementBreakdown(c) {
  const card = (side) => `
    <div>
      <span>${side.cities?.[0] ?? side.name}</span>
      <strong>${retirementValue(side)}</strong>
      <b>${side.retirement?.label ?? "Retirement benefit"}</b>
      <p>${side.retirement?.description ?? "Retirement arrangements are not included in this comparison."}</p>
    </div>`;

  return `
<section class="retirement-breakdown" aria-labelledby="retirement-title">
  <p class="eyebrow">What is paid away and what stays yours</p>
  <h2 id="retirement-title">Tax and retirement are <em>different money</em></h2>
  <p>The matching salary above uses spendable take-home. Tax and compulsory payroll charges reduce that cash. Pension, superannuation and end-of-service benefits are shown separately because they may still have value to you later, but cannot pay today's rent.</p>
  <div class="retirement-cards">
    ${card(c.from)}
    ${card(c.to)}
  </div>
</section>`;
}

function sideBySide(c) {
  const col = (side, label) => `
  <div class="panel slip">
    <div class="headline">
      <div>
        <div class="big">${fmt(side.net, side)}</div>
        <div class="unit">${label}</div>
      </div>
      <div class="annual">
        on a salary of<b>${fmt(side.gross, side)}</b>
        <span>${pct(side.effectiveRate)} taken</span>
      </div>
    </div>
    <table>
      <caption>${side.name}${side.cities?.length ? ` &middot; ${side.cities[0]}` : ""}</caption>
      <tbody>
        <tr><th scope="row">Gross</th><td class="num">${fmt(side.gross, side)}</td></tr>
        ${deductionRows(side)}
        <tr class="total"><td>Take-home</td><td class="num">${fmt(side.net, side)}</td></tr>
      </tbody>
    </table>
    <dl class="rates">
      <div style="border-left:0">
        <dt>Notes</dt>
        <dd style="font-size:13px;font-family:'Public Sans',sans-serif;line-height:1.45">${side.notes.join(" ")}</dd>
      </div>
    </dl>
  </div>`;

  return `<div class="work" style="grid-template-columns:1fr 1fr">
    ${col(c.from, "what you keep now")}
    ${col(c.to, "the same, over there")}
  </div>`;
}

export function comparePage({ gross, from, to, rate, fxDate, neighbours = [], isHub = false }) {
  const c = compare({ gross, from, to, rate });
  const a = country(from).meta;
  const b = country(to).meta;
  const slug = `${from.toLowerCase()}-to-${to.toLowerCase()}`;
  const fromSearch = searchName(from, a);
  const toSearch = searchName(to, b);
  const heading = isHub
    ? `${fromSearch} to ${toSearch} <em>salary comparison</em>`
    : `${fmt(gross, a)} in ${a.cities[0]} &mdash; what you need in <em>${b.cities[0]}</em>`;
  const conversionSection = a.currency === b.currency ? "" : `
  <h2>${gross.toLocaleString(a.locale)} ${a.currency} to ${b.currency}</h2>
  <p>At the ${fxDate} exchange rate, ${fmt(gross, a)} converts to <strong>${fmt(c.likeForLike.gross, b)}</strong> before tax. After ${b.name} income tax and compulsory payroll charges, that converted salary leaves ${fmt(c.likeForLike.net, b)}. The salary needed to match your original take-home is ${fmt(c.to.gross, b)}, which is why a currency conversion alone cannot compare two job offers.</p>`;

  const body = `
<p class="crumb"><a href="${BASE}/compare/">Compare countries</a> / ${a.name} &rarr; ${b.name}${isHub ? "" : ` / ${fmt(gross, a)}`}</p>
<header class="masthead">
  <p class="eyebrow">${a.name} ${a.year} &middot; ${b.name} ${b.year}</p>
  <h1>${heading}</h1>
  <p class="verdict">To take home the same as ${fmt(gross, a)} does in ${a.theName ?? a.name}, you need <b>${fmt(c.to.gross, b)}</b> in ${b.theName ?? b.name}. ${verdict(c)}</p>
</header>

${sideBySide(c)}

${retirementBreakdown(c)}

<p class="route-cta"><a href="${BASE}/${comparisonHash({ from, to, gross })}">Adjust this salary and add your own living costs &rarr;</a></p>

<div class="raise">
  <table>
    <caption>The three numbers that matter</caption>
    <tbody>
      <tr><th scope="row">Matching salary in ${b.name}</th><td class="num keep">${fmt(c.to.gross, b)}</td></tr>
      <tr class="sub"><td>the same salary, simply converted</td><td class="num">${fmt(c.likeForLike.gross, b)}</td></tr>
      <tr><th scope="row">Effective rate, ${a.name}</th><td class="num">${pct(c.from.effectiveRate)}</td></tr>
      <tr><th scope="row">Effective rate, ${b.name}</th><td class="num">${pct(c.to.effectiveRate)}</td></tr>
      <tr><th scope="row">Exchange rate used</th><td class="num">1 ${a.currency} = ${rate.toFixed(4)} ${b.currency}</td></tr>
    </tbody>
  </table>
</div>

<ul class="neighbours">
  ${neighbours.map((n) => `<li><a href="${BASE}/compare/${slug}/${n}/">${fmt(n, a)}</a></li>`).join("\n  ")}
</ul>

<article>
  ${conversionSection}
  <h2>What this does and does not include</h2>
  <p>This page compares <strong>spendable take-home pay</strong> &mdash; income tax and compulsory social contributions. Retirement benefits are listed separately above instead of being treated as money lost. Rent, childcare, healthcare and schooling can be larger than the tax difference. Use the calculator above to add your own monthly costs for both places; it deliberately does not guess them from a city average.</p>
  <p>It cannot answer whether moving is worthwhile. People move for family, relationships, career direction, lifestyle and reasons that have no sensible price. This is the financial part of the comparison, not a verdict on the decision.</p>
  <p>The exchange rate is the European Central Bank reference rate for ${fxDate}. Rates move; the tax arithmetic does not.</p>

  <h2>Where the numbers come from</h2>
  <ul>
    ${[...a.sources, ...b.sources].map((s) => `<li><a href="${s.url}" rel="nofollow">${s.label}</a></li>`).join("\n    ")}
  </ul>
  <p>Every figure on this page is computed from those published rates at build time, not copied from another calculator. If one looks wrong, tell us and we will show our working.</p>
</article>`;

  return shell({
    title: isHub
      ? `${fromSearch} vs ${toSearch} Salary Comparison After Tax`
      : `${fmt(gross, a)} in ${fromSearch} vs ${toSearch} — Salary After Tax`,
    description: isHub
      ? `Compare ${fromSearch} and ${toSearch} salaries after tax. ${fmt(gross, a)} in ${a.cities[0]} needs ${fmt(c.to.gross, b)} in ${b.cities[0]} to match take-home pay.`
      : `${gross.toLocaleString(a.locale)} ${a.currency} converts to ${fmt(c.likeForLike.gross, b)}. To match its after-tax value in ${toSearch}, you need ${fmt(c.to.gross, b)}.`,
    canonical: url(isHub ? `/compare/${slug}/` : `/compare/${slug}/${gross}/`),
    body,
    script: " ",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [{
        "@type": "Question",
        name: `What salary do I need in ${b.name} to match ${fmt(gross, a)} in ${a.name}?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `You need about ${fmt(c.to.gross, b)} in ${b.name} to take home the same as ${fmt(gross, a)} does in ${a.theName ?? a.name}. ${fmt(gross, a)} leaves ${fmt(c.from.net, a)} after tax; ${fmt(c.to.gross, b)} leaves the equivalent ${fmt(c.to.net, b)}.`,
        },
      }],
    },
  });
}

export function compareIndexPage(pairs) {
  const body = `
<header class="masthead">
  <p class="eyebrow">Take-home pay across borders</p>
  <h1>What your salary is worth <em>somewhere else</em></h1>
  <p class="standfirst">Same job, different country, very different payslip. Each comparison works out the salary you would need abroad to keep exactly what you keep now &mdash; using each country's published rates, with the sources on the page.</p>
</header>
<ul class="neighbours" style="margin-top:24px">
  ${pairs.map(({ from, to, slug }) =>
    `<li><a href="${BASE}/compare/${slug}/">${country(from).meta.name} &rarr; ${country(to).meta.name}</a></li>`).join("\n  ")}
</ul>
<article>
  <h2>Why four countries and not a hundred and fifty</h2>
  <p>Plenty of sites advertise salary comparisons for 150 countries. Nobody maintains 150 tax codes accurately, and a plausible-looking wrong tax figure is worse than a smaller set of figures you can verify.</p>
  <p>Each country here is encoded from its own tax authority's published rates, linked on every page, and covered by tests that assert the published worked examples rather than whatever the code happens to produce. More countries will be added the same way, one at a time.</p>
</article>`;

  return shell({
    title: "Compare Take-Home Pay Between Countries",
    description: "Work out the salary you need abroad to keep what you keep now. Accurate take-home comparisons with every rate sourced.",
    canonical: url("/compare/"),
    body,
    script: " ",
  });
}
