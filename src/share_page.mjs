/**
 * Giving other sites a reason to link here.
 *
 * /embed/ is the comparison tool with nothing around it, for an iframe. It is
 * noindex: to a crawler it is a thinner copy of the homepage.
 *
 * /use-our-numbers/ hands out the iframe snippet and the terms for quoting the
 * analysis. The snippet deliberately puts the credit link *outside* the
 * iframe: a link inside an iframe belongs to the framed page, so it is only
 * the one on the host page that counts as a link to this site.
 */
import { country, fmt, CODES } from "./compare.mjs";
import { ORIGIN, SITE_NAME, CONTACT, url } from "./site.mjs";
import { shell, esc, BEACON } from "./render.mjs";
import { assets } from "./assets.mjs";
import { YEAR_LABEL } from "./rates.mjs";

const opt = (code) =>
  `<option value="${code}">${country(code).meta.cities[0]} &middot; ${country(code).meta.name}</option>`;

export const EMBED_SNIPPET = `<iframe src="${ORIGIN}/embed/?from=UK&to=AE&gross=75000" title="Salary comparison calculator" width="100%" height="480" style="border:0;max-width:720px" loading="lazy"></iframe>
<p style="font-size:13px">Calculator by <a href="${ORIGIN}/">Salary Crossing</a></p>`;

export function embedPage({ rates }) {
  return `<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Salary comparison &mdash; ${esc(SITE_NAME)}</title>
<link rel="canonical" href="${url("/")}">
<link rel="stylesheet" href="${assets.style}">
<style>body{background:transparent;padding:4px}.engine{max-width:720px}.answer-big{font-size:clamp(30px,8vw,46px)}.credit{font-size:12px;color:var(--muted);margin:8px 2px 0}.credit a{color:var(--keep)}@media (min-width:520px){.engine{grid-template-columns:minmax(200px,4fr) 6fr}.controls{border-right:1px solid var(--rule);border-bottom:0;padding:16px}}</style>
</head>
<body>
<section class="engine" aria-label="Salary comparison">
  <form id="cmp" class="controls" autocomplete="off">
    <div class="ctl"><label for="c-gross">I earn</label>
      <div class="money"><span id="c-sym">£</span><input type="number" id="c-gross" value="75000" min="0" max="10000000" step="1000" inputmode="numeric"></div></div>
    <div class="ctl"><label for="c-from">in</label><select id="c-from">${CODES.map(opt).join("")}</select></div>
    <div class="ctl"><label for="c-to">moving to</label><select id="c-to">${CODES.map(opt).join("")}</select></div>
  </form>
  <output class="answer" id="answer">
    <p class="answer-lead">To keep the same, you need</p>
    <p class="answer-big" id="a-need">&nbsp;</p>
    <p class="answer-sub" id="a-sub"></p>
    <a class="answer-link" id="a-link" target="_blank" rel="noopener" href="${ORIGIN}/">Full breakdown on ${esc(SITE_NAME)} &rarr;</a>
  </output>
</section>
<p class="credit">After income tax and compulsory contributions, ${YEAR_LABEL} rates. Not tax advice. <a href="${ORIGIN}/" target="_blank" rel="noopener">${esc(SITE_NAME)}</a></p>
<script type="module">
import { compare, country, fmt, CODES } from "${assets.js}/compare.mjs";
const RATES = ${JSON.stringify(rates)};
const $ = (id) => document.getElementById(id);
const q = new URLSearchParams(location.search);
const pick = (v, d) => CODES.includes(String(v).toUpperCase()) ? String(v).toUpperCase() : d;
$("c-from").value = pick(q.get("from"), "UK");
$("c-to").value = pick(q.get("to"), "AE");
if (Number(q.get("gross")) > 0) $("c-gross").value = Math.min(Number(q.get("gross")), 10000000);

function update() {
  const from = $("c-from").value, to = $("c-to").value, gross = Number($("c-gross").value) || 0;
  const a = country(from).meta, b = country(to).meta;
  $("c-sym").textContent = a.symbol.trim();
  if (from === to) { $("a-need").textContent = fmt(gross, a); $("a-sub").textContent = "Pick somewhere different to compare."; return; }
  const c = compare({ gross, from, to, rate: RATES[from + ">" + to] });
  $("a-need").textContent = fmt(c.to.gross, b);
  $("a-sub").textContent = "in " + b.cities[0] + " to match " + fmt(gross, a) + " in " + a.cities[0];
  $("a-link").href = "${ORIGIN}/compare/" + from.toLowerCase() + "-to-" + to.toLowerCase() + "/";
}
$("cmp").addEventListener("input", update);
update();
</script>
${BEACON}
</body>
</html>
`;
}

export function sharePage(articles) {
  return shell({
    title: `Use Our Numbers — ${SITE_NAME}`,
    description: "Embed the salary comparison calculator on your own site, or quote and republish the analysis tables. Free, with a credit link.",
    canonical: url("/use-our-numbers/"),
    script: " ",
    body: `
<header class="masthead">
  <p class="eyebrow">For writers and site owners</p>
  <h1>Use our numbers, <em>free</em></h1>
  <p class="standfirst">If you write about pay, tax, relocation or mortgages, you can put the calculator on your own page or quote the analysis. The only thing asked in return is a normal link back.</p>
</header>

<article>
  <h2>Embed the comparison calculator</h2>
  <p>Paste this into any page that accepts HTML. Change <code>from</code>, <code>to</code> and <code>gross</code> in the address to open on a different comparison. Codes: ${CODES.map((c) => `<code>${c}</code> (${esc(country(c).meta.cities[0])})`).join(", ")}.</p>
  <textarea readonly rows="4" style="width:100%;font:13px/1.5 'IBM Plex Mono',monospace;padding:10px;border:1px solid var(--rule-2);border-radius:3px;background:var(--card);color:var(--ink)" onclick="this.select()">${esc(EMBED_SNIPPET)}</textarea>
  <p>It runs entirely in your reader's browser: no cookies, no advertising, nothing sent to us but a visit count. It updates itself when tax rates change, so you never have to.</p>
  <iframe src="/embed/?from=UK&amp;to=USNY&amp;gross=90000" title="Salary comparison calculator preview" width="100%" height="480" style="border:0;margin-top:8px" loading="lazy"></iframe>

  <h2>Quote or republish the analysis</h2>
  <p>The tables in these pieces are free to quote, chart or republish in full, in print or online, under <a href="https://creativecommons.org/licenses/by/4.0/" rel="nofollow">CC BY 4.0</a>. Credit it as <em>Source: Salary Crossing</em> with a link to the piece:</p>
  <ul>
    ${articles.map((a) => `<li><a href="/insights/${a.slug}/">${esc(a.h1)}</a></li>`).join("\n    ")}
  </ul>
  <p>Every figure is computed from the tax authorities' own published rates, and the sources are listed on the <a href="/about/">about page</a>. If you need a figure for a salary or a country pairing that isn't on the site, or want the working behind a number before you publish it, email <a href="mailto:${CONTACT}">${CONTACT}</a>.</p>
</article>`,
  });
}
