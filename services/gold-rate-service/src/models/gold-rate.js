import mongoose from "mongoose";

const goldRateSchema = new mongoose.Schema(
  {
    purityKarat: { type: Number, required: true, enum: [21, 22, 24], unique: true },
    ratePerTola: { type: Number, required: true, min: 0 },
    ratePerGram: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "PKR" },
    updatedBy: { type: String },
    updatedAt: { type: Date, default: null },
  },
  { versionKey: false },
);

const goldRateHistorySchema = new mongoose.Schema(
  {
    purityKarat: { type: Number, required: true, enum: [21, 22, 24] },
    previousRatePerTola: { type: Number, required: true, min: 0 },
    newRatePerTola: { type: Number, required: true, min: 0 },
    previousRatePerGram: { type: Number, required: true, min: 0 },
    newRatePerGram: { type: Number, required: true, min: 0 },
    updatedBy: { type: String, required: true },
    updatedAt: { type: Date, required: true },
  },
  { versionKey: false },
);

export const GoldRate =
  mongoose.models.GoldRate ||
  mongoose.model("GoldRate", goldRateSchema, "rates");
export const GoldRateHistory =
  mongoose.models.GoldRateHistory ||
  mongoose.model("GoldRateHistory", goldRateHistorySchema, "rate_history");
