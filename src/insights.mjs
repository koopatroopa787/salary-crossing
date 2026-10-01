/**
 * Original analysis.
 *
 * The rest of the site is generated from a template. These pages are not:
 * each one is a finding that required the engine to discover, and the tables
 * in them are computed at build time from the same modules the calculators
 * run, so they cannot drift away from the site's own numbers and they update
 * themselves when rates change.
 *
 * Every headline figure here was derived before the prose was written. If a
 * claim is not backed by a table on the page, it should not be on the page.
 */
import { takeHome, money } from "./tax.mjs";
import { affordability, STRESS_UPLIFT } from "./mortgage.mjs";
import { country, compare, fmt } from "./compare.mjs";
import { rate as fxRate } from "./fx.mjs";
import { matchAfterCosts, comparisonHash } from "./living_costs.mjs";
import { YEAR_LABEL } from "./rates.mjs";
import { BASE, url } from "./site.mjs";
import { shell } from "./render.mjs";

const usd = (n) => "$" + Math.round(n).toLocaleString("en-US");
const pence = (net) => `${Math.round(net / 10)}p`;

const PUBLISHED = "2026-09-05";
const MORTGAGE_DATA_PATH = "/data/uk-mortgage-affordability-by-salary-2026-27.csv";

const article = ({
  slug, title, description, eyebrow, h1, standfirst, body,
  datePublished = PUBLISHED, dateModified = datePublished, structuredData = [],
}) => ({
  slug,
  title,
  description,
  datePublished,
  h1: h1.replace(/<[^>]+>/g, ""),
  render: () => shell({
    title,
    description,
    canonical: url(`/insights/${slug}/`),
    script: " ",
    jsonLd: {
      "@context": "https://schema.org",
      "@graph": [{
        "@type": "Article",
        headline: h1.replace(/<[^>]+>/g, ""),
        description,
        datePublished,
        dateModified,
        isAccessibleForFree: true,
        author: { "@type": "Organization", name: "Salary Crossing" },
        publisher: { "@type": "Organization", name: "Salary Crossing" },
      }, ...structuredData],
    },
    body: `
<p class="crumb"><a href="${BASE}/insights/">Analysis</a> / ${eyebrow}</p>
<header class="masthead">
  <p class="eyebrow">${eyebrow}</p>
  <h1>${h1}</h1>
  <p class="standfirst">${standfirst}</p>
</header>
<article>${body}
  <p class="hint">Writing about this? The table is free to quote or republish with a credit link. <a href="${BASE}/use-our-numbers/">How to use it</a>.</p>
</article>`,
  }),
});

const table = (caption, head, rows) => `
<div class="raise">
  <table>
    <caption>${caption}</caption>
    <thead><tr>${head.map((h, i) => `<th${i ? ' class="num"' : ""} scope="col">${h}</th>`).join("")}</tr></thead>
    <tbody>
      ${rows.map((r) => `<tr>${r.map((c, i) => i ? `<td class="num">${c}</td>` : `<th scope="row">${c}</th>`).join("")}</tr>`).join("\n      ")}
    </tbody>
  </table>
</div>`;

/* ── 1. the £100,000 cliff ──────────────────────────────────────────────── */

function raiseTrap() {
  const keeps = (s) => takeHome({ salary: s + 1000 }).net - takeHome({ salary: s }).net;
  const rows = [30000, 50000, 60000, 99000, 100000, 110000, 125000, 150000]
    .map((s) => [money(s), money(keeps(s)), pence(keeps(s))]);

  return article({
    slug: "worst-salary-for-a-pay-rise",
    title: `The Worst Salary in Britain to Get a Pay Rise (${YEAR_LABEL})`,
    description: `At £100,000 a £1,000 raise leaves you £380 — worse than at £30,000, and worse than at £150,000. The exact band, and what it costs.`,
    eyebrow: "Marginal rates",
    h1: "The worst salary in Britain to get a <em>pay rise</em>",
    standfirst: "At £100,000 a year, a £1,000 raise leaves you with £380. Someone on £30,000 keeps £720 of the same raise. Someone on £150,000 keeps £530. The worst place to be paid more is not the top.",
    body: `
  <p>Almost everyone understands the headline rates: 20%, then 40%, then 45%. Almost nobody is told about the band between them where the effective rate is <strong>60%</strong>, and it lands on a salary that plenty of people reach.</p>

  ${table("What £1,000 more actually leaves you", ["Salary", "You keep", "Per pound"], rows)}

  <h2>Why £100,000 is the cliff</h2>
  <p>The personal allowance &mdash; the first ${money(12570)} you earn tax-free &mdash; starts disappearing once you earn over ${money(100000)}. It goes at £1 of allowance for every £2 of income. So each extra pound is taxed at 40%, <em>and</em> destroys 50p of tax-free allowance, which is itself then taxed at 40%. Add National Insurance at 2% and the effective rate on that pound is 62%.</p>
  <p>The band runs from ${money(100000)} to ${money(125140)}, at which point the allowance has gone entirely and the rate <em>falls back</em> to 47%. That is the strange part: earning more makes your marginal rate go down.</p>

  <h2>What the whole band costs</h2>
  <p>Going from ${money(100000)} to ${money(125140)} is a gross rise of ${money(25140)}. Your take-home goes from ${money(takeHome({ salary: 100000 }).net)} to ${money(takeHome({ salary: 125140 }).net)} &mdash; an increase of <strong>${money(takeHome({ salary: 125140 }).net - takeHome({ salary: 100000 }).net)}</strong>. You did over ${money(25000)} of extra work for under ${money(10000)}.</p>

  <h2>What people actually do about it</h2>
  <p>The standard move is to take the money as a pension contribution instead. Pension contributions reduce your adjusted net income, and if they bring you back under ${money(100000)} the allowance is restored. Inside the band, every £1,000 sacrificed effectively costs you £380 of take-home, because £380 is all you were going to see of it.</p>
  <p>Salary sacrifice goes further, because it also removes the National Insurance. This is not advice, and whether it suits you depends on your age, your other income and what you need the money for &mdash; but it is why the band exists as a topic of conversation at all.</p>
  <p>Run your own figure on the <a href="${BASE}/take-home/">take-home calculator</a>: the marginal rate is shown next to the result, and it turns red inside the trap.</p>`,
  });
}

/* ── 2. Scotland's crossover ────────────────────────────────────────────── */

function scotlandCrossover() {
  const diff = (s) => takeHome({ salary: s, region: "scotland" }).net - takeHome({ salary: s, region: "uk" }).net;
  let crossover = null;
  for (let s = 12000; s <= 200000; s += 100) if (diff(s) < 0 && crossover === null) crossover = s;

  const rows = [20000, 25000, 30000, 33500, 40000, 50000, 75000, 100000, 150000].map((s) => {
    const d = Math.round(diff(s));
    if (d === 0) return [money(s), money(0), "the crossover"];   // not "−£0, worse off"
    return [money(s), `${d > 0 ? "+" : "−"}${money(Math.abs(d))}`, d > 0 ? "better off" : "worse off"];
  });

  return article({
    slug: "scotland-vs-england-crossover",
    title: `The Exact Salary Where Scotland Costs You More (${YEAR_LABEL})`,
    description: `Scottish taxpayers are better off below £33,500 and worse off above it. The precise crossover, and what the gap grows to.`,
    eyebrow: "Scotland",
    h1: "The exact salary where Scotland <em>starts costing you more</em>",
    standfirst: `Scotland sets its own income tax bands, and there is a single salary at which the arrangement flips from cheaper to dearer. This year it is ${money(crossover)}.`,
    body: `
  <p>"Tax is higher in Scotland" is repeated so often that it is treated as a flat fact. It is not. Scotland has six income tax bands where England, Wales and Northern Ireland have three, and the lower ones are <em>cheaper</em>. Below ${money(crossover)} a Scottish taxpayer keeps slightly more.</p>
  <p>The advantage is small &mdash; about ${money(40)} a year &mdash; because the starter rate is only one percentage point below the basic rate and it applies to a narrow slice of income. But it is real, and it means the honest answer to "am I worse off in Scotland" depends entirely on what you earn.</p>

  ${table("Scotland compared with England, Wales and Northern Ireland", ["Salary", "Difference", ""], rows)}

  <h2>Where the gap comes from</h2>
  <p>Above the crossover, three things compound. Scotland's intermediate rate is 21% where the rest of the UK charges 20%. Its higher rate of 42% starts at ${money(43663)}, well below the ${money(50270)} threshold elsewhere &mdash; so a band of income around ${money(45000)} is taxed at 42% in Scotland and 20% next door. And at the top, Scotland charges 48% where the rest of the UK charges 45%.</p>
  <p>The gap therefore widens with income rather than staying fixed: a few tens of pounds at ${money(30000)}, roughly ${money(Math.abs(diff(50000)))} at ${money(50000)}, and about ${money(Math.abs(diff(150000)))} at ${money(150000)}.</p>

  <h2>The bit that is usually left out</h2>
  <p>This compares income tax and National Insurance, and nothing else. It is not an argument about whether Scottish taxpayers get more for the money &mdash; tuition, prescriptions and personal care are all funded differently &mdash; and this site takes no position on that. It is only the arithmetic of the payslip.</p>
  <p>Both figures for any salary are on the <a href="${BASE}/take-home/">take-home calculator</a>: switch the region and watch the numbers move.</p>`,
  });
}

/* ── 3. two earners ─────────────────────────────────────────────────────── */

function twoEarners() {
  const rows = [50000, 60000, 80000, 100000, 150000].map((total) => {
    const one = takeHome({ salary: total }).net;
    const two = takeHome({ salary: total / 2 }).net * 2;
    return [money(total), money(one), money(two), money(two - one)];
  });

  return article({
    slug: "two-salaries-beat-one",
    title: "Two Salaries Beat One: The Cost of an Uneven Household Income",
    description: `A couple earning £30,000 each keeps £4,882 more than a household where one person earns £60,000. The gap reaches £16,828 at £150,000.`,
    eyebrow: "Household structure",
    h1: "Two salaries beat one, and the gap is <em>bigger than you think</em>",
    standfirst: "Two people earning £30,000 each take home £4,882 more than one person earning £60,000. Same household income, same tax system, different answer.",
    body: `
  <p>The UK taxes individuals, not households. That single design decision means a household's tax bill depends not just on what it earns but on how the earning is distributed &mdash; and the effect is much larger than most people expect.</p>

  ${table("Household income, split one way or two", ["Household income", "One earner", "Split evenly", "Difference"], rows)}

  <h2>Why the gap exists</h2>
  <p>Two earners get two personal allowances, so ${money(25140)} of household income is tax-free instead of ${money(12570)}. They also get two runs at the basic-rate band, so more income is taxed at 20% rather than 40%. At ${money(100000)} of household income, one earner is deep into higher-rate tax while two earners on ${money(50000)} each are entirely below the threshold.</p>
  <p>The gap grows with income because the thresholds it exploits are fixed. At ${money(150000)} household income the difference reaches <strong>${money(takeHome({ salary: 75000 }).net * 2 - takeHome({ salary: 150000 }).net)}</strong> a year.</p>

  <h2>Where this actually matters</h2>
  <p>It is not usually a choice, and this is not a suggestion that anyone rearrange their career for the tax system. But it is worth knowing in two situations. When one partner is considering going part-time or stopping work, the household loses more than that person's take-home &mdash; it loses the allowance and the band too. And when a couple is comparing two job offers with the same household total, the split is not neutral.</p>
  <p>It also matters for mortgage affordability, and in the opposite direction: lenders apply the income multiple to <em>gross</em> household income, so both households are offered the same loan. The two-earner household simply has more money to pay it with. The <a href="${BASE}/mortgage/">affordability calculator</a> shows both figures.</p>`,
  });
}

/* ── 4. the mortgage ceiling ────────────────────────────────────────────── */

function mortgageCeiling() {
  const points = [30000, 50000, 75000, 100000, 150000];
  const results = points.map((inc) => affordability({ income1: inc, deposit: 10_000_000, rate: 4.5 }));
  const rows = points.map((inc, i) => {
    const r = results[i];
    return [money(inc), money(r.loan), money(r.payment) + "/m",
      `${(r.share * 100).toFixed(0)}%`, `${(r.stressedShare * 100).toFixed(0)}%`];
  });
  const lo = Math.min(...results.map((r) => r.share)), hi = Math.max(...results.map((r) => r.share));

  return article({
    slug: "four-and-a-half-times-income",
    title: "4.5x Your Income Is a Ceiling, Not a Budget",
    description: `Borrow the full 4.5x and the mortgage takes 36% to 49% of your take-home pay before a higher-rate illustration. The arithmetic at every income.`,
    eyebrow: "Mortgages",
    h1: "4.5&times; your income is a ceiling, <em>not a budget</em>",
    standfirst: `The Bank of England limits the share of new mortgages at or above 4.5 times income. That makes 4.5&times; a useful planning ceiling, but not a promise or a household budget. Borrow that amount and the payment takes ${(lo * 100).toFixed(0)}% to ${(hi * 100).toFixed(0)}% of estimated take-home pay.`,
    dateModified: "2026-09-27",
    structuredData: [{
      "@type": "Dataset",
      name: `UK mortgage affordability by salary, ${YEAR_LABEL}`,
      description: "Calculated mortgage, monthly payment and take-home-pay share for UK salaries from £20,000 to £150,000 in £5,000 steps.",
      url: url("/insights/four-and-a-half-times-income/"),
      dateModified: "2026-09-27",
      license: "https://creativecommons.org/licenses/by/4.0/",
      creator: { "@id": url("/#organization") },
      distribution: {
        "@type": "DataDownload",
        encodingFormat: "text/csv",
        contentUrl: url(MORTGAGE_DATA_PATH),
      },
    }],
    body: `
  <p>The 4.5&times; figure comes from a financial stability rule designed to keep mortgages at or above that multiple to no more than 15% of new lending in aggregate. Individual lenders and products vary. The rule protects the financial system; it does not say what an individual household can comfortably afford.</p>

  ${table(`Borrowing the full 4.5&times;, over 25 years at 4.5%`,
    ["Income", "Borrowing", "Payment", "Of take-home", `At ${4.5 + STRESS_UPLIFT}%`], rows)}

  <p class="route-cta"><a href="${BASE}${MORTGAGE_DATA_PATH}" download>Download the complete salary table as CSV &rarr;</a></p>
  <p class="hint">The download covers £20,000 to £150,000 in £5,000 steps and is available under CC BY 4.0. Cite and link to this analysis when republishing it.</p>

  <h2>The pattern nobody mentions</h2>
  <p>The share <em>rises</em> with income. At ${money(30000)} the payment is ${(results[0].share * 100).toFixed(0)}% of take-home; at ${money(150000)} it is ${(results[4].share * 100).toFixed(0)}%. That is the opposite of the usual intuition that higher earners have more room.</p>
  <p>The reason is that the multiple is applied to gross income while the payment comes out of net. As income rises, a larger share of it is lost to tax, so the same multiple of gross is a larger multiple of what actually arrives. A £150,000 earner keeps a smaller proportion of their salary than a £30,000 earner, but is offered exactly 4.5 times the whole thing.</p>

  <h2>A higher-rate illustration</h2>
  <p>Lenders assess income, debts and regular spending, and many must consider likely interest-rate rises during the first five years. The FCA does not prescribe one uplift for every application, and an initial fixed rate lasting at least five years is generally exempt from that particular future-rate test. The final column is therefore a household planning scenario at ${4.5 + STRESS_UPLIFT}%, not a reproduction of lender underwriting. In that illustration, the payment reaches ${(results[4].stressedShare * 100).toFixed(0)}% of take-home at the top of the table.</p>

  <h2>A more useful number</h2>
  <p>If you want the payment under a third of your take-home, you are looking at roughly 3.5&times; income rather than 4.5&times;. That is not a rule, and plenty of households live comfortably above it &mdash; but it is the multiple that corresponds to the comfort level people <em>think</em> 4.5&times; represents.</p>
  <p>Work out your own on the <a href="${BASE}/mortgage/">affordability calculator</a>, which shows the payment against your estimated take-home rather than your gross.</p>

  <h2>Sources</h2>
  <p>Reviewed 27 September 2026 against the <a href="https://www.bankofengland.co.uk/financial-stability-report/2026/july-2026">Bank of England's July 2026 Financial Stability Report</a>, the <a href="https://www.fca.org.uk/firms/interest-rate-stress-test-rule">FCA interest-rate stress-test rule</a> and <a href="https://www.moneyhelper.org.uk/en/homes/buying-a-home/mortgage-affordability-calculator">MoneyHelper mortgage affordability guidance</a>.</p>`,
  });
}

export function mortgageDatasetCsv() {
  const header = [
    "gross_salary_gbp",
    "mortgage_at_4_5x_gbp",
    "monthly_payment_at_4_5_percent_gbp",
    "estimated_monthly_take_home_gbp",
    "payment_share_percent",
    `monthly_payment_at_${4.5 + STRESS_UPLIFT}_percent_gbp`.replace(".", "_"),
    "higher_rate_payment_share_percent",
  ];
  const rows = [];
  for (let income = 20000; income <= 150000; income += 5000) {
    const r = affordability({
      income1: income,
      deposit: 10_000_000,
      rate: 4.5,
      multiple: 4.5,
      termYears: 25,
    });
    rows.push([
      income,
      Math.round(r.loan),
      r.payment.toFixed(2),
      r.netMonthly.toFixed(2),
      (r.share * 100).toFixed(2),
      r.stressed.toFixed(2),
      (r.stressedShare * 100).toFixed(2),
    ]);
  }
  return [header, ...rows].map((row) => row.join(",")).join("\n") + "\n";
}

/* ── 5. New York and Austin ─────────────────────────────────────────────── */

function newYorkAustin() {
  const matchInAustin = (nycGross) => {
    const target = country("USNY").netPay(nycGross).net;
    let lo = 0, hi = nycGross * 2;
    for (let i = 0; i < 60; i++) {
      const mid = (lo + hi) / 2;
      if (country("USTX").netPay(mid).net < target) lo = mid; else hi = mid;
    }
    return (lo + hi) / 2;
  };
  const rows = [100000, 150000, 200000, 300000].map((s) => {
    const tx = matchInAustin(s);
    return [usd(s), usd(country("USNY").netPay(s).net), usd(tx), usd(s - tx)];
  });

  return article({
    slug: "new-york-versus-austin",
    title: "How Big a Pay Cut Can You Take Moving From New York to Austin?",
    description: `$200,000 in New York City is matched by $172,316 in Austin. The pay cut you can absorb, at four income levels, after every tax.`,
    eyebrow: "United States",
    h1: "The pay cut you can afford <em>leaving New York</em>",
    standfirst: "$200,000 in New York City leaves you the same as $172,316 in Austin. You could accept $27,684 less and be no worse off, before rent enters the conversation.",
    body: `
  <p>New York City residents pay four taxes on their wages: federal income tax, FICA, New York State income tax, and a separate New York City resident income tax. Texas has no state or city income tax at all, so an Austin salary faces only the first two.</p>

  ${table("What a New York salary is worth in Austin", ["New York City", "You keep", "Austin equivalent", "Cut you can take"], rows)}

  <h2>The tax New York calculators tend to miss</h2>
  <p>Above $107,650, New York levies a supplemental tax that claws back the benefit of its lower brackets, so high earners pay their top marginal rate on <em>all</em> their income rather than progressively. Most comparison tools use the headline bracket table and skip it, which understates New York by thousands of dollars for exactly the people most likely to be weighing up a move.</p>
  <p>This site uses New York State's own annual withholding schedule instead, which has the recapture built in. You can tell it is doing something unusual by looking at its published rates, which run 5.90%, 7.03%, 7.53%, <em>6.40%</em>, 11.44%, 7.35% &mdash; they go down and up again, because the recapture is being spread across those lines.</p>

  <h2>What this does not settle</h2>
  <p>Tax is the part that can be calculated exactly. Housing is the part that decides it, and this comparison excludes it entirely. Rent, property taxes, car ownership, health insurance and childcare all differ enormously between the two cities, and in several of those Texas is not the cheaper option it is assumed to be.</p>
  <p>Treat the figure above as the size of the tax advantage, not the size of the total advantage. It tells you how much room you have to negotiate, not whether to go.</p>
  <p>Other salaries and other cities: <a href="${BASE}/compare/usny-to-ustx/">New York against Austin at every income</a>, or start from the <a href="${BASE}/">comparison tool</a>.</p>`,
  });
}

/* ── 6. London to Dubai, with user-controlled costs ─────────────────────── */

function londonDubai(fx) {
  const gross = 75000;
  const rate = fxRate(fx.perEur, "GBP", "AED");
  const salaryOnly = compare({ gross, from: "UK", to: "AE", rate });
  // These are deliberately round, fictional budgets, not city averages.
  const ukCosts = { housing: 1800, transport: 250, other: 500 };
  const dubaiCosts = { housing: 8000, healthcare: 500, transport: 1000, other: 2000 };
  const dubaiWithSchool = { ...dubaiCosts, childcare: 3000 };
  const afterCosts = matchAfterCosts({ gross, from: "UK", to: "AE", rate, fromCosts: ukCosts, toCosts: dubaiCosts });
  const withSchool = matchAfterCosts({ gross, from: "UK", to: "AE", rate, fromCosts: ukCosts, toCosts: dubaiWithSchool });
  const uk = country("UK").meta;
  const ae = country("AE").meta;
  const moneyAe = (amount) => fmt(amount, ae);
  const costsLink = `${BASE}/${comparisonHash({ from: "UK", to: "AE", gross, fromCosts: ukCosts, toCosts: dubaiCosts })}`;

  return article({
    slug: "london-to-dubai-salary-after-living-costs",
    title: `London to Dubai Salary Comparison: Tax and Living Costs (${YEAR_LABEL})`,
    description: `What a £75,000 London salary needs in Dubai after tax, then after your own housing, healthcare and school costs. An adjustable example with sources and assumptions.`,
    eyebrow: "London to Dubai",
    h1: "Is a move from London to Dubai <em>worth it financially?</em>",
    standfirst: `A £75,000 London salary leaves ${money(salaryOnly.from.net)} after UK income tax and National Insurance. Matching that spendable pay in Dubai takes about ${moneyAe(salaryOnly.to.gross)} at the ${fx.date} exchange rate. The answer changes when you add the costs you would actually pay in each city.`,
    datePublished: "2026-10-01",
    body: `
  <p>Dubai's lack of personal income tax on expatriate employment is only one line of a relocation decision. An employer's health cover, housing allowance, school fees, pension or end-of-service benefit can matter just as much. The useful question is what remains after your own unavoidable costs, not which payslip has the lower tax.</p>

  ${table("£75,000 in London: three different comparisons", ["Comparison", "Dubai gross needed", "What is included"], [
    ["Spendable pay only", moneyAe(salaryOnly.to.gross), "UK tax and NI; no living costs"],
    ["After illustrated essentials", moneyAe(afterCosts.gross), "Illustrative housing, transport, healthcare and other essentials"],
    ["Essentials plus school fees", moneyAe(withSchool.gross), "The same illustrated budget plus AED 3,000 monthly schooling"],
  ])}

  <h2>What we entered in the illustration</h2>
  <p>The London side uses <strong>£1,800 housing, £250 transport and £500 other essentials per month</strong>. The Dubai side uses <strong>AED 8,000 housing, AED 500 healthcare, AED 1,000 transport and AED 2,000 other essentials per month</strong>. The final row adds AED 3,000 a month for schooling. These are round <strong>hypothetical inputs, not measured city averages or a recommended budget</strong>. Replace every one with your own quotes and circumstances.</p>
  <p>The London pay figure assumes one employee in England with a standard tax code, no student loan and no employee pension deduction. The Dubai calculation assumes an expatriate employee subject to the site's UAE model. It does not model dual tax residency, UK departure-year treatment, bonuses, equity, allowances or a partner's income.</p>

  <h2>Why a benefit can change the answer</h2>
  <p>If an employer pays a cost directly, remove that cost from the Dubai column before comparing. In this tax-free salary model, adding AED 3,000 of monthly school costs raises the required annual cash salary by ${moneyAe(withSchool.gross - afterCosts.gross)}. This is an illustration of how the calculation responds to an input; it is not a prediction of school fees. Pension and end-of-service benefits should be compared separately from money available for this month's bills.</p>

  <p class="route-cta"><a href="${costsLink}">Adjust both budgets and see your own result &rarr;</a></p>

  <h2>Check the offer before deciding</h2>
  <ul>
    <li>Get the basic salary, bonus conditions, allowances and employer-paid benefits in writing.</li>
    <li>Compare actual housing options, medical cover and any school places or fees for your household.</li>
    <li>Check which country will tax your pay during the move and whether your circumstances need specialist advice.</li>
    <li>Recheck the result when the exchange rate or offer terms change.</li>
  </ul>
  <p>At the ${fx.date} build-time reference rate, £1 equals ${rate.toFixed(4)} AED. AED is derived through the USD peg because the <a href="https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/index.en.html">ECB reference table</a> does not publish AED. Tax assumptions follow <a href="https://www.gov.uk/income-tax-rates">UK Income Tax</a>, <a href="https://www.gov.uk/national-insurance-rates-letters">National Insurance</a> and the <a href="https://u.ae/en/information-and-services/finance-and-investment/taxation/other-taxes/income-tax">UAE government's income-tax guidance</a>. This is a planning example, not tax or relocation advice.</p>`,
  });
}

export function insights(fx) {
  return [raiseTrap(), scotlandCrossover(), twoEarners(), mortgageCeiling(), newYorkAustin(), londonDubai(fx)];
}

export function insightsIndexPage(list) {
  return shell({
    title: "Analysis — Salary Crossing",
    description: "Original analysis of UK and US tax arithmetic, computed rather than repeated: the £100,000 trap, Scotland's crossover, and what 4.5x income really costs.",
    canonical: url("/insights/"),
    script: " ",
    body: `
<header class="masthead">
  <p class="eyebrow">Analysis</p>
  <h1>Things the arithmetic says that <em>nobody mentions</em></h1>
  <p class="standfirst">Each of these started as a calculation rather than an opinion. Every figure is computed by the same engine that runs the calculators, so the tables update themselves when the rates change.</p>
</header>
<div class="cards" style="margin-top:26px">
  ${list.map((a) => `
  <a class="card" href="${BASE}/insights/${a.slug}/">
    <span class="card-route">${a.h1.length > 46 ? a.h1.slice(0, 46) + "…" : a.h1}</span>
    <span class="card-sub" style="margin-top:6px">${a.description}</span>
  </a>`).join("\n")}
</div>`,
  });
}
