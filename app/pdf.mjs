function pdfEscape(value) {
  return String(value).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)").replace(/[^\x20-\x7e]/g, "?");
}

function wrap(value, width = 88) {
  const words = String(value).split(/\s+/);
  const lines = [];
  let line = "";
  for (const word of words) {
    if ((line + " " + word).trim().length > width && line) { lines.push(line); line = word; }
    else line = (line + " " + word).trim();
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

/** Minimal, dependency-free PDF used for approved pilot reports. */
export function textPdf(lines, { title = "Salary Crossing report" } = {}) {
  const rendered = [title, "", ...lines].flatMap((line) => wrap(line));
  const chunks = [];
  for (let at = 0; at < rendered.length; at += 47) chunks.push(rendered.slice(at, at + 47));
  const objects = [null];
  const add = (content) => (objects.push(content), objects.length - 1);
  const pagesId = add("");
  const fontId = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  const pageIds = [];
  for (const pageLines of chunks.length ? chunks : [[title]]) {
    const commands = ["BT", "/F1 10 Tf", "48 780 Td", "13 TL"];
    for (const line of pageLines) commands.push(`(${pdfEscape(line)}) Tj`, "T*");
    commands.push("ET");
    const stream = commands.join("\n");
    const contentId = add(`<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`);
    pageIds.push(add(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 612 842] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${contentId} 0 R >>`));
  }
  objects[pagesId] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`;
  const catalogId = add(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);
  let output = "%PDF-1.4\n";
  const offsets = [0];
  for (let i = 1; i < objects.length; i++) {
    offsets[i] = Buffer.byteLength(output);
    output += `${i} 0 obj\n${objects[i]}\nendobj\n`;
  }
  const xref = Buffer.byteLength(output);
  output += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
  for (let i = 1; i < objects.length; i++) output += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  output += `trailer\n<< /Size ${objects.length} /Root ${catalogId} 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(output, "binary");
}

const colour = (hex, fallback = [0.07, 0.24, 0.22]) => {
  const match = String(hex).match(/^#([0-9a-f]{6})$/i);
  if (!match) return fallback;
  return [0, 2, 4].map((at) => parseInt(match[1].slice(at, at + 2), 16) / 255);
};

const ascii = (value) => String(value)
  .replace(/[—–]/g, "-").replace(/−/g, "-").replace(/’/g, "'")
  .replace(/[^ -~]/g, "?");

/** Branded, structured export for a client-ready compensation report. */
export function compensationReportPdf({ item, report, brandName = "Salary Crossing Adviser", brandColor = "#123c37" }) {
  const brand = colour(brandColor);
  const ink = [0.08, 0.14, 0.13];
  const muted = [0.36, 0.43, 0.41];
  const pale = [0.93, 0.97, 0.96];
  const pages = [];
  let page;
  let y;

  const setFill = (rgb) => `${rgb.map((value) => value.toFixed(3)).join(" ")} rg`;
  const setStroke = (rgb) => `${rgb.map((value) => value.toFixed(3)).join(" ")} RG`;
  const drawText = (value, x, atY, size = 10, bold = false, rgb = ink) => {
    page.push(setFill(rgb), `BT /${bold ? "F2" : "F1"} ${size} Tf ${x} ${atY} Td (${pdfEscape(ascii(value))}) Tj ET`);
  };
  const drawRightText = (value, right, atY, size = 10, bold = false, rgb = ink) => {
    const estimatedWidth = ascii(value).length * size * 0.51;
    drawText(value, Math.max(46, right - estimatedWidth), atY, size, bold, rgb);
  };
  const rectangle = (x, atY, width, height, rgb, stroke = false) => {
    page.push(setFill(rgb), `${x} ${atY} ${width} ${height} re ${stroke ? "B" : "f"}`);
  };
  const line = (x1, y1, x2, y2, rgb = [0.83, 0.87, 0.86]) => {
    page.push(setStroke(rgb), "0.6 w", `${x1} ${y1} m ${x2} ${y2} l S`);
  };
  const startPage = () => {
    page = [];
    pages.push(page);
    rectangle(0, 786, 612, 56, brand);
    drawText(brandName, 42, 814, 13, true, [1, 1, 1]);
    drawText("INTERNATIONAL COMPENSATION REPORT", 342, 814, 8, true, [0.8, 0.93, 0.9]);
    y = 756;
  };
  const ensure = (height) => { if (y - height < 58) startPage(); };
  const paragraph = (value, { size = 9.5, width = 520, indent = 0, rgb = ink, leading = 13, bold = false } = {}) => {
    const max = Math.max(20, Math.floor(width / (size * 0.52)));
    const lines = wrap(ascii(value), max);
    ensure(lines.length * leading + 4);
    for (const text of lines) { drawText(text, 46 + indent, y, size, bold, rgb); y -= leading; }
    y -= 3;
  };
  const heading = (label, title) => {
    ensure(42);
    drawText(label.toUpperCase(), 46, y, 7.5, true, brand); y -= 16;
    drawText(title, 46, y, 18, true, ink); y -= 10;
    line(46, y, 566, y); y -= 16;
  };
  const money = (value, meta) => `${meta.currency} ${Math.round(Number(value) || 0).toLocaleString("en-GB")}`;
  const signed = (value, meta) => `${value >= 0 ? "+" : "-"}${money(Math.abs(value), meta)}`;
  const tableHeader = (left, current, proposed, extra = "") => {
    ensure(30);
    rectangle(46, y - 7, 520, 24, pale);
    drawText(left.toUpperCase(), 54, y, 7, true, muted);
    drawRightText(current.toUpperCase(), 386, y, 7, true, muted);
    drawRightText(proposed.toUpperCase(), extra ? 486 : 548, y, 7, true, muted);
    if (extra) drawRightText(extra.toUpperCase(), 558, y, 7, true, muted);
    y -= 24;
  };
  const row = (label, current, proposed, { extra = "", bold = false, fill = null } = {}) => {
    ensure(25);
    if (fill) rectangle(46, y - 7, 520, 24, fill);
    drawText(label, 54, y, 8.5, bold);
    drawRightText(current, 386, y, 8.5, bold);
    drawRightText(proposed, extra ? 486 : 548, y, 8.5, bold);
    if (extra) drawRightText(extra, 558, y, 8.5, bold, extra.startsWith("-") ? [0.61, 0.17, 0.17] : brand);
    y -= 24; line(46, y + 17, 566, y + 17);
  };
  const bulletList = (items) => {
    for (const item of items) paragraph(`- ${item}`, { indent: 8, width: 500, size: 9 });
  };
  let extraction = {};
  try { extraction = JSON.parse(item.extraction_json || "{}"); } catch { extraction = {}; }

  startPage();
  drawText(item.client_name, 46, y, 25, true); y -= 26;
  drawText("International compensation comparison", 46, y, 13, false, muted);
  drawRightText(`Case ${item.reference}`, 566, y, 9, true, muted); y -= 28;
  const cashMovement = `${money(Math.abs(report.spendableDifference), report.from)} ${report.spendableDifference >= 0 ? "more" : "less"} spendable cash per year`;
  rectangle(46, y - 71, 520, 82, pale);
  drawText("EXECUTIVE SUMMARY", 58, y - 10, 7.5, true, brand);
  drawText(cashMovement, 58, y - 34, 16, true);
  drawText(`Total recurring package difference: ${signed(report.difference, report.from)}.`, 58, y - 56, 9.5, false, muted);
  y -= 98;

  heading("Package anatomy", "Annual compensation and cash flow");
  tableHeader("Component", report.from.name, report.to.name);
  row("Base salary", money(report.inputs.from.gross, report.from), money(report.inputs.to.gross, report.to));
  row("Target cash bonus", money(report.inputs.from.bonus, report.from), money(report.inputs.to.bonus, report.to));
  row("Tax and compulsory charges", `-${money(report.from.pay.totalDeductions, report.from)}`, `-${money(report.to.pay.totalDeductions, report.to)}`);
  row("Take-home after payroll", money(report.from.pay.net, report.from), money(report.to.pay.net, report.to));
  row("Annual household costs", `-${money(report.from.annualCosts, report.from)}`, `-${money(report.to.annualCosts, report.to)}`);
  row("Spendable cash", money(report.from.spendable, report.from), money(report.to.spendable, report.to), { bold: true, fill: pale });
  row("Employer retirement", money(report.from.retirementValue, report.from), money(report.to.retirementValue, report.to));
  row("Other benefits", money(report.inputs.from.benefits, report.from), money(report.inputs.to.benefits, report.to));
  row("Equity at stated value*", money(report.inputs.from.equity, report.from), money(report.inputs.to.equity, report.to));
  row("Recurring package value", money(report.from.recurringValue, report.from), money(report.to.recurringValue, report.to), { bold: true, fill: brand.map((value) => Math.min(1, value + 0.74)) });
  paragraph("* Equity is not tax-modelled. Recurring package value includes spendable cash, retirement, benefits and stated equity; it is not all cash.", { size: 8, rgb: muted });

  heading("Household layer", "Entered monthly costs");
  tableHeader("Monthly cost", report.from.name, report.to.name);
  const labels = { housing: "Housing", healthcare: "Healthcare", childcare: "Childcare", transport: "Transport", other: "Other recurring costs" };
  for (const [key, label] of Object.entries(labels)) row(label, money(report.inputs.from.costs[key], report.from), money(report.inputs.to.costs[key], report.to));

  heading("Time horizon", "One, three and five-year outcomes");
  tableHeader("Period", "Stay", "Move", "Difference");
  for (const scenario of report.scenarios) row(`${scenario.years} year${scenario.years > 1 ? "s" : ""}`, money(scenario.source, report.from), money(scenario.destinationInSource, report.from), { extra: signed(scenario.difference, report.from) });
  paragraph(`The destination package is converted to ${report.from.currency}. The relocation allowance and moving cost are applied once.`, { size: 8.5, rgb: muted });

  heading("Negotiation reference", "Financial equivalence");
  paragraph(`${money(report.equivalentDestinationGross, report.to)} destination gross matches current take-home before household costs. Using the entered costs changes the destination match to ${money(report.costAdjustedDestinationGross, report.to)}.`, { size: 11, leading: 15 });

  if (extraction.fields?.length) {
    heading("Evidence trace", "Facts extracted from supplied documents");
    paragraph("Each quotation supported adviser review. Approved case values remain authoritative.", { size: 8.5, rgb: muted });
    for (const field of extraction.fields.slice(0, 40)) {
      const confidence = Math.round(Number(field.confidence || 0) * 100);
      paragraph(`${field.key}: ${field.currency || ""} ${Number(field.value || 0).toLocaleString("en-GB")} (${confidence}% extraction confidence)`, { size: 8.5, leading: 11, bold: true });
      if (field.quote) paragraph(`Source: "${field.quote}"`, { size: 8, leading: 10, indent: 8, width: 490, rgb: muted });
    }
  }

  heading("Approved assumptions", "What this comparison assumes");
  bulletList(report.inputs.assumptions.length ? report.inputs.assumptions : ["No additional adviser assumptions were recorded."]);
  heading("Professional review", "What still needs attention");
  bulletList(report.warnings);

  heading("Calculation record", "Method, versions and sources");
  paragraph(`Calculation version ${report.calculationVersion}. Tax years: ${report.from.name} ${report.taxYears.from}; ${report.to.name} ${report.taxYears.to}. Exchange rate dated ${report.fxDate}: ${report.rate.toFixed(4)} ${report.to.currency} per ${report.from.currency}.`, { size: 9 });
  const sourceGroups = new Map();
  for (const source of report.sources) {
    const labels = sourceGroups.get(source.jurisdiction) ?? [];
    labels.push(source.label.replace(/^gov\.uk /i, "").replace(/^ATO - /i, ""));
    sourceGroups.set(source.jurisdiction, labels);
  }
  paragraph(`Official calculation sources: ${[...sourceGroups].map(([jurisdiction, labels]) => `${jurisdiction} - ${labels.join(", ")}`).join("; ")}.`, { size: 8, leading: 10 });
  paragraph("Full source links are available in the secure web report.", { size: 8, leading: 10, rgb: muted });
  paragraph("This report supports adviser review. It is not personal tax, legal or immigration advice and does not decide whether somebody should move.", { size: 8.5, rgb: muted });

  const pageCount = pages.length;
  for (const [index, commands] of pages.entries()) {
    commands.push(setStroke([0.83, 0.87, 0.86]), "0.5 w", "46 44 m 566 44 l S");
    const previous = page; page = commands;
    drawText(`Case ${item.reference} | Calculation ${report.calculationVersion}`, 46, 27, 7.5, false, muted);
    drawRightText(`Page ${index + 1} of ${pageCount}`, 566, 27, 7.5, false, muted);
    page = previous;
  }

  const objects = [null];
  const add = (content) => (objects.push(content), objects.length - 1);
  const pagesId = add("");
  const fontId = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  const boldFontId = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");
  const pageIds = [];
  for (const commands of pages) {
    const stream = commands.join("\n");
    const contentId = add(`<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`);
    pageIds.push(add(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 612 842] /Resources << /Font << /F1 ${fontId} 0 R /F2 ${boldFontId} 0 R >> >> /Contents ${contentId} 0 R >>`));
  }
  objects[pagesId] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`;
  const catalogId = add(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);
  let output = "%PDF-1.4\n";
  const offsets = [0];
  for (let i = 1; i < objects.length; i++) {
    offsets[i] = Buffer.byteLength(output);
    output += `${i} 0 obj\n${objects[i]}\nendobj\n`;
  }
  const xref = Buffer.byteLength(output);
  output += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
  for (let i = 1; i < objects.length; i++) output += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  output += `trailer\n<< /Size ${objects.length} /Root ${catalogId} 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(output, "binary");
}
