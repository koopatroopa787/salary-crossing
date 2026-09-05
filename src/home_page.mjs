/**
 * The homepage: one question, answered before you touch anything.
 *
 * Design notes, from the evidence rather than taste:
 *
 * - First impressions form in ~50ms and are driven mostly by visual
 *   complexity, so the page opens with one headline, one control strip and
 *   one answer. Everything else is below the fold.
 * - The answer is rendered at build time. A tool that shows an empty state
 *   until you type is asking for effort before giving value; this one has
 *   already answered by the time you arrive.
 * - Light is the default because positive contrast polarity measurably wins
 *   for reading tasks; dark is fully designed because most people who want it
 *   want it badly.
 */
import { compare, country, fmt, CODES } from "./compare.mjs";
import { YEAR_LABEL } from "./rates.mjs";
import { url } from "./site.mjs";
import { shell } from "./render.mjs";
import { assets } from "./assets.mjs";

/** The corridors people actually search for, in order of volume. */
export const FEATURED = [
  { from: "UK", to: "AE",   gross: 75000 },
  { from: "UK", to: "USNY", gross: 75000 },
  { from: "UK", to: "AU",   gross: 75000 },
  { from: "UK", to: "USTX", gross: 75000 },
  { from: "USNY", to: "UK", gross: 150000 },
  { from: "USNY", to: "USTX", gross: 150000 },
];

const opt = (code, selected) =>
  `<option value="${code}"${code === selected ? " selected" : ""}>${country(code).meta.cities[0]} &middot; ${country(code).meta.name}</option>`;

export function homePage({ fx, rates }) {
  const lead = compare({ gross: 75000, from: "UK", to: "AE", rate: rates["UK>AE"] });

  const cards = FEATURED.map(({ from, to, gross }) => {
    const c = compare({ gross, from, to, rate: rates[`${from}>${to}`] });
    const a = country(from).meta, b = country(to).meta;
    const better = c.likeForLike.betterOff;
    return `
    <a class="card" href="${url(`/compare/${from.toLowerCase()}-to-${to.toLowerCase()}/${gross}/`).replace(/^https:\/\/[^/]+/, "")}">
      <span class="card-route">${a.cities[0]} &rarr; ${b.cities[0]}</span>
      <span class="card-need">${fmt(c.to.gross, b)}</span>
      <span class="card-sub">to match ${fmt(gross, a)}</span>
      <span class="card-delta ${better ? "up" : "down"}">${better ? "+" : "&minus;"}${fmt(Math.abs(c.likeForLike.difference), a)} on the same salary</span>
    </a>`;
  }).join("\n");

  const body = `
<header class="hero">
  <p class="eyebrow">Take-home pay across borders &middot; ${YEAR_LABEL} rates</p>
  <h1>The same salary is worth <em>wildly</em> different amounts</h1>
  <p class="standfirst">Pick what you earn and where you are thinking of going. This works out the salary you would need there to keep exactly what you keep now &mdash; after income tax and compulsory social contributions, using each country's own published rates.</p>
</header>

<section class="engine" aria-label="Salary comparison">
  <form id="cmp" class="controls" autocomplete="off">
    <div class="ctl">
      <label for="c-gross">I earn</label>
      <div class="money"><span id="c-sym">£</span><input type="number" id="c-gross" value="75000" min="0" max="10000000" step="1000" inputmode="numeric"></div>
    </div>
    <div class="ctl">
      <label for="c-from">in</label>
      <select id="c-from">${CODES.map((c) => opt(c, "UK")).join("")}</select>
    </div>
    <div class="ctl">
      <label for="c-to">moving to</label>
      <select id="c-to">${CODES.map((c) => opt(c, "AE")).join("")}</select>
    </div>
  </form>

  <output class="answer" id="answer">
    <p class="answer-lead">To keep the same, you need</p>
    <p class="answer-big" id="a-need">${fmt(lead.to.gross, lead.to)}</p>
    <p class="answer-sub" id="a-sub">in ${lead.to.cities[0]}, versus ${fmt(lead.from.gross, lead.from)} in ${lead.from.cities[0]}</p>
    <dl class="answer-rows" id="a-rows">
      <div><dt>You keep now</dt><dd>${fmt(lead.from.net, lead.from)}</dd></div>
      <div><dt>Taken here</dt><dd>${(lead.from.effectiveRate * 100).toFixed(1)}%</dd></div>
      <div><dt>Taken there</dt><dd>${(lead.to.effectiveRate * 100).toFixed(1)}%</dd></div>
    </dl>
    <a class="answer-link" id="a-link" href="/compare/uk-to-ae/75000/">See the full breakdown &rarr;</a>
  </output>
</section>

<section class="featured">
  <h2 class="section-label">Most looked up</h2>
  <div class="cards">
${cards}
  </div>
</section>

<article>
  <h2>Why four countries and not a hundred and fifty</h2>
  <p>Other sites advertise salary comparisons for 150 countries. Nobody maintains 150 tax codes accurately, and an approximate answer to "can I afford to move" is worse than no answer at all.</p>
  <p>Every jurisdiction here is encoded from its own tax authority's published rates, linked at the bottom of every comparison, and covered by tests that assert the authorities' own worked examples rather than whatever the code happens to produce. New York uses the State's own annual schedule so that the supplemental tax which claws back the lower brackets above $107,650 is included &mdash; most calculators quietly skip it and understate New York by thousands.</p>

  <h2>What this does not include</h2>
  <p>Tax and compulsory contributions only. Not rent, not childcare, not health insurance, not schooling &mdash; and those gaps are often larger than the tax ones. A salary that looks better in Dubai can still leave you worse off once housing is paid for. Treat this as one honest input, not the whole decision.</p>
  <p>Exchange rates are European Central Bank reference rates for ${fx.date}.</p>
</article>`;

  return shell({
    title: `Salary Crossing — What Your Pay Is Worth Abroad`,
    description: `Work out the salary you would need abroad to keep what you keep now. Accurate after-tax comparisons for the UK, New York, California, Texas, Dubai and Australia, every rate sourced.`,
    canonical: url("/"),
    body,
    script: script(rates),
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: "Salary Crossing",
      applicationCategory: "FinanceApplication",
      operatingSystem: "Any",
      offers: { "@type": "Offer", price: "0", priceCurrency: "GBP" },
    },
  });
}

const script = (rates) => `<script type="module">
import { compare, country, fmt, CODES } from "${assets.js}/compare.mjs";

const RATES = ${JSON.stringify(rates)};
const $ = (id) => document.getElementById(id);

function update() {
  const from = $("c-from").value;
  const to = $("c-to").value;
  const gross = Number($("c-gross").value) || 0;
  const a = country(from).meta, b = country(to).meta;

  $("c-sym").textContent = a.symbol.trim();

  if (from === to) {
    $("a-need").textContent = fmt(gross, a);
    $("a-sub").textContent = "Pick somewhere different to compare.";
    return;
  }

  const c = compare({ gross, from, to, rate: RATES[from + ">" + to] });
  $("a-need").textContent = fmt(c.to.gross, b);
  $("a-sub").textContent = "in " + b.cities[0] + ", versus " + fmt(gross, a) + " in " + a.cities[0];
  $("a-rows").innerHTML =
    "<div><dt>You keep now</dt><dd>" + fmt(c.from.net, a) + "</dd></div>" +
    "<div><dt>Taken here</dt><dd>" + (c.from.effectiveRate * 100).toFixed(1) + "%</dd></div>" +
    "<div><dt>Taken there</dt><dd>" + (c.to.effectiveRate * 100).toFixed(1) + "%</dd></div>";

  // Deep-link to the nearest generated page so the answer has somewhere to go.
  const link = $("a-link");
  link.href = "/compare/" + from.toLowerCase() + "-to-" + to.toLowerCase() + "/";
  link.hidden = false;
}

$("cmp").addEventListener("input", update);
update();
</script>`;
