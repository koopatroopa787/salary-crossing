/** Publisher presets, shared by the builder, the widget and its landing page. */
import { CODES, country } from "./compare.mjs";
import { ORIGIN } from "./site.mjs";

export function embedOptions(input = {}) {
  const code = (value, fallback) => {
    const c = String(value ?? "").toUpperCase();
    return CODES.includes(c) ? c : fallback;
  };
  const from = code(input.from, "UK");
  let to = code(input.to, "AE");
  if (to === from) to = from === "AE" ? "UK" : "AE";
  const n = Number(input.gross);
  const gross = input.gross == null || input.gross === "" || !Number.isFinite(n) || n < 0
    ? 75000 : Math.min(n, 10000000);
  return { from, to, gross };
}

export function presetHash(input) {
  return "#" + new URLSearchParams(embedOptions(input)).toString();
}

export function embedSnippet(input) {
  const options = embedOptions(input);
  const title = `Salary comparison: ${country(options.from).meta.cities[0]} to ${country(options.to).meta.cities[0]}`;
  // The fragment keeps the preset out of HTTP requests. Qualify the supplied
  // credit link: the widget is for readers, not a way to manufacture backlinks.
  const src = `${ORIGIN}/embed/${presetHash(options)}`.replaceAll("&", "&amp;");
  return `<iframe src="${src}" title="${title}" width="100%" height="600" style="border:0;max-width:720px" loading="lazy" referrerpolicy="origin"></iframe>\n<p style="font-size:13px">Calculator by <a href="${ORIGIN}/" rel="nofollow">Salary Crossing</a></p>`;
}
