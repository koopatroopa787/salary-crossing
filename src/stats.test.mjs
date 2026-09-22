import { test } from "node:test";
import assert from "node:assert/strict";
import { parse, tally } from "../stats.mjs";

const line = (p, r, ua = "Mozilla/5.0 Firefox", ip = "1.2.3.4", t = "2026-09-14T10:00:00+00:00") =>
  [t, ip, "GB", encodeURIComponent(p), encodeURIComponent(r), ua].join("\t");

test("robots and junk paths are dropped", () => {
  assert.equal(parse(line("/", "", "Googlebot/2.1")), null);
  assert.equal(parse(line("http://evil/", "")), null);
  assert.equal(parse(""), null);
});

test("referrers: reddit counted, own site ignored, empty is direct", () => {
  assert.equal(parse(line("/", "https://www.reddit.com/r/UKPersonalFinance/")).ref, "reddit.com");
  assert.equal(parse(line("/compare/", "https://salarycrossing.com/")).ref, null);
  assert.equal(parse(line("/", "")).ref, "(direct)");
});

test("visitors are distinct per day, views are not", () => {
  const days = tally([
    line("/", ""), line("/compare/", "https://salarycrossing.com/"),
    line("/", "", "Mozilla/5.0 Firefox", "5.6.7.8"),
    line("/", "", "Mozilla/5.0 Firefox", "1.2.3.4", "2026-09-15T09:00:00+00:00"),
  ].map(parse));
  assert.equal(days["2026-09-14"].views, 3);
  assert.equal(days["2026-09-14"].visitors, 2);
  assert.deepEqual(days["2026-09-14"].refs, { "(direct)": 2 });
  assert.equal(days["2026-09-15"].visitors, 1);
});

test("product actions are counted without inflating page views", () => {
  const days = tally([
    line("/", ""),
    line("/event/cost-layer-opened", "https://salarycrossing.com/"),
    line("/event/comparison-link-copied", "https://salarycrossing.com/"),
  ].map(parse));
  assert.equal(days["2026-09-14"].views, 1);
  assert.equal(days["2026-09-14"].visitors, 1);
  assert.deepEqual(days["2026-09-14"].events, {
    "cost-layer-opened": 1,
    "comparison-link-copied": 1,
  });
});
