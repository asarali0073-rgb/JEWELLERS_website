import { randomUUID } from "node:crypto";
import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    _id: { type: String, default: randomUUID },
    name: { type: String, required: true, trim: true },
    category: {
      type: String,
      required: true,
      enum: ["Set", "Ring", "Necklace", "Earrings", "Bangles", "Bridal Set"],
    },
    description: { type: String, required: true, trim: true },
    images: { type: [String], default: [] },
    purityKarat: { type: Number, required: true, enum: [21, 22, 24] },
    weightGrams: { type: Number, required: true, min: 0 },
    makingCharges: { type: Number, required: true, min: 0 },
    isAvailable: { type: Boolean, default: true },
  },
  { timestamps: true, versionKey: false },
);

export const Product =
  mongoose.models.Product || mongoose.model("Product", productSchema);
