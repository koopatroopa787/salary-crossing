import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { id, nowIso, passwordHash, sha256, signedValue, token } from "./security.mjs";

export function openDatabase(path) {
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  const db = new DatabaseSync(path);
  db.exec("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;");
  migrate(db);
  return db;
}

export function migrate(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS organizations (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, slug TEXT NOT NULL UNIQUE,
      brand_name TEXT NOT NULL, brand_color TEXT NOT NULL DEFAULT '#123c37',
      plan TEXT NOT NULL DEFAULT 'pilot', case_limit INTEGER NOT NULL DEFAULT 5,
      stripe_customer_id TEXT, billing_status TEXT NOT NULL DEFAULT 'manual-pilot',
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY, organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      email TEXT NOT NULL UNIQUE, name TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('owner','adviser','reviewer')),
      password_salt TEXT NOT NULL, password_hash TEXT NOT NULL, created_at TEXT NOT NULL, disabled_at TEXT
    );
    CREATE TABLE IF NOT EXISTS sessions (
      id_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      csrf_hash TEXT NOT NULL, expires_at TEXT NOT NULL, created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS cases (
      id TEXT PRIMARY KEY, organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      reference TEXT NOT NULL, client_name TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'draft'
        CHECK(status IN ('draft','review','approved','shared','closed')),
      inputs_json TEXT NOT NULL, extraction_json TEXT NOT NULL DEFAULT '{}',
      adviser_notes TEXT NOT NULL DEFAULT '', generated_summary TEXT NOT NULL DEFAULT '',
      input_approved_at TEXT, report_approved_at TEXT, closed_at TEXT, retention_until TEXT,
      share_version INTEGER NOT NULL DEFAULT 0,
      created_by TEXT NOT NULL REFERENCES users(id), created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
      UNIQUE(organization_id, reference)
    );
    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY, organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
      kind TEXT NOT NULL, original_name TEXT NOT NULL, storage_name TEXT NOT NULL UNIQUE,
      mime_type TEXT NOT NULL, byte_size INTEGER NOT NULL, sha256 TEXT NOT NULL,
      scan_status TEXT NOT NULL CHECK(scan_status IN ('clean','infected','scanner-unavailable','error')),
      extracted_text TEXT NOT NULL DEFAULT '', created_by TEXT NOT NULL REFERENCES users(id),
      created_at TEXT NOT NULL, retention_until TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY, organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
      author_id TEXT NOT NULL REFERENCES users(id), body TEXT NOT NULL, created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS case_versions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
      kind TEXT NOT NULL CHECK(kind IN ('created','inputs-saved','inputs-approved','report-approved')),
      inputs_json TEXT NOT NULL, calculation_json TEXT,
      created_by TEXT NOT NULL REFERENCES users(id), created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT, organization_id TEXT NOT NULL,
      user_id TEXT, case_id TEXT, action TEXT NOT NULL, detail_json TEXT NOT NULL DEFAULT '{}',
      ip_hash TEXT, created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS cases_org_updated ON cases(organization_id, updated_at DESC);
    CREATE INDEX IF NOT EXISTS documents_case ON documents(organization_id, case_id);
    CREATE INDEX IF NOT EXISTS audit_case ON audit_log(organization_id, case_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS case_versions_case ON case_versions(organization_id, case_id, created_at DESC);
  `);
}

export function setupOrganization(db, { organization, slug, name, email, password }) {
  const organizationId = id("org_");
  const userId = id("usr_");
  const createdAt = nowIso();
  const credentials = passwordHash(password);
  db.exec("BEGIN IMMEDIATE");
  try {
    db.prepare(`INSERT INTO organizations (id,name,slug,brand_name,created_at) VALUES (?,?,?,?,?)`)
      .run(organizationId, organization, slug, organization, createdAt);
    db.prepare(`INSERT INTO users (id,organization_id,email,name,role,password_salt,password_hash,created_at) VALUES (?,?,?,?,?,?,?,?)`)
      .run(userId, organizationId, email, name, "owner", credentials.salt, credentials.hash, createdAt);
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
  return { organizationId, userId };
}

export function createSession(db, userId, sessionSecret, hours = 12) {
  const raw = token();
  const csrf = signedValue(sessionSecret, "csrf", raw);
  const createdAt = nowIso();
  const expiresAt = new Date(Date.now() + hours * 3600000).toISOString();
  db.prepare("INSERT INTO sessions (id_hash,user_id,csrf_hash,expires_at,created_at) VALUES (?,?,?,?,?)")
    .run(sha256(raw), userId, sha256(csrf), expiresAt, createdAt);
  return { raw, csrf, expiresAt };
}

export function currentSession(db, raw) {
  if (!raw) return null;
  return db.prepare(`
    SELECT s.expires_at, s.csrf_hash, u.id user_id, u.email, u.name user_name, u.role,
           o.id organization_id, o.name organization_name, o.brand_name, o.brand_color,
           o.plan, o.case_limit, o.billing_status
    FROM sessions s JOIN users u ON u.id=s.user_id JOIN organizations o ON o.id=u.organization_id
    WHERE s.id_hash=? AND s.expires_at>? AND u.disabled_at IS NULL
  `).get(sha256(raw), nowIso()) ?? null;
}

export function audit(db, session, action, { caseId = null, detail = {}, ip = "" } = {}) {
  db.prepare("INSERT INTO audit_log (organization_id,user_id,case_id,action,detail_json,ip_hash,created_at) VALUES (?,?,?,?,?,?,?)")
    .run(session.organization_id, session.user_id, caseId, action, JSON.stringify(detail), ip ? sha256(ip) : null, nowIso());
}
