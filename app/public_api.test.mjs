import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { publicApiResult } from "./public_api.mjs";
import { takeHome } from "../src/tax.mjs";
import { affordability } from "../src/mortgage.mjs";

const fx = JSON.parse(readFileSync(new URL("../fx-cache.json", import.meta.url), "utf8"));
const get = (path) => publicApiResult(new URL(path, "https://app.salarycrossing.com"), fx);

test("take-home API uses the shared tax engine and gives sources", () => {
  const response = get("/api/v1/take-home?salary=50000&region=scotland&pensionPct=5&studentPlans=plan4");
  assert.deepEqual(response.result, takeHome({ salary: 50000, region: "scotland", pensionPct: 5, studentPlans: ["plan4"] }));
  assert.ok(response.sources.some((source) => source.url.includes("gov.uk")));
});

test("mortgage API uses the shared affordability engine", () => {
  const response = get("/api/v1/mortgage?income1=50000&deposit=40000");
  assert.deepEqual(response.result, affordability(response.inputs));
});

test("cross-border API returns FX date and cited jurisdictions", () => {
  const response = get("/api/v1/compare?gross=75000&from=UK&to=AE");
  assert.equal(response.fx.asOf, fx.date);
  assert.ok(response.result.to.gross > 0);
  assert.ok(response.sources.from.length && response.sources.to.length);
});

test("invalid and unsupported inputs are rejected rather than clamped", () => {
  for (const path of [
    "/api/v1/take-home?salary=-1",
    "/api/v1/take-home?salary=50000&pensionPct=101",
    "/api/v1/take-home?salary=50000&studentPlans=unknown",
    "/api/v1/compare?gross=75000&from=UK&to=UK",
    "/api/v1/compare?gross=75000&from=XX&to=AE",
    "/api/v1/mortgage?income1=50000&termYears=4",
  ]) assert.throws(() => get(path), { status: 400 });
});
