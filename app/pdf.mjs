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
