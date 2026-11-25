import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { GoldRate, GoldRateHistory } from "./models/gold-rate.js";
import { validateRateUpdates } from "./rate-validation.js";
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

const purities = [24, 22, 21];
const asyncHandler = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);

function ownerOnly(req, res, next) {
  const h = req.headers.authorization || "";
  const t = h.startsWith("Bearer ") ? h.slice(7) : "";
  try {
    const p = jwt.verify(t, process.env.JWT_SECRET, {
      issuer: "amir-jewellers-auth",
    });
    if (p.role !== "owner")
      return res.status(403).json({ message: "Owner access required." });
    req.admin = p;
    next();
  } catch {
    return res.status(401).json({ message: "Valid owner login is required." });
  }
}

function formatRate(rate) {
  return {
    purityKarat: rate.purityKarat,
    ratePerTola: rate.ratePerTola,
    ratePerGram: rate.ratePerGram,
    currency: rate.currency || "PKR",
    ...(rate.updatedBy ? { updatedBy: rate.updatedBy } : {}),
    updatedAt: rate.updatedAt ? new Date(rate.updatedAt).toISOString() : null,
  };
}

function formatHistory(entry) {
  return {
    purityKarat: entry.purityKarat,
    previousRatePerTola: entry.previousRatePerTola,
    newRatePerTola: entry.newRatePerTola,
    previousRatePerGram: entry.previousRatePerGram,
    newRatePerGram: entry.newRatePerGram,
    updatedBy: entry.updatedBy,
    updatedAt: new Date(entry.updatedAt).toISOString(),
  };
}

app.get("/health", (_req, res) => {
  const status = mongoose.connection.readyState === 1 ? "ok" : "unavailable";
  res.status(status === "ok" ? 200 : 503).json({
    service: "gold-rate-service",
    status,
  });
});

app.get(
  "/gold-rates",
  asyncHandler(async (_req, res) => {
    const storedRates = await GoldRate.find().lean();
    const byPurity = new Map(
      storedRates.map((rate) => [rate.purityKarat, formatRate(rate)]),
    );
    const rates = purities.map(
      (purityKarat) =>
        byPurity.get(purityKarat) || {
          purityKarat,
          ratePerTola: 0,
          ratePerGram: 0,
          currency: "PKR",
          updatedAt: null,
        },
    );
    res.json({ rates, tolaInGrams: 11.6638 });
  }),
);

app.get(
  "/gold-rates/history",
  asyncHandler(async (_req, res) => {
    const history = await GoldRateHistory.find()
      .sort({ updatedAt: -1, _id: -1 })
      .lean();
    res.json({ history: history.map(formatHistory) });
  }),
);

app.put(
  "/gold-rates",
  ownerOnly,
  asyncHandler(async (req, res) => {
    const { updates, error } = validateRateUpdates(req.body);
    if (error) return res.status(400).json({ message: error });
    const now = new Date();
    await mongoose.connection.transaction(async (session) => {
      for (const update of updates) {
        const existing = await GoldRate.findOne({
          purityKarat: update.purityKarat,
        })
          .session(session)
          .lean();

        if (existing?.updatedAt) {
          await GoldRateHistory.create(
            [
              {
                purityKarat: update.purityKarat,
                previousRatePerTola: existing.ratePerTola,
                newRatePerTola: update.ratePerTola,
                previousRatePerGram: existing.ratePerGram,
                newRatePerGram: update.ratePerGram,
                updatedBy: req.admin.sub,
                updatedAt: now,
              },
            ],
            { session },
          );
        }

        await GoldRate.findOneAndUpdate(
          { purityKarat: update.purityKarat },
          {
            $set: {
              ...update,
              currency: "PKR",
              updatedBy: req.admin.sub,
              updatedAt: now,
            },
          },
          { upsert: true, new: true, runValidators: true, session },
        );
      }
    });

    const rates = await GoldRate.find().lean();
    const byPurity = new Map(
      rates.map((rate) => [rate.purityKarat, formatRate(rate)]),
    );
    res.json({
      message: "Gold rates updated.",
      rates: purities.map(
        (purityKarat) =>
          byPurity.get(purityKarat) || {
            purityKarat,
            ratePerTola: 0,
            ratePerGram: 0,
            currency: "PKR",
            updatedAt: null,
          },
      ),
    });
  }),
);

app.use(serviceErrorHandler("Gold Rate Service"));

if (process.env.NODE_ENV !== "production") {
  const port = Number(process.env.PORT || 5003);
  app.listen(port, () => console.log(`Gold Rate Service running on port ${port}`));
}

export default app;
