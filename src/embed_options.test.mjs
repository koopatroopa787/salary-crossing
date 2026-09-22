import { test } from "node:test";
import assert from "node:assert/strict";
import { embedOptions, embedSnippet, presetHash } from "./embed_options.mjs";

test("publisher presets support each country without allowing an identical pair", () => {
  assert.deepEqual(embedOptions({ from: "usny", to: "uk", gross: 90000 }), { from: "USNY", to: "UK", gross: 90000 });
  assert.deepEqual(embedOptions({ from: "AE", to: "AE", gross: 0 }), { from: "AE", to: "UK", gross: 0 });
  assert.deepEqual(embedOptions({ from: "unsupported", to: "invalid" }), { from: "UK", to: "AE", gross: 75000 });
});

test("an invalid or excessive salary cannot break an embedded calculator", () => {
  for (const gross of [undefined, null, "", -1, "bad", Infinity, NaN]) {
    assert.equal(embedOptions({ gross }).gross, 75000);
  }
  assert.equal(embedOptions({ gross: 25000000 }).gross, 10000000);
  assert.equal(embedOptions({ gross: 12345.67 }).gross, 12345.67);
});

test("new presets stay in the URL fragment, outside the HTTP request", () => {
  const fragment = presetHash({ from: "UK", to: "USNY", gross: 90000 });
  const url = new URL("https://salarycrossing.com/embed/" + fragment);
  assert.equal(url.search, "");
  assert.deepEqual(Object.fromEntries(new URLSearchParams(url.hash.slice(1))), { from: "UK", to: "USNY", gross: "90000" });
});

test("published code is a titled iframe with a visible qualified source credit", () => {
  const snippet = embedSnippet({ from: "UK", to: "AU", gross: 60000 });
  assert.match(snippet, /title="Salary comparison: London to Sydney"/);
  assert.match(snippet, /#from=UK&amp;to=AU&amp;gross=60000/);
  assert.match(snippet, /referrerpolicy="origin"/);
  assert.match(snippet, /rel="nofollow">Salary Crossing<\/a>/);
  assert.doesNotMatch(snippet, /<script/);
});
