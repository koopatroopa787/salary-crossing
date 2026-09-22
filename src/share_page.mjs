/**
 * Giving other sites a reason to link here.
 *
 * /embed/ is the comparison tool with nothing around it, for an iframe. It is
 * noindex: to a crawler it is a thinner copy of the homepage.
 *
 * /use-our-numbers/ lets editors preview a comparison and copy its iframe.
 * The visible, qualified credit link gives readers a way to find the source.
 */
import { country, CODES } from "./compare.mjs";
import { ORIGIN, SITE_NAME, CONTACT, url } from "./site.mjs";
import { shell, esc, BEACON } from "./render.mjs";
import { assets } from "./assets.mjs";
import { YEAR_LABEL } from "./rates.mjs";
import { embedSnippet } from "./embed_options.mjs";

const opt = (code) =>
  `<option value="${code}">${country(code).meta.cities[0]} &middot; ${country(code).meta.name}</option>`;

export const EMBED_SNIPPET = embedSnippet();

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
    <a class="answer-link" id="a-link" target="_blank" rel="noopener" href="${ORIGIN}/">Explore this comparison &rarr;</a>
  </output>
</section>
<p class="credit">Spendable take-home, ${YEAR_LABEL} rates. Full pages separate tax from retirement benefits. Excludes living costs and individual circumstances. Not tax advice. <a href="${ORIGIN}/" target="_blank" rel="noopener">${esc(SITE_NAME)}</a> &middot; <a href="${ORIGIN}/use-our-numbers/" target="_blank" rel="noopener">Add this calculator to your site</a></p>
<noscript><p>This calculator needs JavaScript. <a href="${ORIGIN}/compare/" target="_blank" rel="noopener">Read the salary comparison tables</a>.</p></noscript>
<script type="module">
import { compare, country, fmt, CODES } from "${assets.js}/compare.mjs";
import { embedOptions, presetHash } from "${assets.js}/embed_options.mjs";
const RATES = ${JSON.stringify(rates)};
const $ = (id) => document.getElementById(id);
function loadPreset() {
  // Keep existing query-string embeds working; new snippets use a fragment.
  const q = new URLSearchParams(location.hash.slice(1) || location.search);
  const options = embedOptions(Object.fromEntries(q));
  $("c-from").value = options.from;
  $("c-to").value = options.to;
  $("c-gross").value = options.gross;
  update();
}

function update() {
  const from = $("c-from").value, to = $("c-to").value, gross = Math.max(0, Math.min(Number($("c-gross").value) || 0, 10000000));
  const a = country(from).meta, b = country(to).meta;
  $("c-sym").textContent = a.symbol.trim();
  if (from === to) { $("a-need").textContent = fmt(gross, a); $("a-sub").textContent = "Pick somewhere different to compare."; $("a-link").hidden = true; return; }
  const c = compare({ gross, from, to, rate: RATES[from + ">" + to] });
  $("a-need").textContent = fmt(c.to.gross, b);
  $("a-sub").textContent = "in " + b.cities[0] + " to match " + fmt(gross, a) + " in " + a.cities[0];
  $("a-link").href = "${ORIGIN}/" + presetHash({ from, to, gross });
  $("a-link").hidden = false;
}
$("cmp").addEventListener("input", update);
$("cmp").addEventListener("submit", (event) => event.preventDefault());
window.addEventListener("hashchange", loadPreset);
loadPreset();
</script>
${BEACON}
</body>
</html>
`;
}

export function sharePage(articles) {
  return shell({
    title: `Free Salary Calculator Embed for Publishers — ${SITE_NAME}`,
    description: "Add an after-tax salary comparison to your relocation guide or careers website. Choose countries, preview the calculator and copy the free embed code.",
    canonical: url("/use-our-numbers/"),
    script: publisherScript(),
    body: `
<header class="masthead">
  <p class="eyebrow">For publishers, relocation guides and careers sites</p>
  <h1>A salary calculator <em>for your readers</em></h1>
  <p class="standfirst">Help readers compare a salary at home with a move abroad, after income tax and compulsory contributions. Choose a starting comparison, copy the code and put the working calculator in your article. Free, with a visible credit to ${esc(SITE_NAME)}.</p>
</header>

<section class="publisher-builder" aria-labelledby="builder-title">
  <h2 id="builder-title">Build your embed</h2>
  <p>No signup, API key or plugin. Your readers can change the salary and countries themselves.</p>
  <div class="publisher-presets" aria-label="Example comparisons">
    <a href="#from=UK&amp;to=AE&amp;gross=75000">UK to Dubai</a>
    <a href="#from=UK&amp;to=USNY&amp;gross=90000">UK to New York</a>
    <a href="#from=UK&amp;to=AU&amp;gross=60000">UK to Australia</a>
  </div>
  <form id="embed-builder" class="controls publisher-controls" autocomplete="off">
    <div class="ctl"><label for="embed-from">Starting country</label><select id="embed-from">${CODES.map(opt).join("")}</select></div>
    <div class="ctl"><label for="embed-to">Destination</label><select id="embed-to">${CODES.map(opt).join("")}</select></div>
    <div class="ctl"><label for="embed-gross">Annual salary <span id="embed-currency">(GBP)</span></label><input id="embed-gross" type="number" value="75000" min="0" max="10000000" step="any" inputmode="decimal" required></div>
  </form>
  <h3>Preview</h3>
  <iframe id="embed-preview" src="/embed/#from=UK&amp;to=AE&amp;gross=75000" title="Salary calculator preview" width="100%" height="600" class="publisher-preview" loading="lazy" referrerpolicy="origin"></iframe>
  <label for="embed-code" class="publisher-code-label">Embed code</label>
  <textarea id="embed-code" readonly rows="6" spellcheck="false">${esc(EMBED_SNIPPET)}</textarea>
  <div class="publisher-actions"><button id="copy-embed" type="button">Copy embed code</button><span id="copy-status" role="status" aria-live="polite"></span></div>
  <noscript><p>The code above works for UK to Dubai. Enable JavaScript to customise it and see the preview.</p></noscript>
</section>

<article>
  <h2>Put it in your article</h2>
  <ol>
    <li>Choose countries and a starting salary that fit your story.</li>
    <li>Copy the code into an HTML block where your editor allows iframes.</li>
    <li>Preview the published page on a phone and desktop, then keep the visible calculator credit.</li>
  </ol>
  <p>The calculator fits its container up to 720 pixels wide. The supplied height allows room for stacked controls on a phone; your editor can adjust it if needed. If your publishing system strips iframes, link to a <a href="/compare/">comparison page</a> instead. Email newsletters should use a link too.</p>

  <h2>What your readers get</h2>
  <p>A starting point for comparing employment offers: the gross salary needed in another jurisdiction to match take-home pay at home. Coverage: ${CODES.map((c) => esc(country(c).meta.name)).join(", ")}. The UK comparison uses England, Wales and Northern Ireland; Scotland has separate controls on the <a href="/take-home/">UK take-home calculator</a>.</p>
  <p>It models standard employment income, income tax and compulsory contributions. The full comparison pages separate spendable take-home from workplace pension, Australian superannuation and UAE end-of-service benefits, with scheme limits stated clearly. It does not compare rent, healthcare, childcare, immigration eligibility or cross-border tax residency. It is an estimate, not personal tax advice.</p>
  <p>Calculations run in the reader's browser. There are no cookies or ads in the widget. Basic request logs and visit counts are described in our <a href="/privacy/">privacy policy</a>. The hosted calculator picks up updates when we publish them; you do not need to replace the code.</p>

  <h2>Free to use, with clear attribution</h2>
  <p>Keep the visible ${esc(SITE_NAME)} credit. The supplied link uses <code>rel="nofollow"</code>; you do not have to provide a link that passes search ranking credit. There is no fee, signup or reciprocal-link requirement.</p>
  <p>Want help matching the calculator to an article? <a href="mailto:${CONTACT}?subject=Calculator%20embed%20for%20my%20publication">Send us the article and the country comparison</a>. We can help choose a starting example or show the calculation's sources.</p>

  <h2>Quote or republish the analysis</h2>
  <p>The tables in these pieces are free to quote, chart or republish in full, in print or online, under <a href="https://creativecommons.org/licenses/by/4.0/" rel="nofollow">CC BY 4.0</a>. Credit it as <em>Source: Salary Crossing</em> with a link to the piece:</p>
  <ul>
    ${articles.map((a) => `<li><a href="/insights/${a.slug}/">${esc(a.h1)}</a></li>`).join("\n    ")}
  </ul>
  <p>Every figure is computed from the tax authorities' own published rates, and the sources are listed on the <a href="/about/">about page</a>. If you need a figure for a salary or a country pairing that isn't on the site, or want the working behind a number before you publish it, email <a href="mailto:${CONTACT}">${CONTACT}</a>.</p>
</article>`,
  });
}

function publisherScript() {
  return `<script type="module">
import { country } from "${assets.js}/compare.mjs";
import { embedOptions, embedSnippet, presetHash } from "${assets.js}/embed_options.mjs";
const $ = (id) => document.getElementById(id);
const track = (name) => { try { navigator.sendBeacon("/hit?p=" + encodeURIComponent("/event/" + name) + "&r=" + encodeURIComponent(location.origin + location.pathname)); } catch {} };
function update() {
  const options = embedOptions({ from: $("embed-from").value, to: $("embed-to").value, gross: $("embed-gross").value });
  $("embed-to").value = options.to;
  $("embed-currency").textContent = "(" + country(options.from).meta.currency + ")";
  for (const option of $("embed-to").options) option.disabled = option.value === options.from;
  const valid = $("embed-gross").checkValidity();
  $("copy-embed").disabled = !valid;
  if (!valid) {
    $("embed-code").value = "";
    $("copy-status").textContent = "Enter a salary between 0 and 10,000,000 to generate the code.";
    return;
  }
  $("embed-code").value = embedSnippet(options);
  const src = "/embed/" + presetHash(options);
  if ($("embed-preview").getAttribute("src") !== src) $("embed-preview").setAttribute("src", src);
  if (location.hash !== presetHash(options)) history.replaceState(null, "", presetHash(options));
  $("copy-status").textContent = "";
}
function loadPreset() {
  const options = embedOptions(Object.fromEntries(new URLSearchParams(location.hash.slice(1))));
  $("embed-from").value = options.from;
  $("embed-to").value = options.to;
  $("embed-gross").value = options.gross;
  update();
}
$("embed-builder").addEventListener("input", update);
$("embed-builder").addEventListener("submit", (event) => event.preventDefault());
$("embed-code").addEventListener("click", () => $("embed-code").select());
$("copy-embed").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText($("embed-code").value);
    $("copy-status").textContent = "Copied. Paste into your page's HTML block.";
    track("embed-code-copied");
  } catch {
    $("embed-code").focus();
    $("embed-code").select();
    $("copy-status").textContent = "Code selected. Press Ctrl+C or Command+C to copy.";
  }
});
window.addEventListener("hashchange", loadPreset);
loadPreset();
</script>`;
}
