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
import { COST_FIELDS } from "./living_costs.mjs";

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

const costInputs = (prefix, symbol) => COST_FIELDS.map(({ key, label }) => `
      <div class="cost-field">
        <label for="${prefix}-${key}">${label}</label>
        <div class="cost-money"><span data-cost-symbol="${prefix}">${symbol}</span><input type="number" id="${prefix}-${key}" value="" min="0" max="1000000" step="50" inputmode="decimal" placeholder="0"></div>
      </div>`).join("");

const retirementSummary = (side) => {
  const value = Number.isFinite(side.retirement?.amount)
    ? `+${fmt(side.retirement.amount, side)} employer contribution`
    : side.retirement?.value ?? "Not modelled";
  return `<div><dt>${side.cities[0]} retirement</dt><dd>${value}</dd></div>`;
};

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
  <p class="standfirst">Pick what you earn and where you are thinking of going. This compares the financial part of two offers: the salary you would need there to keep what you keep now, using each country's published tax rates. It cannot tell you whether you should move.</p>
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
    <details class="cost-layer" id="cost-layer">
      <summary>Add monthly living costs <span>optional</span></summary>
      <p>Use your own estimates. Salary Crossing does not substitute city averages for your household.</p>
      <div class="cost-columns">
        <fieldset>
          <legend id="cost-from-heading">London costs</legend>
${costInputs("from", "£")}
        </fieldset>
        <fieldset>
          <legend id="cost-to-heading">Dubai costs</legend>
${costInputs("to", "AED")}
        </fieldset>
      </div>
    </details>
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
    <div class="retirement-summary">
      <p><strong>Tax versus retirement</strong> Retirement benefits stay separate from spendable take-home.</p>
      <dl id="retirement-rows">
        ${retirementSummary(lead.from)}
        ${retirementSummary(lead.to)}
      </dl>
    </div>
    <div class="result-actions">
      <a class="answer-link" id="a-link" href="/compare/uk-to-ae/">See tax sources and other salaries &rarr;</a>
      <button type="button" id="copy-comparison">Copy comparison link</button>
    </div>
    <p class="copy-status" id="copy-status" role="status" aria-live="polite"></p>
  </output>
</section>

<section class="featured">
  <h2 class="section-label">Most looked up</h2>
  <div class="cards">
${cards}
  </div>
</section>

<article>
  <h2>What does Salary Crossing compare?</h2>
  <ul>
    <li>The salary needed to match your take-home pay in another country or US state.</li>
    <li>Income tax and compulsory payroll charges, calculated from published rates.</li>
    <li>Your own housing, healthcare, childcare, transport and other monthly costs.</li>
    <li>Pensions, Australian superannuation and UAE end-of-service benefits, shown separately from spendable pay.</li>
  </ul>

  <h2>Why six tax systems and not a hundred and fifty</h2>
  <p>Other sites advertise salary comparisons for 150 countries. Nobody maintains 150 tax codes accurately, and a plausible-looking wrong tax figure is worse than a smaller set of figures you can verify.</p>
  <p>Every jurisdiction here is encoded from its own tax authority's published rates, linked at the bottom of every comparison, and covered by tests that assert the authorities' own worked examples rather than whatever the code happens to produce. New York uses the State's own annual schedule so that the supplemental tax which claws back the lower brackets above $107,650 is included &mdash; most calculators quietly skip it and understate New York by thousands.</p>

  <h2>Bring your real costs into the comparison</h2>
  <p>The tax result uses income tax and compulsory contributions only. Open <em>Add monthly living costs</em> to enter housing, healthcare, childcare, transport and other essentials for both places. The calculator then works out the salary that leaves the same amount after tax and those costs.</p>
  <p>The cost layer deliberately has no default city averages. Rent and family costs vary too widely for a single number to describe your household honestly.</p>

  <h2>Tax paid is not the same as retirement saved</h2>
  <p>Income tax and compulsory payroll charges reduce the cash available today. Pension and superannuation can also reduce current cash, but the money may remain yours for retirement. Salary Crossing keeps those figures separate and explains whether a benefit is deducted, paid by the employer on top, optional or dependent on tenure.</p>

  <h2>Money is one input, not the decision</h2>
  <p>A move can be right even when it leaves you financially worse off. Family, relationships, career direction, lifestyle and the desire for a change cannot be priced by a calculator. Salary Crossing compares the pay component of two offers; it does not score your life or tell you whether to move.</p>
  <p>Exchange rates are European Central Bank reference rates for ${fx.date}.</p>
</article>`;

  return shell({
    title: `Salary Crossing — What Your Pay Is Worth Abroad`,
    description: `Compare salaries after tax across the UK, Dubai, Australia, New York, California and Texas, with sourced rates and your own living costs.`,
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
import { COST_FIELDS, comparisonHash, costsFromParams, matchAfterCosts, monthlyCosts } from "${assets.js}/living_costs.mjs";

const RATES = ${JSON.stringify(rates)};
const $ = (id) => document.getElementById(id);
const track = (name) => { try { navigator.sendBeacon("/hit?p=" + encodeURIComponent("/event/" + name) + "&r=" + encodeURIComponent(location.origin + location.pathname)); } catch {} };

function readCosts(prefix) {
  return Object.fromEntries(COST_FIELDS.map(({ key }) => [key, $(prefix + "-" + key).value]));
}

function loadPreset() {
  const q = new URLSearchParams(location.hash.slice(1));
  for (const name of ["from", "to"]) {
    const value = String(q.get(name) ?? "").toUpperCase();
    if (CODES.includes(value)) $("c-" + name).value = value;
  }
  const presetGross = Number(q.get("gross"));
  if (q.has("gross") && q.get("gross") !== "" && Number.isFinite(presetGross) && presetGross >= 0) {
    $("c-gross").value = Math.min(presetGross, 10000000);
  }
  const fromCosts = costsFromParams(q, "f"), toCosts = costsFromParams(q, "t");
  for (const { key } of COST_FIELDS) {
    $("from-" + key).value = fromCosts[key] || "";
    $("to-" + key).value = toCosts[key] || "";
  }
  if (monthlyCosts(fromCosts) + monthlyCosts(toCosts) > 0) $("cost-layer").open = true;
  update();
}

function update() {
  const from = $("c-from").value;
  const to = $("c-to").value;
  const gross = Math.max(0, Math.min(Number($("c-gross").value) || 0, 10000000));
  const a = country(from).meta, b = country(to).meta;
  const fromCosts = readCosts("from"), toCosts = readCosts("to");
  const fromMonthly = monthlyCosts(fromCosts), toMonthly = monthlyCosts(toCosts);
  const useCosts = fromMonthly + toMonthly > 0;
  $("copy-status").textContent = "";

  $("c-sym").textContent = a.symbol.trim();
  $("cost-from-heading").textContent = a.cities[0] + " costs (" + a.currency + ")";
  $("cost-to-heading").textContent = b.cities[0] + " costs (" + b.currency + ")";
  document.querySelectorAll('[data-cost-symbol="from"]').forEach((node) => { node.textContent = a.symbol.trim(); });
  document.querySelectorAll('[data-cost-symbol="to"]').forEach((node) => { node.textContent = b.symbol.trim(); });

  if (from === to) {
    $("answer").querySelector(".answer-lead").textContent = "Choose two different places";
    $("a-need").textContent = fmt(gross, a);
    $("a-sub").textContent = "Pick somewhere different to compare.";
    $("a-rows").innerHTML = "";
    $("a-link").hidden = true;
    history.replaceState(null, "", comparisonHash({ from, to, gross, fromCosts, toCosts }));
    return;
  }

  const c = compare({ gross, from, to, rate: RATES[from + ">" + to] });
  const retirementHtml = (side) => {
    const value = Number.isFinite(side.retirement?.amount)
      ? "+" + fmt(side.retirement.amount, side) + " employer contribution"
      : side.retirement?.value || "Not modelled";
    return "<div><dt>" + side.cities[0] + " retirement</dt><dd>" + value + "</dd></div>";
  };
  $("retirement-rows").innerHTML = retirementHtml(c.from) + retirementHtml(c.to);
  if (useCosts) {
    const adjusted = matchAfterCosts({ gross, from, to, rate: RATES[from + ">" + to], fromCosts, toCosts });
    $("a-need").textContent = fmt(adjusted.gross, b);
    $("a-sub").textContent = "in " + b.cities[0] + " to keep the same after your costs";
    $("answer").querySelector(".answer-lead").textContent = "To keep the same after costs, you need";
    $("a-rows").innerHTML =
      "<div><dt>Left each month now</dt><dd>" + fmt(adjusted.sourceDisposable / 12, a) + "</dd></div>" +
      "<div><dt>Costs here / month</dt><dd>" + fmt(fromMonthly, a) + "</dd></div>" +
      "<div><dt>Costs there / month</dt><dd>" + fmt(toMonthly, b) + "</dd></div>";
  } else {
    $("a-need").textContent = fmt(c.to.gross, b);
    $("a-sub").textContent = "in " + b.cities[0] + ", versus " + fmt(gross, a) + " in " + a.cities[0];
    $("answer").querySelector(".answer-lead").textContent = "To keep the same, you need";
    $("a-rows").innerHTML =
      "<div><dt>You keep now</dt><dd>" + fmt(c.from.net, a) + "</dd></div>" +
      "<div><dt>Taken here</dt><dd>" + (c.from.effectiveRate * 100).toFixed(1) + "%</dd></div>" +
      "<div><dt>Taken there</dt><dd>" + (c.to.effectiveRate * 100).toFixed(1) + "%</dd></div>";
  }

  // The pair's hub covers example salaries and sources, not this exact input.
  const link = $("a-link");
  link.href = "/compare/" + from.toLowerCase() + "-to-" + to.toLowerCase() + "/";
  link.hidden = false;
  history.replaceState(null, "", comparisonHash({ from, to, gross, fromCosts, toCosts }));
}

$("cmp").addEventListener("input", update);
$("cmp").addEventListener("submit", (event) => event.preventDefault());
let costOpenTracked = false;
$("cost-layer").addEventListener("toggle", () => {
  if ($("cost-layer").open && !costOpenTracked) { costOpenTracked = true; track("cost-layer-opened"); }
});
$("copy-comparison").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(location.href);
    $("copy-status").textContent = "Copied. Anyone opening the link will see this comparison and your cost inputs.";
    track("comparison-link-copied");
  } catch {
    $("copy-status").textContent = "Your comparison is in the address bar, ready to copy.";
  }
});
window.addEventListener("hashchange", loadPreset);
loadPreset();
</script>`;
