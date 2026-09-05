import { compare, country, fmt } from "./compare.mjs";
import { BASE, url } from "./site.mjs";
import { shell } from "./render.mjs";

const pct = (n) => (n * 100).toFixed(1) + "%";

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

export function comparePage({ gross, from, to, rate, fxDate, neighbours = [] }) {
  const c = compare({ gross, from, to, rate });
  const a = country(from).meta;
  const b = country(to).meta;
  const slug = `${from.toLowerCase()}-to-${to.toLowerCase()}`;

  const body = `
<p class="crumb"><a href="${BASE}/compare/">Compare countries</a> / ${a.name} &rarr; ${b.name} / ${fmt(gross, a)}</p>
<header class="masthead">
  <p class="eyebrow">${a.name} ${a.year} &middot; ${b.name} ${b.year}</p>
  <h1>${fmt(gross, a)} in ${a.cities[0]} &mdash; what you need in <em>${b.cities[0]}</em></h1>
  <p class="verdict">To take home the same as ${fmt(gross, a)} does in ${a.theName ?? a.name}, you need <b>${fmt(c.to.gross, b)}</b> in ${b.theName ?? b.name}. ${verdict(c)}</p>
</header>

${sideBySide(c)}

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
  <h2>What this does and does not include</h2>
  <p>This compares <strong>take-home pay only</strong> &mdash; income tax and compulsory social contributions, nothing else. It does not adjust for rent, childcare, healthcare or schooling, and those differences are often larger than the tax ones. A salary that looks better in ${b.cities[0]} can still leave you worse off once housing is paid for.</p>
  <p>The exchange rate is the European Central Bank reference rate for ${fxDate}. Rates move; the tax arithmetic does not.</p>

  <h2>Where the numbers come from</h2>
  <ul>
    ${[...a.sources, ...b.sources].map((s) => `<li><a href="${s.url}" rel="nofollow">${s.label}</a></li>`).join("\n    ")}
  </ul>
  <p>Every figure on this page is computed from those published rates at build time, not copied from another calculator. If one looks wrong, tell us and we will show our working.</p>
</article>`;

  return shell({
    title: `${fmt(gross, a)} in ${a.name} vs ${b.name} — Salary Comparison`,
    description: `To match ${fmt(gross, a)} in ${a.name} you need ${fmt(c.to.gross, b)} in ${b.name} after tax. Full side-by-side breakdown with sources.`,
    canonical: url(`/compare/${slug}/${gross}/`),
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
  <p>Plenty of sites advertise salary comparisons for 150 countries. Nobody maintains 150 tax codes accurately, and an approximate answer to "can I afford to move" is worse than no answer.</p>
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
