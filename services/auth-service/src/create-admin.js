import "dotenv/config";
import bcrypt from "bcryptjs";
import { connectDatabase, closeDatabase } from "./db.js";
import { AdminAccount } from "./models/admin-account.js";

class SetupError extends Error {}

let exitCode = 0;

try {
  const email = String(process.env.OWNER_EMAIL || "").trim().toLowerCase();
  const password = String(process.env.OWNER_PASSWORD || "");
  if (!email || !password)
    throw new SetupError(
      "Set OWNER_EMAIL and OWNER_PASSWORD in the auth service .env.",
    );
  if (password.length < 16)
    throw new SetupError(
      "OWNER_PASSWORD must contain at least 16 characters.",
    );

  await connectDatabase();
  if (await AdminAccount.exists({ email }))
    throw new SetupError("An administrator with this email already exists.");

  const passwordHash = await bcrypt.hash(password, 12);
  await AdminAccount.create({ email, passwordHash, role: "owner" });
  console.log(`Initial administrator created for ${email}.`);
} catch (error) {
  if (error instanceof SetupError) {
    console.error("Initial administrator setup failed:", error.message);
  } else {
    console.error(
      "Initial administrator setup failed; check MONGODB_URI, JWT_SECRET, and Atlas access.",
    );
    console.error(error.name || "Error");
  }
  exitCode = 1;
} finally {
  try {
    await closeDatabase();
  } catch (error) {
    console.error("Auth Service database shutdown failed:", error.name);
    exitCode = 1;
  }
}

process.exitCode = exitCode;
