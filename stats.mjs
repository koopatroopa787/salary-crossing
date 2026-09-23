/**
 * Visits, from the /hit beacon log. `node stats.mjs [days]`
 *
 * nginx writes one line per page view (see BEACON in src/render.mjs) and
 * logrotate deletes those lines after 14 days. Each run folds whatever the
 * logs still hold into a small history file of daily totals, so the numbers
 * outlive the logs while the IP addresses do not. Run it daily from cron.
 *
 * "Visitors" is distinct IP + browser per day. A range adds the days up, so
 * someone who comes back on three days counts three times.
 */
import { readFileSync, writeFileSync, readdirSync, existsSync, renameSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { join, basename } from "node:path";
import { fileURLToPath } from "node:url";

const LOG = process.env.STATS_LOG ?? "/var/log/nginx/salarycrossing-hits.log";
const HISTORY = process.env.STATS_HISTORY ?? fileURLToPath(new URL("./stats-history.json", import.meta.url));

const BOT = /bot|crawl|spider|slurp|headless|lighthouse|preview|monitor|curl|wget|python|scrapy|chatgpt-user|claude-web|anthropic|openai|perplexity|facebookexternalhit/i;
const MAX_DAILY_VIEWS = 60;

const decode = (s) => { try { return decodeURIComponent(s); } catch { return s; } };

/** One log line → a view, or null for junk and robots. */
export function parse(line) {
  // log_format: time \t ip \t country \t path \t referrer \t user-agent
  const [time, ip, country, p, r, ua = ""] = line.split("\t");
  if (!time || !p || BOT.test(ua)) return null;
  const path = decode(p);
  if (!path.startsWith("/") || path.length > 200) return null;
  const event = path.match(/^\/event\/([a-z0-9-]+)$/)?.[1] ?? null;
  let ref = "(direct)";
  try {
    const host = new URL(decode(r)).hostname.replace(/^www\./, "");
    ref = host === "salarycrossing.com" ? null : host;
  } catch { /* empty or malformed referrer: direct */ }
  return { day: time.slice(0, 10), visitor: ip + "|" + ua, country: country || "??", path, ref, event };
}

const bump = (o, k) => { o[k] = (o[k] ?? 0) + 1; };

/** Views grouped into daily totals. Internal navigation isn't a referrer. */
export function tally(views) {
  const days = {};
  const seen = {};
  const activity = {};
  for (const v of views) {
    if (!v.event) {
      const key = v.day + "|" + v.visitor;
      activity[key] = (activity[key] ?? 0) + 1;
    }
  }
  const automated = new Set(Object.entries(activity)
    .filter(([, count]) => count > MAX_DAILY_VIEWS)
    .map(([key]) => key));

  for (const v of views) {
    if (automated.has(v.day + "|" + v.visitor)) continue;
    const d = (days[v.day] ??= { views: 0, visitors: 0, pages: {}, refs: {}, countries: {}, events: {} });
    if (v.event) { bump(d.events, v.event); continue; }
    d.views++;
    bump(d.pages, v.path);
    if (v.ref) bump(d.refs, v.ref);
    const s = (seen[v.day] ??= new Set());
    if (!s.has(v.visitor)) { s.add(v.visitor); d.visitors++; bump(d.countries, v.country); }
  }
  return days;
}

function readLogs() {
  const dir = join(LOG, "..");
  const name = basename(LOG);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f === name || f.startsWith(name + "."))
    .flatMap((f) => {
      const raw = readFileSync(join(dir, f));
      return (f.endsWith(".gz") ? gunzipSync(raw) : raw).toString("utf8").split("\n");
    });
}

function merge(a, b) {
  const out = { ...a };
  for (const [k, n] of Object.entries(b)) out[k] = (out[k] ?? 0) + n;
  return out;
}

const top = (o, n) => Object.entries(o).sort((x, y) => y[1] - x[1]).slice(0, n);

function main() {
  const span = Number(process.argv[2]) || 28;
  const history = existsSync(HISTORY) ? JSON.parse(readFileSync(HISTORY, "utf8")) : {};

  // The logs are the whole truth for any day they contain, so those days are
  // replaced rather than added to, and running this twice changes nothing.
  Object.assign(history, tally(readLogs().map(parse).filter(Boolean)));
  writeFileSync(HISTORY + ".tmp", JSON.stringify(history));
  renameSync(HISTORY + ".tmp", HISTORY);

  const days = Object.keys(history).sort().slice(-span);
  if (!days.length) return console.log("No visits recorded yet.");

  let views = 0, visitors = 0, pages = {}, refs = {}, countries = {}, events = {};
  for (const d of days) {
    const h = history[d];
    views += h.views; visitors += h.visitors;
    pages = merge(pages, h.pages); refs = merge(refs, h.refs); countries = merge(countries, h.countries); events = merge(events, h.events ?? {});
  }

  const row = (k, n) => `  ${String(n).padStart(6)}  ${k}`;
  console.log(`Salary Crossing, ${days[0]} to ${days.at(-1)}`);
  console.log(`  ${views} page views, ${visitors} visitors\n\nBy day (visitors / views)`);
  for (const d of days.slice(-14)) console.log(`  ${d}  ${String(history[d].visitors).padStart(5)} / ${history[d].views}`);
  console.log("\nWhere they came from");      top(refs, 15).forEach(([k, n]) => console.log(row(k, n)));
  console.log("\nTop pages");                 top(pages, 15).forEach(([k, n]) => console.log(row(k, n)));
  console.log("\nCountries (visitors)");      top(countries, 10).forEach(([k, n]) => console.log(row(k, n)));
  console.log("\nProduct actions");           top(events, 10).forEach(([k, n]) => console.log(row(k, n)));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
