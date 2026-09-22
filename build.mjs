/**
 * Build the site. `node build.mjs`
 *
 * Everything is written to public/ and served by nginx as plain files. There
 * is no server process, so the running cost of the site is zero and the only
 * thing that can go down is nginx.
 */
import { mkdir, writeFile, copyFile, rm, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { assets } from "./src/assets.mjs";
import { salaryPage, indexPage, takeHomePage } from "./src/render.mjs";
import { homePage } from "./src/home_page.mjs";
import { mortgagePage } from "./src/mortgage_page.mjs";
import { comparePage, compareIndexPage } from "./src/compare_page.mjs";
import { aboutPage, privacyPage, termsPage, notFoundPage } from "./src/legal_pages.mjs";
import { insights, insightsIndexPage } from "./src/insights.mjs";
import { embedPage, sharePage } from "./src/share_page.mjs";
import { CODES, country } from "./src/compare.mjs";
import { fetchRates, rate as fxRate } from "./src/fx.mjs";
import { COUNTRIES } from "./src/compare.mjs";
import { ORIGIN, BASE } from "./src/site.mjs";

const OUT = new URL("./public/", import.meta.url);
const out = (p) => new URL(p.replace(/^\//, ""), OUT);

/**
 * Which salaries get a UK page.
 *
 * £1,000 steps where people actually earn, £5,000 steps in the tail. Finer
 * than this would be a thousand pages that differ by a rounding error, which
 * is the doorway-page pattern Google demotes — the pages have to answer
 * different questions, not just carry different numbers.
 */
function salaryList() {
  const list = new Set();
  for (let s = 15000; s <= 100000; s += 1000) list.add(s);
  for (let s = 100000; s <= 200000; s += 5000) list.add(s);
  for (const s of [12570, 20000, 25000, 30000, 50270, 100000, 125140]) list.add(s);
  return [...list].sort((a, b) => a - b);
}

/** Round numbers people actually type, in each source currency. */
const LADDERS = {
  GBP: [25000, 30000, 40000, 50000, 60000, 75000, 90000, 100000, 125000, 150000],
  USD: [60000, 80000, 100000, 120000, 150000, 180000, 220000, 260000, 300000, 400000],
  AUD: [60000, 80000, 100000, 120000, 150000, 180000, 220000, 260000, 300000, 400000],
  AED: [150000, 200000, 300000, 400000, 500000, 650000, 800000, 1000000, 1250000, 1500000],
};

const neighboursOf = (list, i) =>
  [list[i - 2], list[i - 1], list[i + 1], list[i + 2]].filter(Boolean);

async function buildComparisons(fx) {
  const pairs = [];

  for (const from of CODES) {
    for (const to of CODES) {
      if (from === to) continue;

      const a = country(from).meta;
      const b = country(to).meta;
      const r = fxRate(fx.perEur, a.currency, b.currency);
      const ladder = LADDERS[a.currency];
      const slug = `${from.toLowerCase()}-to-${to.toLowerCase()}`;
      pairs.push({ from, to, slug, ladder });

      for (const gross of ladder) {
        const dir = out(`/compare/${slug}/${gross}/`);
        await mkdir(dir, { recursive: true });
        await writeFile(new URL("index.html", dir), comparePage({
          gross, from, to, rate: r, fxDate: fx.date,
          neighbours: ladder.filter((n) => n !== gross),
        }));
      }

      // The hub for a pair is the comparison at the middle of the ladder, so
      // it is a real answer rather than a list of links to real answers.
      const hub = out(`/compare/${slug}/`);
      await mkdir(hub, { recursive: true });
      await writeFile(new URL("index.html", hub), comparePage({
        gross: ladder[Math.floor(ladder.length / 2)], from, to,
        rate: r, fxDate: fx.date, neighbours: ladder, isHub: true,
      }));
    }
  }

  await writeFile(out("/compare/index.html"), compareIndexPage(pairs));
  return pairs;
}

async function main() {
  const salaries = salaryList();

  await rm(out("/salary"), { recursive: true, force: true });
  await rm(out("/compare"), { recursive: true, force: true });
  await rm(out("/js"), { recursive: true, force: true });
  await mkdir(out("/js"), { recursive: true });
  await mkdir(out("/salaries"), { recursive: true });
  await mkdir(out("/compare"), { recursive: true });

  // The browser and the generator import the identical files.
  // Hash the whole module tree together and emit it into one versioned
  // directory, so relative imports between modules still resolve and a
  // redeploy cannot be served a stale (or wrongly-typed) cached copy.
  const modules = ["tax.mjs", "rates.mjs", "mortgage.mjs", "compare.mjs", "embed_options.mjs", "living_costs.mjs", "site.mjs"];
  const countryModules = ["common.mjs", "uk.mjs", "ae.mjs", "us.mjs", "au.mjs"];
  const sources = [];
  for (const f of modules) sources.push(await readFile(new URL(`./src/${f}`, import.meta.url)));
  for (const f of countryModules) sources.push(await readFile(new URL(`./src/countries/${f}`, import.meta.url)));
  const jsHash = createHash("sha256").update(Buffer.concat(sources)).digest("hex").slice(0, 8);
  assets.js = `/js/${jsHash}`;

  await mkdir(out(`${assets.js}/countries`), { recursive: true });
  for (const f of modules) {
    await copyFile(new URL(`./src/${f}`, import.meta.url), out(`${assets.js}/${f}`));
  }
  for (const f of countryModules) {
    await copyFile(new URL(`./src/countries/${f}`, import.meta.url), out(`${assets.js}/countries/${f}`));
  }
  // Content-hashed so a redeploy can never be met with a cached stylesheet.
  const css = await readFile(new URL("./static/style.css", import.meta.url));
  const hash = createHash("sha256").update(css).digest("hex").slice(0, 8);
  assets.style = `/style.${hash}.css`;
  await writeFile(out(assets.style), css);

  const fx = await fetchRates();
  console.log(`  fx: ECB rates for ${fx.date}${fx.stale ? " (cached)" : ""}`);

  // Every ordered pair's rate, precomputed so the browser never needs an API.
  const rates = {};
  for (const from of Object.keys(COUNTRIES)) {
    for (const to of Object.keys(COUNTRIES)) {
      if (from === to) continue;
      rates[`${from}>${to}`] = fxRate(fx.perEur,
        COUNTRIES[from].meta.currency, COUNTRIES[to].meta.currency);
    }
  }

  await writeFile(out("/index.html"), homePage({ fx, rates }));
  await mkdir(out("/take-home"), { recursive: true });
  await writeFile(out("/take-home/index.html"), takeHomePage());
  await writeFile(out("/salaries/index.html"), indexPage(salaries));

  await mkdir(out("/mortgage"), { recursive: true });
  await writeFile(out("/mortgage/index.html"), mortgagePage());

  await writeFile(out("/404.html"), notFoundPage());

  for (const [path, render] of [["/about", aboutPage], ["/privacy", privacyPage], ["/terms", termsPage]]) {
    await mkdir(out(path), { recursive: true });
    await writeFile(out(`${path}/index.html`), render());
  }

  const articles = insights();
  await mkdir(out("/insights"), { recursive: true });
  await writeFile(out("/insights/index.html"), insightsIndexPage(articles));
  for (const a of articles) {
    await mkdir(out(`/insights/${a.slug}`), { recursive: true });
    await writeFile(out(`/insights/${a.slug}/index.html`), a.render());
  }

  await mkdir(out("/embed"), { recursive: true });
  await writeFile(out("/embed/index.html"), embedPage({ rates }));      // noindex, not in the sitemap
  await mkdir(out("/use-our-numbers"), { recursive: true });
  await writeFile(out("/use-our-numbers/index.html"), sharePage(articles));

  const pairs = await buildComparisons(fx);

  for (const [i, salary] of salaries.entries()) {
    const dir = out(`/salary/${salary}/`);
    await mkdir(dir, { recursive: true });
    await writeFile(new URL("index.html", dir), salaryPage(salary, neighboursOf(salaries, i)));
  }

  const compareUrls = pairs.flatMap(({ slug, ladder }) =>
    [`/compare/${slug}/`, ...ladder.map((g) => `/compare/${slug}/${g}/`)]);

  const urls = [
    "/", "/take-home/", "/mortgage/", "/compare/", ...compareUrls,
    "/about/", "/privacy/", "/terms/", "/use-our-numbers/",
    "/insights/", ...articles.map((a) => `/insights/${a.slug}/`),
    "/salaries/", ...salaries.map((s) => `/salary/${s}/`),
  ];

  await writeFile(out("/sitemap.xml"),
    `<?xml version="1.0" encoding="UTF-8"?>\n`
    + `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`
    + urls.map((u) => `  <url><loc>${ORIGIN}${BASE}${u}</loc></url>`).join("\n")
    + `\n</urlset>\n`);

  await writeFile(out("/robots.txt"),
    `User-agent: *\nAllow: /\nSitemap: ${ORIGIN}${BASE}/sitemap.xml\n`);

  console.log(`built ${urls.length} pages: ${salaries.length} salaries, ${compareUrls.length} comparisons`);
}

main();
