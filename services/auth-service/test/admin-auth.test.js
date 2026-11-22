import assert from "node:assert/strict";
import test from "node:test";
import bcrypt from "bcryptjs";
import { authenticateAdmin } from "../src/authenticate-admin.js";
import { AdminAccount } from "../src/models/admin-account.js";

test("uses the established admins collection and a hashed owner schema", async () => {
  assert.equal(AdminAccount.collection.name, "admins");
  const account = new AdminAccount({
    email: "owner@example.com",
    passwordHash: "bcrypt-hash",
    role: "owner",
  });
  await account.validate();
  await assert.rejects(
    () => new AdminAccount({ email: "owner@example.com" }).validate(),
  );
});

class MemoryAccounts {
  constructor(account) {
    this.account = account;
  }

  async findOne(query) {
    return Object.entries(query).every(
      ([key, value]) => this.account?.[key] === value,
    )
      ? { ...this.account }
      : null;
  }

  async updateOne(filter, update) {
    const matches =
      this.account?._id === filter._id &&
      this.account.password === filter.password &&
      !("passwordHash" in this.account);
    if (!matches) return { modifiedCount: 0 };

    Object.assign(this.account, update.$set);
    for (const key of Object.keys(update.$unset)) delete this.account[key];
    return { modifiedCount: 1 };
  }
}

test("migrates a valid legacy admin password to an owner hash", async () => {
  const accounts = new MemoryAccounts({
    _id: "legacy-admin",
    email: "owner@example.com",
    password: "legacy-password",
    role: "admin",
  });

  assert.deepEqual(
    await authenticateAdmin(accounts, "owner@example.com", "legacy-password"),
    { email: "owner@example.com", role: "owner" },
  );
  assert.equal(accounts.account.password, undefined);
  assert.equal(accounts.account.role, "owner");
  assert.equal(
    await bcrypt.compare("legacy-password", accounts.account.passwordHash),
    true,
  );
});

test("rejects an incorrect legacy password without changing the account", async () => {
  const accounts = new MemoryAccounts({
    _id: "legacy-admin",
    email: "owner@example.com",
    password: "legacy-password",
    role: "admin",
  });

  assert.equal(
    await authenticateAdmin(accounts, "owner@example.com", "wrong-password"),
    null,
  );
  assert.equal(accounts.account.password, "legacy-password");
  assert.equal(accounts.account.passwordHash, undefined);
});

test("authenticates existing password hashes and rejects incorrect passwords", async () => {
  const accounts = new MemoryAccounts({
    _id: "hashed-admin",
    email: "owner@example.com",
    passwordHash: await bcrypt.hash("current-password", 4),
    role: "owner",
  });

  assert.deepEqual(
    await authenticateAdmin(accounts, "owner@example.com", "current-password"),
    { email: "owner@example.com", role: "owner" },
  );
  assert.equal(
    await authenticateAdmin(accounts, "owner@example.com", "wrong-password"),
    null,
  );
});
