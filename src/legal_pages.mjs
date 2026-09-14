/**
 * About, Privacy and Terms.
 *
 * These describe what the site actually does, not what a template says a site
 * usually does. Two things are worth knowing before editing them:
 *
 * - Every calculation runs in the visitor's browser. No salary figure is ever
 *   sent to the server, and the privacy policy says so because it is true, not
 *   as a marketing line. If that ever stops being true, this file must change
 *   in the same commit.
 * - Visits are counted by a first-party beacon (BEACON in render.mjs) with no
 *   cookie and no third party. There is no advertising yet. The policy states
 *   that plainly rather than pre-emptively describing cookies that do not exist.
 */
import { YEAR_LABEL } from "./rates.mjs";
import { CONTACT, SITE_NAME, url } from "./site.mjs";
import { shell, esc } from "./render.mjs";
import { country, CODES } from "./compare.mjs";

const UPDATED = "14 September 2026";

const page = (title, description, path, body) =>
  shell({ title, description, canonical: url(path), body, script: " " });

export function aboutPage() {
  const jurisdictions = CODES.map((c) => {
    const m = country(c).meta;
    return `<li><strong>${esc(m.name)}</strong> &mdash; ${m.sources.map((s) => `<a href="${s.url}" rel="nofollow">${esc(s.label)}</a>`).join(", ")}</li>`;
  }).join("\n    ");

  return page(
    `About ${SITE_NAME}`,
    `How Salary Crossing calculates take-home pay across borders, where every rate comes from, and what the figures deliberately leave out.`,
    "/about/",
    `
<header class="masthead">
  <p class="eyebrow">About</p>
  <h1>How this works, and <em>what it will not tell you</em></h1>
  <p class="standfirst">${SITE_NAME} works out what a salary is actually worth in another country &mdash; the figure you would need there to keep exactly what you keep now, after income tax and compulsory social contributions.</p>
</header>

<article>
  <h2>Where the numbers come from</h2>
  <p>Every rate is taken from the tax authority that sets it, not from another calculator. Each jurisdiction's sources are linked at the foot of every comparison page, and here:</p>
  <ul>
    ${jurisdictions}
  </ul>
  <p>The figures are computed when the site is built, from those published rates. Nothing is copied from a competitor and nothing is estimated by an AI.</p>

  <h2>Why so few countries</h2>
  <p>Other sites advertise comparisons for 150 countries. Nobody maintains 150 tax codes accurately. An approximate answer to "can I afford to move" is worse than no answer, because you cannot tell it is wrong.</p>
  <p>Two examples of what accuracy costs. New York levies a supplemental tax above $107,650 that claws back the benefit of its lower brackets; using the headline bracket table and skipping it understates New York by thousands, so this site uses the State's own annual schedule instead. California's State Disability Insurance lost its wage cap in 2024, which is worth $6,500 a year at a $500,000 salary and is routinely left out. Getting those right takes reading the source documents, and it does not scale to 150 countries.</p>
  <p>Where a jurisdiction is not modelled, the code refuses to produce a number rather than guessing. Asking for a US state that has not been encoded raises an error; it does not quietly return a figure that is too low.</p>

  <h2>What the figures deliberately exclude</h2>
  <p>Tax and compulsory contributions only. Not rent, not childcare, not health insurance, not schooling, not the cost of the move itself &mdash; and those differences are frequently larger than the tax ones. A salary that looks better in Dubai can still leave you worse off once housing is paid for.</p>
  <p>Every figure assumes a single person on ordinary employment income with the standard allowances, paid evenly across the year. Bonuses, mid-year job changes, joint filing, dependants, pension arrangements and non-domiciled status all change the answer.</p>
  <p>Exchange rates are European Central Bank daily reference rates and move constantly. The tax arithmetic does not.</p>

  <h2>Who runs it</h2>
  <p>${SITE_NAME} is an independent project, not a company, and it is published anonymously. It is free, carries no advertising at the time of writing, sells nothing and takes no commission from anyone. Nobody pays for placement here because there is no placement to buy.</p>
  <p>You do not have to take the arithmetic on trust: every rate is sourced above, and if a figure looks wrong, say so at <a href="mailto:${CONTACT}">${CONTACT}</a> and the working will be shown.</p>
</article>`);
}

export function privacyPage() {
  return page(
    "Privacy",
    `What Salary Crossing collects, which is almost nothing: your salary is calculated in your own browser and never reaches the server.`,
    "/privacy/",
    `
<header class="masthead">
  <p class="eyebrow">Privacy &middot; updated ${UPDATED}</p>
  <h1>Your salary never <em>leaves your device</em></h1>
  <p class="standfirst">That is the whole policy in one line. The rest of this page explains what little else happens, in plain English rather than boilerplate.</p>
</header>

<article>
  <h2>What you type is not collected, because it is never sent</h2>
  <p>Every calculation on this site runs inside your own browser. The salary you enter, the countries you pick and the results you see are computed on your device and stay there. They are not transmitted to the server, not written to a database, and not logged. There is no account to create and nothing to sign in to.</p>
  <p>This is a structural fact, not a promise about how we behave: the pages are static files and the arithmetic ships to you as JavaScript. There is no server-side code that could receive a salary even if someone wanted it to.</p>

  <h2>What is recorded automatically</h2>
  <p>Like any web server, ours records a line for each request: the IP address, the time, the page requested, the referring page and the browser's user-agent string. This is standard web-server logging, used to keep the site running and to spot abuse.</p>
  <p>Each page also sends one small request back to our own server containing the address of the page and the site that linked you to it. That is how we count visits, since most pages are delivered from Cloudflare's cache and never reach our server otherwise. Nothing is stored in your browser for this. Log lines, including IP addresses, are deleted after 14 days; what is kept after that is daily totals only: how many visits, to which pages, from which sites and which countries.</p>
  <p>The server is an Oracle Cloud instance in the <strong>UK London</strong> region, so those logs stay in the United Kingdom.</p>

  <h2>No cookies, no tracking</h2>
  <p>This site sets no cookies. There is no Google Analytics, no Meta pixel, no session tracking, no fingerprinting and no advertising at the time of writing. Nothing follows you between pages or between sites.</p>
  <p>If advertising is ever added, it will involve third-party cookies and this page will be updated before it goes live, not after.</p>

  <h2>Third parties that can see your request</h2>
  <ul>
    <li><strong>Cloudflare</strong> sits in front of the site, serving pages from a location near you and filtering malicious traffic. Cloudflare processes your IP address as part of that. Their handling is governed by <a href="https://www.cloudflare.com/privacypolicy/" rel="nofollow">Cloudflare's privacy policy</a>.</li>
    <li><strong>Google Fonts</strong> supplies the typefaces, which means your browser requests files from <code>fonts.googleapis.com</code> and <code>fonts.gstatic.com</code>, and Google receives your IP address in the process. This is a common arrangement, but it is a real disclosure and we would rather state it than bury it. We intend to serve the fonts from our own server instead, which removes the connection entirely.</li>
    <li><strong>Currency data</strong> comes from the European Central Bank and is fetched once when the site is built, by our server, not by your browser. Your visit is never disclosed to them.</li>
  </ul>

  <h2>Your rights</h2>
  <p>Under UK GDPR you may ask what personal data is held about you, ask for it to be corrected or erased, and complain to the <a href="https://ico.org.uk/" rel="nofollow">Information Commissioner's Office</a>. In practice the only personal data here is your IP address in a server log, and there is no account or profile attached to it.</p>
  <p>Requests and questions: <a href="mailto:${CONTACT}">${CONTACT}</a>.</p>

  <h2>Changes</h2>
  <p>Material changes will be reflected in the date at the top of this page. This policy was last updated on ${UPDATED}.</p>
</article>`);
}

export function termsPage() {
  return page(
    "Terms and disclaimer",
    `Salary Crossing provides estimates for information only. It is not tax, financial, immigration or legal advice.`,
    "/terms/",
    `
<header class="masthead">
  <p class="eyebrow">Terms and disclaimer &middot; updated ${UPDATED}</p>
  <h1>Estimates, <em>not advice</em></h1>
  <p class="standfirst">This site is free, provided as-is, and intended to inform a decision rather than make one.</p>
</header>

<article>
  <h2>This is not advice</h2>
  <p>${SITE_NAME} is not a tax adviser, accountant, financial adviser, immigration adviser or law firm, and nothing here is tax, financial, immigration or legal advice. It is general information produced by applying published tax rates to a number you supplied.</p>
  <p>Before acting on anything here &mdash; accepting a job in another country, relocating, negotiating a salary, taking on a mortgage &mdash; take advice from a qualified professional who knows your circumstances.</p>

  <h2>Every figure is an estimate</h2>
  <p>The calculations assume a single person on ordinary employment income, with standard allowances, paid evenly across a full tax year, resident for tax purposes in the place shown. Real payslips depart from that constantly: bonuses, mid-year moves, joint assessment, dependants, pension schemes, share awards, non-domiciled status, local and municipal taxes not modelled here, and the treaty position between two countries when you are taxed in both.</p>
  <p>The mortgage pages are illustrations of lender arithmetic, not offers, decisions in principle, or predictions of what any lender will do.</p>
  <p>Tax rates change, sometimes mid-year and sometimes retrospectively. Exchange rates change daily. Rates in use are stated on each page along with the source, so you can check them yourself &mdash; and you should, before anything that matters.</p>

  <h2>Errors</h2>
  <p>We take accuracy seriously and cite a primary source for every rate, but this site is maintained by one person and may contain mistakes. No warranty is given that the figures are accurate, complete or current.</p>
  <p>If something looks wrong, please report it to <a href="mailto:${CONTACT}">${CONTACT}</a>. Corrections are made promptly and the working will be shown.</p>

  <h2>Liability</h2>
  <p>To the fullest extent permitted by law, ${SITE_NAME} accepts no liability for any loss arising from reliance on the information here, including financial loss from a relocation, job change, borrowing decision or tax position. You use the site at your own risk.</p>
  <p>Nothing in these terms limits liability for death or personal injury caused by negligence, for fraud, or for anything else that cannot lawfully be excluded.</p>

  <h2>Using the site</h2>
  <p>You are welcome to use these figures for your own decisions and to link to any page. Please do not scrape the site at a rate that degrades it for others, or republish the calculations as your own work. The tax rates themselves are public information and belong to nobody.</p>

  <h2>Governing law</h2>
  <p>These terms are governed by the law of England and Wales, and the courts of England and Wales have exclusive jurisdiction.</p>
  <p>Last updated ${UPDATED}. Tax year ${YEAR_LABEL} unless a page states otherwise.</p>
</article>`);
}

/**
 * A typed salary that is not on a ladder used to hit nginx's default grey
 * page. This one keeps the visitor on the site and points them somewhere real.
 */
export function notFoundPage() {
  return page(
    "Page not found",
    "That page does not exist. The comparison and calculator pages are linked below.",
    "/404.html",
    `
<header class="masthead">
  <p class="eyebrow">404</p>
  <h1>That page <em>does not exist</em></h1>
  <p class="standfirst">Most likely you typed a salary that has no page of its own &mdash; only round figures get one. The calculators below take any number.</p>
</header>
<ul class="neighbours" style="margin-top:24px">
  <li><a href="/">Compare two countries</a></li>
  <li><a href="/take-home/">UK take-home calculator</a></li>
  <li><a href="/mortgage/">Mortgage affordability</a></li>
  <li><a href="/compare/">All country comparisons</a></li>
  <li><a href="/salaries/">Every UK salary page</a></li>
</ul>`);
}
