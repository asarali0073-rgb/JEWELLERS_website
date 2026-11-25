import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { authenticateAdmin } from "./authenticate-admin.js";
import { AdminAccount } from "./models/admin-account.js";
import { connectDatabase } from "./db.js";
import { serviceErrorHandler } from "../../common/error-handler.js";

const envPath = fileURLToPath(new URL("../.env", import.meta.url));
if (existsSync(envPath)) dotenv.config({ path: envPath });

const app = express();
app.use(helmet());
if (process.env.NODE_ENV !== "production") app.use(cors());
app.use(express.json({ limit: "100kb" }));
app.use(async (_req, _res, next) => {
  try {
    await connectDatabase();
    next();
  } catch (error) {
    next(error);
  }
});

const asyncHandler = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);

function ownerOnly(req, res, next) {
  const token = (req.headers.authorization || "").startsWith("Bearer ")
    ? req.headers.authorization.slice(7)
    : "";
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET, {
      issuer: "amir-jewellers-auth",
    });
    if (payload.role !== "owner")
      return res.status(403).json({ message: "Owner access required." });
    req.admin = payload;
    next();
  } catch {
    return res
      .status(401)
      .json({ message: "Authentication token is missing or invalid." });
  }
}

app.get("/health", (_req, res) => {
  const status = mongoose.connection.readyState === 1 ? "ok" : "unavailable";
  res.status(status === "ok" ? 200 : 503).json({ service: "auth-service", status });
});

app.post(
  "/login",
  asyncHandler(async (req, res) => {
    const suppliedEmail = String(req.body?.email || "")
        .trim()
        .toLowerCase(),
      suppliedPassword = String(req.body?.password || "");
    if (!suppliedEmail || !suppliedPassword)
      return res
        .status(400)
        .json({ message: "Email and password are required." });

    const admin = await authenticateAdmin(
      AdminAccount.collection,
      suppliedEmail,
      suppliedPassword,
    );
    if (!admin)
      return res.status(401).json({ message: "Invalid email or password." });

    const token = jwt.sign(
      { sub: "owner-admin", email: admin.email, role: admin.role },
      process.env.JWT_SECRET,
      { expiresIn: "4h", issuer: "amir-jewellers-auth" },
    );
    res.json({
      token,
      admin,
      expiresIn: "4h",
    });
  }),
);

app.get("/me", ownerOnly, (req, res) => {
  res.json({
    admin: { email: req.admin.email, role: req.admin.role },
  });
});

app.use(serviceErrorHandler("Auth Service"));

if (process.env.NODE_ENV !== "production") {
  const port = Number(process.env.PORT || 5001);
  app.listen(port, () => console.log(`Auth Service running on port ${port}`));
}

export default app;
