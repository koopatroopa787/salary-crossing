import test from "node:test";
import assert from "node:assert/strict";
import { createSession, openDatabase, setupOrganization } from "./db.mjs";
import { findCase } from "./repository.mjs";
import { nowIso, sha256, signedValue } from "./security.mjs";

test("case lookup cannot cross an organization boundary", () => {
  const db = openDatabase(":memory:");
  const a = setupOrganization(db, { organization: "Alpha", slug: "alpha", name: "Alice", email: "alice@example.com", password: "alpha-password-123" });
  const b = setupOrganization(db, { organization: "Beta", slug: "beta", name: "Bob", email: "bob@example.com", password: "beta-password-123" });
  const now = nowIso();
  db.prepare("INSERT INTO cases (id,organization_id,reference,client_name,inputs_json,created_by,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)")
    .run("case_alpha", a.organizationId, "A-1", "Private client", "{}", a.userId, now, now);
  assert.equal(findCase(db, a.organizationId, "case_alpha").client_name, "Private client");
  assert.equal(findCase(db, b.organizationId, "case_alpha"), null);
  db.prepare("INSERT INTO case_versions (organization_id,case_id,kind,inputs_json,created_by,created_at) VALUES (?,?,?,?,?,?)")
    .run(a.organizationId, "case_alpha", "inputs-approved", JSON.stringify({ assumptions: ["Reviewed"] }), a.userId, now);
  assert.equal(db.prepare("SELECT count(*) count FROM case_versions WHERE organization_id=? AND case_id=?").get(a.organizationId, "case_alpha").count, 1);
  assert.equal(db.prepare("SELECT count(*) count FROM case_versions WHERE organization_id=? AND case_id=?").get(b.organizationId, "case_alpha").count, 0);
});

test("session CSRF token is bound to the opaque session cookie", () => {
  const db = openDatabase(":memory:");
  const created = setupOrganization(db, { organization: "Alpha", slug: "alpha", name: "Alice", email: "alice@example.com", password: "alpha-password-123" });
  const session = createSession(db, created.userId, "session-secret-with-at-least-32-chars");
  assert.equal(sha256(signedValue("session-secret-with-at-least-32-chars", "csrf", session.raw)), sha256(session.csrf));
});
