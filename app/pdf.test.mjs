import test from "node:test";
import assert from "node:assert/strict";
import { compensationReportPdf, textPdf } from "./pdf.mjs";
import { calculateReport } from "./report.mjs";

test("approved report export is a valid multi-page capable PDF", () => {
  const pdf = textPdf(Array.from({ length: 60 }, (_, index) => `Evidence line ${index + 1}`));
  assert.equal(pdf.subarray(0, 8).toString(), "%PDF-1.4");
  assert.match(pdf.toString("binary"), /\/Count 2/);
  assert.match(pdf.toString("binary"), /startxref/);
});

test("client report PDF contains branded sections and a page footer", () => {
  const report = calculateReport({
    from: { code: "UK", gross: 75000, costs: { housing: 1800 } },
    to: { code: "AE", gross: 350000, benefits: 12000, costs: { housing: 8000 } },
    assumptions: ["Synthetic test case"], unsupported: ["Confirm residence"],
  }, { date: "2026-09-23", perEur: { EUR: 1, GBP: .87, AED: 4.33 } });
  const pdf = compensationReportPdf({
    item: { reference: "SC-TEST", client_name: "Sample client", extraction_json: JSON.stringify({ fields: [{ key: "to.gross", currency: "AED", value: 350000, confidence: .98, quote: "Annual salary AED 350,000" }] }) }, report,
    brandName: "Example Mobility", brandColor: "#24574f",
  });
  const content = pdf.toString("binary");
  assert.equal(pdf.subarray(0, 8).toString(), "%PDF-1.4");
  assert.match(content, /Example Mobility/);
  assert.match(content, /EXECUTIVE SUMMARY/);
  assert.match(content, /Evidence trace/i);
  assert.match(content, /Page 1 of/);
});
