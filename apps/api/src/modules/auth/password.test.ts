import assert from "node:assert/strict";
import { test } from "node:test";
import { hashPassword, verifyPassword } from "./password.js";
import { registerSchema } from "./auth.validation.js";

test("correct password succeeds and incorrect password fails", async () => {
  const hash = await hashPassword("example-password");

  assert.equal(await verifyPassword("example-password", hash), true);

  assert.equal(await verifyPassword("wrong-password", hash), false);
});

test("the same password produces different hashes", async () => {
  const first = await hashPassword("example-password");
  const second = await hashPassword("example-password");

  assert.notEqual(first, second);
});

test("malformed stored hashes are rejected", async () => {
  assert.equal(await verifyPassword("example-password", "invalid"), false);

  assert.equal(
    await verifyPassword("example-password", "scrypt-v1:xx:yy"),
    false,
  );
});

test("registration normalizes email and preserves password", () => {
  const result = registerSchema.parse({
    displayName: "  Adventurer  ",
    email: "  HERO@EXAMPLE.COM  ",
    password: " secret ",
    timeZone: "Asia/Baku",
  });

  assert.equal(result.displayName, "Adventurer");
  assert.equal(result.email, "hero@example.com");
  assert.equal(result.password, " secret ");
});

test("registration rejects invalid time zones and economy fields", () => {
  const input = {
    displayName: "Adventurer",
    email: "hero@example.com",
    password: "example-password",
    timeZone: "Asia/Baku",
  };

  assert.equal(
    registerSchema.safeParse({
      ...input,
      timeZone: "Invalid/Zone",
    }).success,
    false,
  );

  assert.equal(
    registerSchema.safeParse({
      ...input,
      gold: 99999,
    }).success,
    false,
  );
});
