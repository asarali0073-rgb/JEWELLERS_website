import bcrypt from "bcryptjs";

export async function authenticateAdmin(accounts, email, password) {
  const account = await accounts.findOne({ email });
  if (!account || !["admin", "owner"].includes(account.role)) return null;

  if (typeof account.passwordHash === "string") {
    return (await bcrypt.compare(password, account.passwordHash))
      ? { email: account.email, role: "owner" }
      : null;
  }

  if (typeof account.password !== "string" || account.password !== password)
    return null;

  const passwordHash = await bcrypt.hash(password, 12);
  const migration = await accounts.updateOne(
    {
      _id: account._id,
      password: account.password,
      passwordHash: { $exists: false },
    },
    {
      $set: { passwordHash, role: "owner" },
      $unset: { password: "" },
    },
  );

  const currentAccount =
    migration.modifiedCount === 1
      ? { passwordHash }
      : await accounts.findOne({ _id: account._id });

  if (
    typeof currentAccount?.passwordHash !== "string" ||
    !(await bcrypt.compare(password, currentAccount.passwordHash))
  )
    return null;

  return { email: account.email, role: "owner" };
}
