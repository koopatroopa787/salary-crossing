import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { chmodSync, existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { id, nowIso } from "./security.mjs";
import { findDocument } from "./repository.mjs";

const DOCX_EXTRACTOR = fileURLToPath(new URL("./extract_docx.py", import.meta.url));
const TEXT_LIMIT = 200_000;

function encryptionKey(raw) {
  const decoded = Buffer.from(raw, "base64");
  if (decoded.length === 32) return decoded;
  if (!raw) throw new Error("Document encryption is not configured.");
  return createHash("sha256").update(raw).digest();
}

function safeName(name) {
  return basename(String(name ?? "document")).replace(/[^a-zA-Z0-9._ -]/g, "_").slice(0, 120) || "document";
}

function detectedType(buffer, filename, supplied = "") {
  const extension = extname(filename).toLowerCase();
  if (buffer.subarray(0, 5).toString("ascii") === "%PDF-") return extension === ".pdf" ? "application/pdf" : null;
  if (buffer.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04]))) {
    return extension === ".docx" ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document" : null;
  }
  if ([".txt", ".text"].includes(extension) && !buffer.includes(0)) return "text/plain";
  if (extension === ".pdf" || extension === ".docx") return null;
  return supplied === "text/plain" && !buffer.includes(0) ? "text/plain" : null;
}

function run(command, args, options = {}) {
  return spawnSync(command, args, { encoding: "utf8", windowsHide: true, timeout: 30_000, ...options });
}

export function scanFile(path, config) {
  const result = run(config.scanner, ["--no-summary", path]);
  if (result.error?.code === "ENOENT") return { status: "scanner-unavailable", detail: "Malware scanner is not installed." };
  if (result.status === 0) return { status: "clean", detail: "No threat found." };
  if (result.status === 1) return { status: "infected", detail: "Malware scanner rejected the file." };
  return { status: "error", detail: (result.stderr || result.stdout || "Scanner failed.").trim().slice(0, 500) };
}

export function extractText(path, mime, config) {
  let text = "";
  if (mime === "text/plain") text = readFileSync(path, "utf8");
  else if (mime === "application/pdf") {
    const result = run(config.pdfText, ["-layout", "-nopgbrk", path, "-"]);
    if (result.error?.code === "ENOENT") throw new Error("PDF text extraction is not installed.");
    if (result.status !== 0) throw new Error("This PDF could not be read. Upload a text-based PDF or enter the values manually.");
    text = result.stdout;
  } else if (mime.includes("wordprocessingml")) {
    const result = run("python3", [DOCX_EXTRACTOR, path]);
    if (result.error?.code === "ENOENT") throw new Error("DOCX text extraction is not installed.");
    if (result.status !== 0) throw new Error("This Word document could not be read.");
    text = result.stdout;
  }
  return text.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").trim().slice(0, TEXT_LIMIT);
}

function encrypt(buffer, key) {
  const nonce = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, nonce);
  const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
  return Buffer.concat([Buffer.from("SC01"), nonce, cipher.getAuthTag(), encrypted]);
}

function decrypt(buffer, key) {
  if (buffer.subarray(0, 4).toString() !== "SC01") throw new Error("Unsupported encrypted document.");
  const decipher = createDecipheriv("aes-256-gcm", key, buffer.subarray(4, 16));
  decipher.setAuthTag(buffer.subarray(16, 32));
  return Buffer.concat([decipher.update(buffer.subarray(32)), decipher.final()]);
}

export function storeDocument({ db, config, session, caseId, kind, filename, suppliedType, buffer }) {
  if (!buffer?.length) throw new Error("Choose a document to upload.");
  if (buffer.length > config.maximumUploadBytes) throw new Error(`Document exceeds the ${Math.round(config.maximumUploadBytes / 1024 / 1024)} MB limit.`);
  const originalName = safeName(filename);
  const mime = detectedType(buffer, originalName, suppliedType);
  if (!mime) throw new Error("Only text-based PDF, DOCX and TXT documents are accepted.");

  const caseRow = db.prepare("SELECT id FROM cases WHERE id=? AND organization_id=?").get(caseId, session.organization_id);
  if (!caseRow) throw new Error("Case not found.");

  const quarantine = join(config.storagePath, "quarantine");
  const objects = join(config.storagePath, "objects");
  mkdirSync(quarantine, { recursive: true, mode: 0o700 });
  mkdirSync(objects, { recursive: true, mode: 0o700 });
  const temporary = join(quarantine, id("upload_"));
  writeFileSync(temporary, buffer, { mode: 0o600 });

  try {
    const scan = scanFile(temporary, config);
    if (scan.status !== "clean" && !(scan.status === "scanner-unavailable" && config.allowUnscanned)) throw new Error(scan.detail);
    const extractedText = extractText(temporary, mime, config);
    if (!extractedText) throw new Error("No readable text was found in this document.");
    const documentId = id("doc_");
    const storageName = `${session.organization_id}/${caseId}/${documentId}.bin`;
    const destination = resolve(objects, storageName);
    if (!destination.startsWith(resolve(objects) + "\\") && !destination.startsWith(resolve(objects) + "/")) throw new Error("Unsafe document path.");
    mkdirSync(dirname(destination), { recursive: true, mode: 0o700 });
    const encrypted = encrypt(buffer, encryptionKey(config.masterKey));
    writeFileSync(destination + ".tmp", encrypted, { mode: 0o600 });
    renameSync(destination + ".tmp", destination);
    chmodSync(destination, 0o600);
    const createdAt = nowIso();
    const retentionUntil = new Date(Date.now() + 365 * 86400000).toISOString();
    const digest = createHash("sha256").update(buffer).digest("hex");
    db.prepare(`INSERT INTO documents
      (id,organization_id,case_id,kind,original_name,storage_name,mime_type,byte_size,sha256,scan_status,extracted_text,created_by,created_at,retention_until)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
      .run(documentId, session.organization_id, caseId, kind, originalName, storageName, mime, buffer.length, digest, "clean", "", session.user_id, createdAt, retentionUntil);
    return { id: documentId, originalName, mime, byteSize: buffer.length, scanStatus: "clean", retentionUntil };
  } finally {
    rmSync(temporary, { force: true });
  }
}

export function readDocument({ db, config, session, documentId }) {
  const row = findDocument(db, session.organization_id, documentId);
  if (!row) return null;
  const path = resolve(config.storagePath, "objects", row.storage_name);
  if (!existsSync(path)) throw new Error("Stored document is missing.");
  return { row, buffer: decrypt(readFileSync(path), encryptionKey(config.masterKey)) };
}

/** Decrypt into short-lived files only; raw extracted text is never retained in the database. */
export function documentsForExtraction({ db, config, session, caseId }) {
  const rows = db.prepare("SELECT * FROM documents WHERE case_id=? AND organization_id=? AND scan_status='clean' ORDER BY created_at").all(caseId, session.organization_id);
  const temporaryDirectory = join(config.storagePath, "quarantine");
  mkdirSync(temporaryDirectory, { recursive: true, mode: 0o700 });
  return rows.map((row) => {
    const document = readDocument({ db, config, session, documentId: row.id });
    const temporary = join(temporaryDirectory, id("extract_"));
    writeFileSync(temporary, document.buffer, { mode: 0o600 });
    try {
      return { ...row, extracted_text: extractText(temporary, row.mime_type, config) };
    } finally {
      rmSync(temporary, { force: true });
    }
  });
}

export function deleteCaseDocuments({ db, config, organizationId, caseId }) {
  const rows = db.prepare("SELECT storage_name FROM documents WHERE organization_id=? AND case_id=?").all(organizationId, caseId);
  const root = resolve(config.storagePath, "objects");
  for (const row of rows) {
    const path = resolve(root, row.storage_name);
    if (path.startsWith(root + "\\") || path.startsWith(root + "/")) rmSync(path, { force: true });
  }
}

export function purgeExpiredDocuments({ db, config, now = nowIso() }) {
  const rows = db.prepare("SELECT id,organization_id,case_id,storage_name FROM documents WHERE retention_until<=?").all(now);
  const root = resolve(config.storagePath, "objects");
  for (const row of rows) {
    const path = resolve(root, row.storage_name);
    if (path.startsWith(root + "\\") || path.startsWith(root + "/")) rmSync(path, { force: true });
    db.prepare("DELETE FROM documents WHERE id=?").run(row.id);
    db.prepare("INSERT INTO audit_log (organization_id,user_id,case_id,action,detail_json,created_at) VALUES (?,NULL,?,'document.retention-deleted',?,?)")
      .run(row.organization_id, row.case_id, JSON.stringify({ documentId: row.id }), nowIso());
  }
  return rows.length;
}
