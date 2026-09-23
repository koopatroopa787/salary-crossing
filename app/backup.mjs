import { createCipheriv, randomBytes } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { configuration, validateProductionConfig } from "./config.mjs";
import { openDatabase } from "./db.mjs";

function key(raw) {
  const value = Buffer.from(raw, "base64");
  if (value.length !== 32) throw new Error("ADVISER_MASTER_KEY must be a 32-byte base64 key.");
  return value;
}

function encrypt(buffer, secret) {
  const nonce = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", secret, nonce);
  const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
  return Buffer.concat([Buffer.from("SCBK01"), nonce, cipher.getAuthTag(), encrypted]);
}

export function backup(config = configuration(), now = new Date()) {
  validateProductionConfig(config);
  mkdirSync(config.backupPath, { recursive: true, mode: 0o700 });
  mkdirSync(config.storagePath, { recursive: true, mode: 0o700 });
  const temporary = mkdtempSync(join(tmpdir(), "salary-crossing-backup-"));
  try {
    const snapshot = join(temporary, "adviser.sqlite");
    const db = openDatabase(config.databasePath);
    db.exec(`VACUUM INTO '${snapshot.replaceAll("'", "''")}'`);
    db.close();
    const archive = join(temporary, "adviser.tar");
    const args = ["-cf", archive, "-C", temporary, "adviser.sqlite"];
    const objects = resolve(config.storagePath, "objects");
    if (existsSync(objects)) args.push("-C", config.storagePath, "objects");
    const result = spawnSync("tar", args, { encoding: "utf8", timeout: 120_000, windowsHide: true });
    if (result.status !== 0) throw new Error(result.stderr || "Could not create backup archive.");
    const stamp = now.toISOString().replace(/[:.]/g, "-");
    const output = join(config.backupPath, `adviser-${stamp}.scbackup`);
    writeFileSync(output, encrypt(readFileSync(archive), key(config.masterKey)), { mode: 0o600 });

    const cutoff = now.getTime() - config.backupRetentionDays * 86400000;
    for (const filename of readdirSync(config.backupPath)) {
      const path = join(config.backupPath, basename(filename));
      if (filename.endsWith(".scbackup") && statSync(path).mtimeMs < cutoff) rmSync(path, { force: true });
    }
    return output;
  } finally {
    if (temporary.startsWith(resolve(tmpdir()))) rmSync(temporary, { recursive: true, force: true });
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try { console.log(`Encrypted adviser backup: ${backup()}`); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
