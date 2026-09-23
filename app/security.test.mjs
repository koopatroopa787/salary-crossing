import test from "node:test";
import assert from "node:assert/strict";
import { passwordHash, passwordMatches, safeEqual, signedValue } from "./security.mjs";

test("passwords use a salted slow hash", () => {
  const a = passwordHash("long-enough-password");
  const b = passwordHash("long-enough-password");
  assert.notEqual(a.hash, b.hash);
  assert.equal(passwordMatches("long-enough-password", a.salt, a.hash), true);
  assert.equal(passwordMatches("wrong-password", a.salt, a.hash), false);
});

test("share and CSRF signatures are deterministic and secret-bound", () => {
  assert.equal(signedValue("secret", "share", "one"), signedValue("secret", "share", "one"));
  assert.equal(safeEqual(signedValue("secret", "share", "one"), signedValue("other", "share", "one")), false);
});
