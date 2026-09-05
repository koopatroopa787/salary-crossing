/** Technical SEO audit over the built output. No network, no guessing. */
import { readdir, readFile } from "node:fs/promises";

const ROOT = new URL("./public/", import.meta.url);
async function* walk(dir = ROOT) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const u = new URL(e.name + (e.isDirectory() ? "/" : ""), dir);
    if (e.isDirectory()) yield* walk(u); else if (e.name.endsWith(".html")) yield u;
  }
}

const one = (html, re) => (html.match(re) ?? [])[1];
const pages = [];
for await (const f of walk()) {
  const html = await readFile(f, "utf8");
  const path = "/" + decodeURIComponent(f.pathname.split("/public/")[1]).replace(/index\.html$/, "");
  const text = html.replace(/<script[\s\S]*?<\/script>/g, "").replace(/<style[\s\S]*?<\/style>/g, "")
                   .replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  pages.push({
    path,
    title: one(html, /<title>([^<]*)<\/title>/),
    desc: one(html, /<meta name="description" content="([^"]*)"/),
    canonical: one(html, /<link rel="canonical" href="([^"]*)"/),
    h1s: (html.match(/<h1[\s>]/g) ?? []).length,
    words: text.split(" ").length,
    links: new Set([...html.matchAll(/href="(\/[^"#]*)"/g)].map((m) => m[1])),
    og: /property="og:/.test(html),
    jsonLd: /application\/ld\+json/.test(html),
  });
}

const dupes = (key) => {
  const seen = new Map();
  for (const p of pages) { const v = p[key]; seen.set(v, (seen.get(v) ?? 0) + 1); }
  return [...seen].filter(([, n]) => n > 1);
};

console.log(`pages: ${pages.length}`);
console.log(`missing title:        ${pages.filter((p) => !p.title).length}`);
console.log(`missing description:  ${pages.filter((p) => !p.desc).length}`);
console.log(`missing canonical:    ${pages.filter((p) => !p.canonical).length}`);
console.log(`not exactly one h1:   ${pages.filter((p) => p.h1s !== 1).length}`);
console.log(`duplicate titles:     ${dupes("title").length}`);
console.log(`duplicate descriptions: ${dupes("desc").length}`);
console.log(`no Open Graph tags:   ${pages.filter((p) => !p.og).length}`);
console.log(`no structured data:   ${pages.filter((p) => !p.jsonLd).length}`);
console.log(`thin (<300 words):    ${pages.filter((p) => p.words < 300).length}`);
console.log(`  thinnest: ${pages.slice().sort((a,b)=>a.words-b.words).slice(0,3).map(p=>`${p.path} (${p.words}w)`).join(", ")}`);

// Orphans: reachable from nothing.
const linked = new Set();
for (const p of pages) for (const l of p.links) linked.add(l.endsWith("/") ? l : l + "/");
const orphans = pages.filter((p) => p.path !== "/" && !linked.has(p.path));
console.log(`orphan pages (linked from nowhere): ${orphans.length}`);
if (orphans.length) console.log(`  e.g. ${orphans.slice(0, 5).map((p) => p.path).join(", ")}`);

// Click depth from the homepage.
const byPath = new Map(pages.map((p) => [p.path, p]));
const depth = new Map([["/", 0]]);
let frontier = ["/"];
while (frontier.length) {
  const next = [];
  for (const path of frontier) {
    for (const l of byPath.get(path)?.links ?? []) {
      const t = l.endsWith("/") ? l : l + "/";
      if (byPath.has(t) && !depth.has(t)) { depth.set(t, depth.get(path) + 1); next.push(t); }
    }
  }
  frontier = next;
}
const unreachable = pages.filter((p) => !depth.has(p.path));
console.log(`unreachable from homepage: ${unreachable.length}`);
const dist = {};
for (const [, d] of depth) dist[d] = (dist[d] ?? 0) + 1;
console.log(`click depth: ${Object.entries(dist).map(([d, n]) => `${d}:${n}`).join("  ")}`);
