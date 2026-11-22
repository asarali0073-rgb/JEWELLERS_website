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
import { connectDatabase, closeDatabase } from "./db.js";
import { serviceErrorHandler } from "../../common/error-handler.js";
import { logDatabaseError } from "../../common/database-diagnostics.js";

const envPath = fileURLToPath(new URL("../.env", import.meta.url));
if (existsSync(envPath)) dotenv.config({ path: envPath });

const app = express();
app.use(helmet());
app.use(
  cors({ origin: process.env.FRONTEND_ORIGIN || "http://localhost:5173" }),
);
app.use(express.json({ limit: "100kb" }));

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

const port = Number(process.env.PORT || 5001);
let server;
let shuttingDown = false;

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`Auth Service received ${signal}; shutting down.`);
  if (!server) {
    await closeDatabase();
    return;
  }
  server.close(async (error) => {
    if (error) {
      console.error("Auth Service HTTP shutdown failed:", error.name);
      process.exitCode = 1;
    }
    try {
      await closeDatabase();
    } catch (closeError) {
      console.error("Auth Service database shutdown failed:", closeError.name);
      process.exitCode = 1;
    }
  });
}

process.once("SIGINT", () => void shutdown("SIGINT"));
process.once("SIGTERM", () => void shutdown("SIGTERM"));

try {
  if (!process.env.JWT_SECRET)
    throw new Error("JWT_SECRET is required.");
  await connectDatabase();
  const onListening = () =>
    console.log(`Auth Service running on port ${port}`);
  server = process.env.HOST
    ? app.listen(port, process.env.HOST, onListening)
    : app.listen(port, onListening);
  server.on("error", (error) => {
    console.error(
      error.code === "EADDRINUSE"
        ? `Auth service failed to start: port ${port} is already in use.`
        : "Auth service failed to start:",
      error.code === "EADDRINUSE" ? "" : error.name,
    );
    process.exitCode = 1;
    void closeDatabase().catch(() => {
      console.error("Auth Service database shutdown failed.");
    });
  });
} catch (error) {
  console.error(
    "Auth Service could not initialize. Check JWT_SECRET, MONGODB_URI, and Atlas network access.",
  );
  logDatabaseError("Auth Service", "startup failed", error);
  try {
    await closeDatabase();
  } catch (closeError) {
    console.error("Auth Service database shutdown failed:", closeError.name);
  }
  process.exitCode = 1;
}
