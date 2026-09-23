import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openDatabase, setupOrganization } from "./db.mjs";
import { nowIso } from "./security.mjs";
import { documentsForExtraction, readDocument, storeDocument } from "./storage.mjs";

test("documents are encrypted and organization scoped", () => {
  const root = mkdtempSync(join(tmpdir(), "salary-crossing-test-"));
  let db;
  try {
    db = openDatabase(join(root, "test.sqlite"));
    const a = setupOrganization(db, { organization: "Alpha", slug: "alpha", name: "Alice", email: "alice@example.com", password: "alpha-password-123" });
    const b = setupOrganization(db, { organization: "Beta", slug: "beta", name: "Bob", email: "bob@example.com", password: "beta-password-123" });
    const now = nowIso();
    db.prepare("INSERT INTO cases (id,organization_id,reference,client_name,inputs_json,created_by,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)")
      .run("case_alpha", a.organizationId, "A-1", "Client", "{}", a.userId, now, now);
    const config = { storagePath: join(root, "documents"), maximumUploadBytes: 1e6, scanner: "definitely-not-installed-scanner", allowUnscanned: true, masterKey: Buffer.alloc(32, 7).toString("base64"), pdfText: "pdftotext" };
    const sessionA = { organization_id: a.organizationId, user_id: a.userId };
    const stored = storeDocument({ db, config, session: sessionA, caseId: "case_alpha", kind: "offer-letter", filename: "offer.txt", suppliedType: "text/plain", buffer: Buffer.from("Annual salary GBP 75,000") });
    const row = db.prepare("SELECT * FROM documents WHERE id=?").get(stored.id);
    assert.equal(row.extracted_text, "", "plaintext extraction is not retained");
    const ciphertext = readFileSync(join(config.storagePath, "objects", row.storage_name));
    assert.equal(ciphertext.includes(Buffer.from("Annual salary")), false);
    assert.equal(readDocument({ db, config, session: sessionA, documentId: stored.id }).buffer.toString(), "Annual salary GBP 75,000");
    assert.equal(documentsForExtraction({ db, config, session: sessionA, caseId: "case_alpha" })[0].extracted_text, "Annual salary GBP 75,000");
    assert.equal(readDocument({ db, config, session: { organization_id: b.organizationId }, documentId: stored.id }), null);
  } finally {
    db?.close();
    assert.ok(root.startsWith(tmpdir()));
    rmSync(root, { recursive: true, force: true });
  }
});
