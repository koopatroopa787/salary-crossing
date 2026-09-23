import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));

export function configuration(env = process.env) {
  return {
    env: env.NODE_ENV ?? "development",
    host: env.ADVISER_HOST ?? "127.0.0.1",
    port: Number(env.ADVISER_PORT ?? 8787),
    origin: env.ADVISER_ORIGIN ?? "http://127.0.0.1:8787",
    databasePath: resolve(env.ADVISER_DB ?? `${ROOT}/var/adviser.sqlite`),
    storagePath: resolve(env.ADVISER_STORAGE ?? `${ROOT}/var/documents`),
    backupPath: resolve(env.ADVISER_BACKUPS ?? `${ROOT}/var/backups`),
    backupRetentionDays: Number(env.ADVISER_BACKUP_RETENTION_DAYS ?? 30),
    masterKey: env.ADVISER_MASTER_KEY ?? "",
    sessionSecret: env.ADVISER_SESSION_SECRET ?? "",
    setupToken: env.ADVISER_SETUP_TOKEN ?? "",
    llmApiKey: env.OPENAI_API_KEY ?? "",
    llmModel: env.ADVISER_LLM_MODEL ?? "gpt-5-mini",
    llmBaseUrl: env.ADVISER_LLM_URL ?? "https://api.openai.com/v1/responses",
    stripeSecretKey: env.STRIPE_SECRET_KEY ?? "",
    stripeWebhookSecret: env.STRIPE_WEBHOOK_SECRET ?? "",
    stripePilotPrice: env.STRIPE_PILOT_PRICE_ID ?? "",
    scanner: env.ADVISER_SCANNER ?? "clamscan",
    pdfText: env.ADVISER_PDFTOTEXT ?? "pdftotext",
    maximumUploadBytes: Number(env.ADVISER_MAX_UPLOAD_BYTES ?? 10 * 1024 * 1024),
    allowUnscanned: env.ADVISER_ALLOW_UNSCANNED === "1" && env.NODE_ENV !== "production",
    documentUploadsEnabled: env.ADVISER_DOCUMENT_UPLOADS_ENABLED === "1",
  };
}

export function validateProductionConfig(config) {
  const failures = [];
  if (config.env === "production") {
    if (Buffer.from(config.masterKey, "base64").length !== 32) failures.push("ADVISER_MASTER_KEY must be 32 random bytes encoded as base64");
    if (config.sessionSecret.length < 32) failures.push("ADVISER_SESSION_SECRET must contain at least 32 characters");
    if (!config.origin.startsWith("https://")) failures.push("ADVISER_ORIGIN must use HTTPS");
  }
  if (failures.length) throw new Error(`Unsafe adviser configuration:\n- ${failures.join("\n- ")}`);
}
