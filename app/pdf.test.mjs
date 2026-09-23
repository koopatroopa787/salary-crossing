import test from "node:test";
import assert from "node:assert/strict";
import { textPdf } from "./pdf.mjs";

test("approved report export is a valid multi-page capable PDF", () => {
  const pdf = textPdf(Array.from({ length: 60 }, (_, index) => `Evidence line ${index + 1}`));
  assert.equal(pdf.subarray(0, 8).toString(), "%PDF-1.4");
  assert.match(pdf.toString("binary"), /\/Count 2/);
  assert.match(pdf.toString("binary"), /startxref/);
});
