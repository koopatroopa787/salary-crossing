import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { backup } from "./backup.mjs";
import { openDatabase } from "./db.mjs";

test("backups encrypt the database and expire files older than 30 days", () => {
  const root = mkdtempSync(join(tmpdir(), "salary-crossing-backup-test-"));
  try {
    const config = {
      env: "test", databasePath: join(root, "adviser.sqlite"), storagePath: join(root, "documents"),
      backupPath: join(root, "backups"), backupRetentionDays: 30,
      masterKey: Buffer.alloc(32, 9).toString("base64"), sessionSecret: "test-session-secret-that-is-long-enough", origin: "http://test",
    };
    openDatabase(config.databasePath).close();
    const first = backup(config, new Date("2026-08-01T00:00:00Z"));
    const old = new Date("2026-08-01T00:00:00Z");
    utimesSync(first, old, old);
    const second = backup(config, new Date("2026-09-23T00:00:00Z"));
    const bytes = readFileSync(second);
    assert.equal(bytes.subarray(0, 6).toString(), "SCBK01");
    assert.equal(bytes.includes(Buffer.from("SQLite format 3")), false);
    assert.throws(() => readFileSync(first), /ENOENT/);
  } finally {
    assert.ok(root.startsWith(tmpdir()));
    rmSync(root, { recursive: true, force: true });
  }
});
