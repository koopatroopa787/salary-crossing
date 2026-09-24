import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { configuration, validateProductionConfig } from "./config.mjs";
import { audit, createSession, currentSession, openDatabase } from "./db.mjs";
import { extractCaseData } from "./llm.mjs";
import { adviserPrivacyView, adviserTermsView, dataProcessingView, subprocessorsView } from "./legal_views.mjs";
import { compensationReportPdf } from "./pdf.mjs";
import { calculateReport, normalizeInputs } from "./report.mjs";
import { findCase, listCaseDocuments } from "./repository.mjs";
import { cleanEmail, cleanText, expiredSessionCookie, nowIso, parseCookies, passwordHash, passwordMatches, safeEqual, sessionCookie, sha256, signedValue } from "./security.mjs";
import { deleteCaseDocuments, documentsForExtraction, readDocument, storeDocument } from "./storage.mjs";
import { accountView, billingView, caseView, dashboardView, loginView, newCaseView, organizationView, reportView } from "./views.mjs";

const APP_CSS = readFileSync(new URL("./app.css", import.meta.url));
const FX_PATH = fileURLToPath(new URL("../fx-cache.json", import.meta.url));
const loginAttempts = new Map();
const LOGIN_WINDOW_MS = 15 * 60 * 1000;

const config = configuration();
validateProductionConfig(config);
const db = openDatabase(config.databasePath);

function send(res, status, body, type = "text/html; charset=utf-8", headers = {}) {
  res.writeHead(status, {
    "Content-Type": type,
    "Content-Length": Buffer.byteLength(body),
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "no-referrer",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    "Content-Security-Policy": "default-src 'self'; style-src 'self'; img-src 'self' data:; form-action 'self' https://checkout.stripe.com; frame-ancestors 'none'; base-uri 'none'",
    ...headers,
  });
  res.end(body);
}

const redirect = (res, location, headers = {}) => send(res, 303, "", "text/plain", { Location: location, ...headers });
const clientIp = (req) => String(req.headers["x-forwarded-for"] ?? req.socket.remoteAddress ?? "").split(",")[0].trim();

async function readBody(req, maximum = 1024 * 1024) {
  const chunks = [];
  let length = 0;
  for await (const chunk of req) {
    length += chunk.length;
    if (length > maximum) throw Object.assign(new Error("Request is too large."), { status: 413 });
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

async function form(req) {
  return new URLSearchParams((await readBody(req)).toString("utf8"));
}

function parseMultipart(buffer, contentType) {
  const boundary = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/)?.slice(1).find(Boolean);
  if (!boundary || boundary.length > 200) throw new Error("Invalid upload form.");
  const marker = Buffer.from(`--${boundary}`);
  const parts = {};
  let cursor = buffer.indexOf(marker);
  while (cursor >= 0) {
    cursor += marker.length;
    if (buffer.subarray(cursor, cursor + 2).toString() === "--") break;
    if (buffer.subarray(cursor, cursor + 2).toString() === "\r\n") cursor += 2;
    const headerEnd = buffer.indexOf(Buffer.from("\r\n\r\n"), cursor);
    if (headerEnd < 0) break;
    const headers = buffer.subarray(cursor, headerEnd).toString("utf8");
    const next = buffer.indexOf(marker, headerEnd + 4);
    if (next < 0) break;
    const content = buffer.subarray(headerEnd + 4, Math.max(headerEnd + 4, next - 2));
    const disposition = headers.match(/content-disposition:\s*form-data;([^\r\n]+)/i)?.[1] ?? "";
    const name = disposition.match(/name="([^"]+)"/i)?.[1];
    if (name) {
      const filename = disposition.match(/filename="([^"]*)"/i)?.[1];
      const mime = headers.match(/content-type:\s*([^\r\n]+)/i)?.[1]?.trim() ?? "application/octet-stream";
      parts[name] = filename == null ? content.toString("utf8") : { filename, mime, buffer: content };
    }
    cursor = next;
  }
  return parts;
}

function authContext(req) {
  const rawSession = parseCookies(req.headers.cookie).sc_adviser ?? "";
  const session = currentSession(db, rawSession);
  const csrfToken = rawSession ? signedValue(config.sessionSecret, "csrf", rawSession) : "";
  return { rawSession, session, csrfToken };
}

function requireAuth(req, res) {
  const context = authContext(req);
  if (!context.session) { redirect(res, "/login"); return null; }
  return context;
}

function requireCsrf(params, context) {
  const supplied = params.get ? params.get("csrf") : params.csrf;
  if (!supplied || !safeEqual(supplied, context.csrfToken) || !safeEqual(sha256(supplied), context.session.csrf_hash)) {
    throw Object.assign(new Error("This form expired. Reload the page and try again."), { status: 403 });
  }
}

function requireRole(session, roles) {
  if (!roles.includes(session.role)) throw Object.assign(new Error("Your workspace role cannot perform this action."), { status: 403 });
}

function caseFor(session, caseId) {
  return findCase(db, session.organization_id, caseId);
}

function caseData(session, caseId) {
  const item = caseFor(session, caseId);
  if (!item) return null;
  return {
    item,
    documents: listCaseDocuments(db, session.organization_id, caseId),
    comments: db.prepare("SELECT c.*,u.name author_name FROM comments c JOIN users u ON u.id=c.author_id WHERE c.case_id=? AND c.organization_id=? ORDER BY c.created_at DESC").all(caseId, session.organization_id),
    auditRows: db.prepare("SELECT action,created_at FROM audit_log WHERE case_id=? AND organization_id=? ORDER BY created_at DESC LIMIT 20").all(caseId, session.organization_id),
  };
}

function fx() { return JSON.parse(readFileSync(FX_PATH, "utf8")); }
function reportFor(item) { return calculateReport(JSON.parse(item.inputs_json), fx()); }
function shareToken(item) { return signedValue(config.sessionSecret, "share", item.id, String(item.share_version)); }
function shareUrl(item) { return `${config.origin}/share/${item.id}/${shareToken(item)}`; }
function documentUrl(session, document) {
  const expires = Math.floor(Date.now() / 1000) + 300;
  const signature = signedValue(config.sessionSecret, "document", session.organization_id, session.user_id, document.id, String(expires));
  return `/documents/${document.id}?expires=${expires}&signature=${signature}`;
}

function recordVersion(session, item, kind, calculation = null) {
  db.prepare("INSERT INTO case_versions (organization_id,case_id,kind,inputs_json,calculation_json,created_by,created_at) VALUES (?,?,?,?,?,?,?)")
    .run(session.organization_id, item.id, kind, item.inputs_json, calculation ? JSON.stringify(calculation) : null, session.user_id, nowIso());
}

function inputFromForm(params) {
  const side = (prefix) => ({
    code: params.get(`${prefix}Code`), gross: params.get(`${prefix}Gross`), bonus: params.get(`${prefix}Bonus`),
    equity: params.get(`${prefix}Equity`), employerPension: params.get(`${prefix}Pension`), benefits: params.get(`${prefix}Benefits`),
    costs: Object.fromEntries(["housing", "healthcare", "childcare", "transport", "other"].map((key) => [key, params.get(`${prefix}Cost_${key}`)])),
  });
  return normalizeInputs({
    from: side("from"), to: side("to"), oneTime: { allowance: params.get("allowance"), movingCost: params.get("movingCost") },
    assumptions: String(params.get("assumptions") ?? "").split(/\r?\n/),
    unsupported: String(params.get("unsupported") ?? "").split(/\r?\n/),
  });
}

async function stripeCheckout(session) {
  if (!config.stripeSecretKey || !config.stripePilotPrice) throw new Error("Online pilot billing is not configured.");
  const body = new URLSearchParams({
    mode: "payment", "line_items[0][price]": config.stripePilotPrice, "line_items[0][quantity]": "1",
    success_url: `${config.origin}/billing?paid=1`, cancel_url: `${config.origin}/billing?cancelled=1`,
    customer_email: session.email, client_reference_id: session.organization_id, "metadata[organization_id]": session.organization_id,
  });
  const response = await fetch("https://api.stripe.com/v1/checkout/sessions", { method: "POST", headers: { Authorization: `Bearer ${config.stripeSecretKey}`, "Content-Type": "application/x-www-form-urlencoded" }, body, signal: AbortSignal.timeout(20_000) });
  const result = await response.json();
  if (!response.ok || !result.url) throw new Error(result.error?.message ?? "Stripe checkout could not be created.");
  return result.url;
}

function validStripeSignature(raw, header) {
  if (!config.stripeWebhookSecret) return false;
  const values = Object.fromEntries(String(header ?? "").split(",").map((part) => part.split("=", 2)));
  const timestamp = Number(values.t);
  if (!timestamp || Math.abs(Date.now() / 1000 - timestamp) > 300) return false;
  const expected = Buffer.from(createHmac("sha256", config.stripeWebhookSecret).update(`${timestamp}.${raw.toString("utf8")}`).digest("hex"));
  const actual = Buffer.from(values.v1 ?? "");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function loginAttempt(ip) {
  const current = loginAttempts.get(ip);
  if (!current || Date.now() - current.startedAt > LOGIN_WINDOW_MS) return { count: 0, startedAt: Date.now() };
  return current;
}

async function handler(req, res) {
  const url = new URL(req.url, config.origin);
  const method = req.method ?? "GET";
  if (method === "GET" && url.pathname === "/health") return send(res, 200, JSON.stringify({ ok: true, database: true, llm: Boolean(config.llmApiKey), billing: Boolean(config.stripeSecretKey && config.stripePilotPrice), documentUploads: config.documentUploadsEnabled }), "application/json");
  if (method === "GET" && url.pathname === "/assets/app.css") return send(res, 200, APP_CSS, "text/css; charset=utf-8", { "Cache-Control": "public, max-age=3600" });
  if (method === "GET" && url.pathname === "/privacy") return send(res, 200, adviserPrivacyView());
  if (method === "GET" && url.pathname === "/terms") return send(res, 200, adviserTermsView());
  if (method === "GET" && url.pathname === "/data-processing") return send(res, 200, dataProcessingView());
  if (method === "GET" && url.pathname === "/subprocessors") return send(res, 200, subprocessorsView());
  if (method === "GET" && url.pathname === "/login") return send(res, 200, loginView());
  if (method === "POST" && url.pathname === "/login") {
    const ip = clientIp(req); const attempts = loginAttempt(ip);
    if (attempts.count >= 10) return send(res, 429, loginView({ error: "Too many attempts. Try again in 15 minutes." }));
    const params = await form(req); let email;
    try { email = cleanEmail(params.get("email")); } catch { email = ""; }
    const user = db.prepare("SELECT * FROM users WHERE email=? AND disabled_at IS NULL").get(email);
    if (!user || !passwordMatches(params.get("password") ?? "", user.password_salt, user.password_hash)) {
      loginAttempts.set(ip, { count: attempts.count + 1, startedAt: attempts.startedAt }); return send(res, 401, loginView({ error: "Email or password was not recognised." }));
    }
    loginAttempts.delete(ip);
    const created = createSession(db, user.id, config.sessionSecret);
    return redirect(res, "/", { "Set-Cookie": sessionCookie(created.raw, { secure: config.origin.startsWith("https://") }) });
  }
  if (method === "POST" && url.pathname === "/stripe/webhook") {
    const raw = await readBody(req, 1024 * 1024);
    if (!validStripeSignature(raw, req.headers["stripe-signature"])) return send(res, 400, "Invalid signature", "text/plain");
    const event = JSON.parse(raw);
    if (event.type === "checkout.session.completed") {
      const organizationId = event.data?.object?.metadata?.organization_id;
      if (organizationId) db.prepare("UPDATE organizations SET billing_status='paid-pilot' WHERE id=?").run(organizationId);
    }
    return send(res, 200, "ok", "text/plain");
  }
  const publicMatch = url.pathname.match(/^\/share\/([^/]+)\/([^/]+)$/);
  if (method === "GET" && publicMatch) {
    const item = db.prepare("SELECT c.*,o.brand_name,o.brand_color FROM cases c JOIN organizations o ON o.id=c.organization_id WHERE c.id=? AND c.report_approved_at IS NOT NULL").get(publicMatch[1]);
    if (!item || !safeEqual(publicMatch[2], shareToken(item))) return send(res, 404, "This client report is unavailable.", "text/plain");
    db.prepare("INSERT INTO audit_log (organization_id,user_id,case_id,action,detail_json,ip_hash,created_at) VALUES (?,NULL,?,'report.viewed','{}',?,?)").run(item.organization_id, item.id, sha256(clientIp(req)), nowIso());
    return send(res, 200, reportView({ session: { brand_name: item.brand_name }, item, report: reportFor(item), publicView: true }));
  }

  const context = requireAuth(req, res); if (!context) return;
  const { session, csrfToken } = context;
  if (method === "POST" && url.pathname === "/logout") {
    const params = await form(req); requireCsrf(params, context);
    db.prepare("DELETE FROM sessions WHERE id_hash=?").run(sha256(context.rawSession));
    return redirect(res, "/login", { "Set-Cookie": expiredSessionCookie({ secure: config.origin.startsWith("https://") }) });
  }
  if (method === "GET" && url.pathname === "/account") {
    return send(res, 200, accountView({ session, csrfToken, notice: url.searchParams.get("notice") ?? "" }));
  }
  if (method === "POST" && url.pathname === "/account/password") {
    const params = await form(req); requireCsrf(params, context);
    const user = db.prepare("SELECT * FROM users WHERE id=? AND organization_id=? AND disabled_at IS NULL").get(session.user_id, session.organization_id);
    if (!user || !passwordMatches(params.get("currentPassword") ?? "", user.password_salt, user.password_hash)) {
      return send(res, 400, accountView({ session, csrfToken, error: "The current password was not recognised." }));
    }
    const next = String(params.get("newPassword") ?? "");
    if (next !== String(params.get("confirmPassword") ?? "")) {
      return send(res, 400, accountView({ session, csrfToken, error: "The new passwords do not match." }));
    }
    const hashed = passwordHash(next);
    db.prepare("UPDATE users SET password_salt=?,password_hash=? WHERE id=? AND organization_id=?").run(hashed.salt, hashed.hash, session.user_id, session.organization_id);
    db.prepare("DELETE FROM sessions WHERE user_id=? AND id_hash<>?").run(session.user_id, sha256(context.rawSession));
    audit(db, session, "account.password-changed", { ip: clientIp(req) });
    return redirect(res, "/account?notice=Password updated; other sessions signed out");
  }
  if (method === "GET" && url.pathname === "/") {
    const cases = db.prepare("SELECT id,reference,client_name,status,updated_at FROM cases WHERE organization_id=? ORDER BY updated_at DESC").all(session.organization_id);
    return send(res, 200, dashboardView({ session, csrfToken, cases, notice: url.searchParams.get("notice") ?? "" }));
  }
  if (method === "GET" && url.pathname === "/cases/new") {
    requireRole(session, ["owner", "adviser"]);
    return send(res, 200, newCaseView({ session, csrfToken }));
  }
  if (method === "POST" && url.pathname === "/cases") {
    requireRole(session, ["owner", "adviser"]);
    const params = await form(req); requireCsrf(params, context);
    const count = db.prepare("SELECT count(*) count FROM cases WHERE organization_id=? AND status!='closed'").get(session.organization_id).count;
    if (count >= session.case_limit) return send(res, 409, newCaseView({ session, csrfToken, error: "This pilot has reached its active case allowance." }));
    const reference = cleanText(params.get("reference"), 40); const clientName = cleanText(params.get("clientName"), 100);
    if (!reference || !clientName) return send(res, 400, newCaseView({ session, csrfToken, error: "Reference and client name are required." }));
    const inputs = normalizeInputs({ from: { code: params.get("fromCode") }, to: { code: params.get("toCode") } });
    const caseId = `case_${randomUUID().replaceAll("-", "")}`; const now = nowIso();
    try { db.prepare("INSERT INTO cases (id,organization_id,reference,client_name,inputs_json,created_by,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)").run(caseId, session.organization_id, reference, clientName, JSON.stringify(inputs), session.user_id, now, now); }
    catch (error) { return send(res, 409, newCaseView({ session, csrfToken, error: error.message.includes("UNIQUE") ? "That reference is already in use." : error.message })); }
    audit(db, session, "case.created", { caseId, detail: { reference }, ip: clientIp(req) });
    recordVersion(session, { id: caseId, inputs_json: JSON.stringify(inputs) }, "created");
    return redirect(res, `/cases/${caseId}?notice=Case created`);
  }

  const caseMatch = url.pathname.match(/^\/cases\/([^/]+)(?:\/(upload|extract|inputs|approve-report|reopen|revoke|close|comments|delete|report|report\.pdf))?$/);
  if (caseMatch) {
    const [, caseId, action = "view"] = caseMatch;
    const data = caseData(session, caseId);
    if (!data) return send(res, 404, "Case not found", "text/plain");
    if (method === "GET" && action === "view") {
      const report = data.item.input_approved_at ? reportFor(data.item) : null;
      const documents = data.documents.map((document) => ({ ...document, download_url: documentUrl(session, document) }));
      return send(res, 200, caseView({ session, csrfToken, ...data, documents, report, notice: url.searchParams.get("notice") ?? "", shareUrl: data.item.report_approved_at ? shareUrl(data.item) : "", aiConfigured: Boolean(config.llmApiKey), uploadEnabled: config.documentUploadsEnabled }));
    }
    if (method === "POST" && action === "upload") {
      requireRole(session, ["owner", "adviser"]);
      if (!config.documentUploadsEnabled) throw Object.assign(new Error("Document uploads are disabled pending pilot security review."), { status: 503 });
      if (data.item.input_approved_at) throw Object.assign(new Error("Reopen inputs before adding evidence."), { status: 409 });
      const body = await readBody(req, config.maximumUploadBytes + 100_000); const parts = parseMultipart(body, req.headers["content-type"] ?? "");
      requireCsrf({ csrf: parts.csrf }, context);
      const file = parts.document; if (!file?.buffer) throw new Error("Choose a document.");
      const stored = storeDocument({ db, config, session, caseId, kind: cleanText(parts.kind, 40), filename: file.filename, suppliedType: file.mime, buffer: file.buffer });
      audit(db, session, "document.uploaded", { caseId, detail: { documentId: stored.id, name: stored.originalName }, ip: clientIp(req) });
      return redirect(res, `/cases/${caseId}?notice=Document scanned, encrypted and retained`);
    }
    if (method === "GET" && action === "report") {
      if (!data.item.input_approved_at) return redirect(res, `/cases/${caseId}?notice=Approve the inputs before generating a report`);
      return send(res, 200, reportView({ session, csrfToken, item: data.item, report: reportFor(data.item), shareUrl: data.item.report_approved_at ? shareUrl(data.item) : "" }));
    }
    if (method === "GET" && action === "report.pdf") {
      if (!data.item.input_approved_at) return send(res, 409, "Inputs are not approved.", "text/plain");
      const report = reportFor(data.item);
      const pdf = compensationReportPdf({ item: data.item, report, brandName: session.brand_name, brandColor: session.brand_color });
      audit(db, session, "report.downloaded", { caseId, ip: clientIp(req) });
      return send(res, 200, pdf, "application/pdf", { "Content-Disposition": `attachment; filename="${data.item.reference.replace(/[^a-z0-9_-]/gi, "_")}-report.pdf"` });
    }
    if (method !== "POST") return send(res, 405, "Method not allowed", "text/plain");
    const params = await form(req); requireCsrf(params, context);
    if (action === "extract") {
      requireRole(session, ["owner", "adviser"]);
      if (data.item.input_approved_at) throw Object.assign(new Error("Reopen inputs before extracting again."), { status: 409 });
      const extraction = await extractCaseData(documentsForExtraction({ db, config, session, caseId }), config);
      db.prepare("UPDATE cases SET extraction_json=?,status='review',updated_at=? WHERE id=? AND organization_id=?").run(JSON.stringify(extraction), nowIso(), caseId, session.organization_id);
      audit(db, session, "extraction.completed", { caseId, detail: { fields: extraction.fields.length }, ip: clientIp(req) });
      return redirect(res, `/cases/${caseId}?notice=Extraction complete; confirm every material value`);
    }
    if (action === "inputs") {
      requireRole(session, ["owner", "adviser"]);
      if (data.item.input_approved_at) throw Object.assign(new Error("Reopen inputs before changing them."), { status: 409 });
      const inputs = inputFromForm(params); const approve = params.get("action") === "approve"; const now = nowIso();
      db.prepare("UPDATE cases SET inputs_json=?,status=?,input_approved_at=?,updated_at=? WHERE id=? AND organization_id=?")
        .run(JSON.stringify(inputs), approve ? "approved" : "review", approve ? now : null, now, caseId, session.organization_id);
      recordVersion(session, { id: caseId, inputs_json: JSON.stringify(inputs) }, approve ? "inputs-approved" : "inputs-saved");
      audit(db, session, approve ? "inputs.approved" : "inputs.saved", { caseId, ip: clientIp(req) });
      return redirect(res, `/cases/${caseId}?notice=${approve ? "Inputs approved; deterministic report generated" : "Draft values saved"}`);
    }
    if (action === "approve-report") {
      requireRole(session, ["owner", "adviser", "reviewer"]);
      if (!data.item.input_approved_at) throw new Error("Approve the inputs first.");
      const now = nowIso();
      db.prepare("UPDATE cases SET report_approved_at=?,status='shared',share_version=share_version+1,updated_at=? WHERE id=? AND organization_id=?").run(now, now, caseId, session.organization_id);
      recordVersion(session, data.item, "report-approved", reportFor(data.item));
      audit(db, session, "report.approved", { caseId, ip: clientIp(req) });
      return redirect(res, `/cases/${caseId}?notice=Report approved and private client link created`);
    }
    if (action === "reopen") {
      requireRole(session, ["owner", "adviser"]);
      if (data.item.report_approved_at) throw new Error("Revoke the client link before reopening inputs.");
      db.prepare("UPDATE cases SET input_approved_at=NULL,status='review',updated_at=? WHERE id=? AND organization_id=?").run(nowIso(), caseId, session.organization_id);
      audit(db, session, "inputs.reopened", { caseId, ip: clientIp(req) }); return redirect(res, `/cases/${caseId}?notice=Inputs reopened`);
    }
    if (action === "revoke") {
      requireRole(session, ["owner", "adviser"]);
      db.prepare("UPDATE cases SET report_approved_at=NULL,status='approved',share_version=share_version+1,updated_at=? WHERE id=? AND organization_id=?").run(nowIso(), caseId, session.organization_id);
      audit(db, session, "report.revoked", { caseId, ip: clientIp(req) }); return redirect(res, `/cases/${caseId}?notice=Client link revoked`);
    }
    if (action === "close") {
      requireRole(session, ["owner", "adviser"]);
      const now = nowIso(); const retention = new Date(Date.now() + 365 * 86400000).toISOString();
      db.prepare("UPDATE cases SET status='closed',closed_at=?,retention_until=?,updated_at=? WHERE id=? AND organization_id=?").run(now, retention, now, caseId, session.organization_id);
      db.prepare("UPDATE documents SET retention_until=? WHERE case_id=? AND organization_id=?").run(retention, caseId, session.organization_id);
      audit(db, session, "case.closed", { caseId, detail: { retentionUntil: retention }, ip: clientIp(req) }); return redirect(res, `/cases/${caseId}?notice=Case closed; retention date recorded`);
    }
    if (action === "comments") {
      const body = cleanText(params.get("body"), 1000); if (!body) throw new Error("Comment cannot be empty.");
      db.prepare("INSERT INTO comments (id,organization_id,case_id,author_id,body,created_at) VALUES (?,?,?,?,?,?)").run(`com_${randomUUID().replaceAll("-", "")}`, session.organization_id, caseId, session.user_id, body, nowIso());
      audit(db, session, "comment.added", { caseId, ip: clientIp(req) }); return redirect(res, `/cases/${caseId}`);
    }
    if (action === "delete") {
      requireRole(session, ["owner"]);
      if (params.get("confirm") !== "yes") throw new Error("Confirm permanent deletion.");
      deleteCaseDocuments({ db, config, organizationId: session.organization_id, caseId });
      audit(db, session, "case.deleted", { caseId, detail: { reference: data.item.reference }, ip: clientIp(req) });
      db.prepare("DELETE FROM cases WHERE id=? AND organization_id=?").run(caseId, session.organization_id);
      return redirect(res, "/?notice=Case and retained documents deleted");
    }
  }

  const documentMatch = url.pathname.match(/^\/documents\/([^/]+)$/);
  if (method === "GET" && documentMatch) {
    const expires = Number(url.searchParams.get("expires"));
    const signature = url.searchParams.get("signature") ?? "";
    const expected = signedValue(config.sessionSecret, "document", session.organization_id, session.user_id, documentMatch[1], String(expires));
    const now = Math.floor(Date.now() / 1000);
    if (!Number.isInteger(expires) || expires < now || expires > now + 600 || !safeEqual(signature, expected)) {
      return send(res, 403, "This document link expired. Return to the case and open it again.", "text/plain");
    }
    const document = readDocument({ db, config, session, documentId: documentMatch[1] });
    if (!document) return send(res, 404, "Document not found", "text/plain");
    audit(db, session, "document.accessed", { caseId: document.row.case_id, detail: { documentId: document.row.id }, ip: clientIp(req) });
    return send(res, 200, document.buffer, document.row.mime_type, { "Content-Disposition": `attachment; filename="${document.row.original_name.replace(/["\r\n]/g, "_")}"` });
  }
  if (method === "GET" && url.pathname === "/organization") {
    requireRole(session, ["owner"]);
    return send(res, 200, organizationView({ session, csrfToken, notice: url.searchParams.get("notice") ?? "" }));
  }
  if (method === "POST" && url.pathname === "/organization") {
    requireRole(session, ["owner"]);
    const params = await form(req); requireCsrf(params, context);
    const brandName = cleanText(params.get("brandName"), 100); const brandColor = String(params.get("brandColor") ?? "");
    if (!brandName || !/^#[0-9a-f]{6}$/i.test(brandColor)) throw new Error("Enter a valid brand name and colour.");
    db.prepare("UPDATE organizations SET brand_name=?,brand_color=? WHERE id=?").run(brandName, brandColor, session.organization_id);
    audit(db, session, "organization.updated", { detail: { brandName }, ip: clientIp(req) }); return redirect(res, "/organization?notice=Organisation settings saved");
  }
  if (method === "GET" && url.pathname === "/billing") {
    requireRole(session, ["owner"]);
    return send(res, 200, billingView({ session, csrfToken, checkoutAvailable: Boolean(config.stripeSecretKey && config.stripePilotPrice) }));
  }
  if (method === "POST" && url.pathname === "/billing/checkout") {
    requireRole(session, ["owner"]);
    const params = await form(req); requireCsrf(params, context); return redirect(res, await stripeCheckout(session));
  }
  return send(res, 404, "Not found", "text/plain");
}

const server = createServer((req, res) => handler(req, res).catch((error) => {
  console.error(error);
  const status = Number(error.status) || 500;
  send(res, status, status >= 500 ? "The adviser service could not complete that request." : error.message, "text/plain");
}));

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  server.listen(config.port, config.host, () => console.log(`Salary Crossing Adviser listening on ${config.origin}`));
  const stop = () => server.close(() => { db.close(); process.exit(0); });
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
}

export { handler, server };
