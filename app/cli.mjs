import { fileURLToPath } from "node:url";
import { configuration, validateProductionConfig } from "./config.mjs";
import { openDatabase, setupOrganization } from "./db.mjs";
import { cleanEmail, cleanText, id, nowIso, passwordHash } from "./security.mjs";
import { purgeExpiredDocuments } from "./storage.mjs";

function flags(args) {
  const parsed = {};
  for (let i = 0; i < args.length; i++) if (args[i].startsWith("--")) parsed[args[i].slice(2)] = args[++i];
  return parsed;
}

function required(value, label) {
  if (!value) throw new Error(`${label} is required.`);
  return value;
}

export function run(argv = process.argv.slice(2), env = process.env) {
  const command = argv[0];
  const options = flags(argv.slice(1));
  const config = configuration(env);
  validateProductionConfig(config);
  const db = openDatabase(config.databasePath);
  if (command === "setup") {
    if (db.prepare("SELECT count(*) count FROM users").get().count) throw new Error("The adviser workspace has already been set up.");
    const organization = cleanText(required(options.organization ?? env.ADVISER_ORGANIZATION, "Organisation"), 100);
    const name = cleanText(required(options.name ?? env.ADVISER_ADMIN_NAME, "Admin name"), 100);
    const email = cleanEmail(required(options.email ?? env.ADVISER_ADMIN_EMAIL, "Admin email"));
    const password = required(env.ADVISER_ADMIN_PASSWORD, "ADVISER_ADMIN_PASSWORD");
    const slug = cleanText(options.slug ?? organization.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""), 60);
    const created = setupOrganization(db, { organization, slug, name, email, password });
    console.log(`Created ${organization} owner ${email} (${created.userId}).`);
    return;
  }
  if (command === "add-user") {
    const organization = db.prepare("SELECT id,name FROM organizations WHERE slug=?").get(required(options.organization, "--organization"));
    if (!organization) throw new Error("Organisation not found.");
    const email = cleanEmail(required(options.email, "--email"));
    const name = cleanText(required(options.name, "--name"), 100);
    const role = ["owner", "adviser", "reviewer"].includes(options.role) ? options.role : "adviser";
    const password = required(env.ADVISER_ADMIN_PASSWORD, "ADVISER_ADMIN_PASSWORD");
    const hashed = passwordHash(password);
    db.prepare("INSERT INTO users (id,organization_id,email,name,role,password_salt,password_hash,created_at) VALUES (?,?,?,?,?,?,?,?)")
      .run(id("usr_"), organization.id, email, name, role, hashed.salt, hashed.hash, nowIso());
    console.log(`Created ${role} ${email} in ${organization.name}.`);
    return;
  }
  if (command === "purge-expired") {
    console.log(`Deleted ${purgeExpiredDocuments({ db, config })} expired retained documents.`);
    return;
  }
  throw new Error("Usage: node app/cli.mjs setup|add-user|purge-expired");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try { run(); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
