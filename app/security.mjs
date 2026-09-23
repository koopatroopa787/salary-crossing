import { createHash, createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

export const nowIso = () => new Date().toISOString();
export const id = (prefix = "") => prefix + randomBytes(16).toString("hex");
export const token = (bytes = 32) => randomBytes(bytes).toString("base64url");
export const sha256 = (value) => createHash("sha256").update(value).digest("hex");

export function passwordHash(password, salt = randomBytes(16).toString("base64url")) {
  if (String(password).length < 12) throw new Error("Password must contain at least 12 characters.");
  return { salt, hash: scryptSync(String(password), salt, 64).toString("base64url") };
}

export function passwordMatches(password, salt, expected) {
  const actual = scryptSync(String(password), salt, 64);
  const wanted = Buffer.from(expected, "base64url");
  return actual.length === wanted.length && timingSafeEqual(actual, wanted);
}

export function signedValue(secret, ...parts) {
  return createHmac("sha256", secret).update(parts.join("\u001f")).digest("base64url");
}

export function safeEqual(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && timingSafeEqual(x, y);
}

export function cleanText(value, maximum = 500) {
  return String(value ?? "").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").trim().slice(0, maximum);
}

export function cleanEmail(value) {
  const email = cleanText(value, 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Enter a valid email address.");
  return email;
}

export function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

export function parseCookies(header = "") {
  return Object.fromEntries(header.split(";").map((part) => part.trim()).filter(Boolean).map((part) => {
    const at = part.indexOf("=");
    return at < 0 ? [part, ""] : [part.slice(0, at), decodeURIComponent(part.slice(at + 1))];
  }));
}

export function sessionCookie(raw, { secure = true, maxAge = 60 * 60 * 12 } = {}) {
  return `sc_adviser=${encodeURIComponent(raw)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure ? "; Secure" : ""}`;
}

export function expiredSessionCookie({ secure = true } = {}) {
  return `sc_adviser=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure ? "; Secure" : ""}`;
}
