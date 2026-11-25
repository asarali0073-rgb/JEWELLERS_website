import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import jwt from "jsonwebtoken";
import multer from "multer";
import mongoose from "mongoose";
import { Product } from "./models/product.js";
import {
  ImageUploadError,
  imageStaticMiddleware,
  imageUpload,
  saveUploadedImage,
  validateImageFile,
} from "./image-upload.js";
import {
  completeProductFilter,
  productFields,
  validateProduct,
} from "./product-validation.js";
import { connectDatabase } from "./db.js";
import { serviceErrorHandler } from "../../common/error-handler.js";

const envPath = fileURLToPath(new URL("../.env", import.meta.url));
if (existsSync(envPath)) dotenv.config({ path: envPath });
const uploadDirectory = fileURLToPath(new URL("../uploads", import.meta.url));

const app = express();
app.use(helmet());
if (process.env.NODE_ENV !== "production") app.use(cors());
app.use(express.json({ limit: "1mb" }));
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

async function rates() {
  try {
    const response = await fetch(
      `${(process.env.GOLD_RATE_URL || process.env.GOLD_RATE_SERVICE_URL || "http://localhost:5003").replace(/\/+$/, "")}/gold-rates`,
      { signal: AbortSignal.timeout(3000) },
    );
    if (!response.ok) {
      console.warn(
        "Gold Rate Service returned an error; product estimates may use zero rates.",
      );
      return [];
    }
    return (await response.json()).rates || [];
  } catch {
    console.warn(
      "Gold Rate Service is unavailable; product estimates may use zero rates.",
    );
    return [];
  }
}

async function estimate(product, rateList) {
  const rate = rateList.find(
    (item) => Number(item.purityKarat) === Number(product.purityKarat),
  );
  return {
    ...product,
    estimatedPrice: Math.round(
      Number(product.weightGrams) * Number(rate?.ratePerGram || 0) +
        Number(product.makingCharges),
    ),
    rateUpdatedAt: rate?.updatedAt || null,
  };
}

app.get("/health", (_req, res) => {
  const status = mongoose.connection.readyState === 1 ? "ok" : "unavailable";
  res.status(status === "ok" ? 200 : 503).json({
    service: "product-service",
    status,
  });
});

app.use(
  "/uploads",
  imageStaticMiddleware(uploadDirectory),
  (error, _req, res, next) => {
    if (error.status === 404) {
      res.status(404).json({ message: "Image not found." });
      return;
    }
    next(error);
  },
);

app.post(
  "/upload",
  ownerOnly,
  imageUpload.single("image"),
  asyncHandler(async (req, res) => {
    if (!req.file)
      return res.status(400).json({ message: "Choose an image to upload." });
    validateImageFile(req.file);
    const filename = await saveUploadedImage(req.file, uploadDirectory);
    res.status(201).json({ url: `/api/products/uploads/${filename}` });
  }),
);

app.get(
  "/",
  asyncHandler(async (req, res) => {
    const filter = completeProductFilter();
    if (req.query.category && req.query.category !== "All")
      filter.category = req.query.category;
    if (req.query.search) {
      const escapedSearch = String(req.query.search).replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&",
      );
      filter.$or = [
        { name: { $regex: escapedSearch, $options: "i" } },
        { description: { $regex: escapedSearch, $options: "i" } },
        { category: { $regex: escapedSearch, $options: "i" } },
      ];
    }
    if (req.query.available === "true") filter.isAvailable = true;

    const products = await Product.find(filter).sort({ createdAt: -1 }).lean();
    const rateList = await rates();
    res.json({
      products: await Promise.all(
        products.map((product) => estimate(product, rateList)),
      ),
      count: products.length,
    });
  }),
);

app.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const product = await Product.findById(req.params.id).lean();
    if (!product || validateProduct(product))
      return res.status(404).json({ message: "Product not found." });
    res.json({ product: await estimate(product, await rates()) });
  }),
);

app.post(
  "/",
  ownerOnly,
  asyncHandler(async (req, res) => {
    const body = req.body;
    const error = validateProduct(body);
    if (error) return res.status(400).json({ message: error });
    const product = await Product.create(productFields(body));
    res
      .status(201)
      .json({ product: await estimate(product.toObject(), await rates()) });
  }),
);

app.put(
  "/:id",
  ownerOnly,
  asyncHandler(async (req, res) => {
    const existing = await Product.findById(req.params.id).lean();
    if (!existing || validateProduct(existing))
      return res.status(404).json({ message: "Product not found." });
    if (
      req.body !== undefined &&
      (!req.body || typeof req.body !== "object" || Array.isArray(req.body))
    )
      return res.status(400).json({ message: "Product details must be a JSON object." });
    const body = { ...existing, ...(req.body || {}) };
    const error = validateProduct(body);
    if (error) return res.status(400).json({ message: error });

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { $set: productFields(body) },
      { new: true, runValidators: true },
    ).lean();
    res.json({ product: await estimate(product, await rates()) });
  }),
);

app.delete(
  "/:id",
  ownerOnly,
  asyncHandler(async (req, res) => {
    const existing = await Product.findById(req.params.id).lean();
    if (!existing || validateProduct(existing))
      return res.status(404).json({ message: "Product not found." });
    await Product.findByIdAndDelete(req.params.id);
    res.json({ message: "Product deleted." });
  }),
);

app.use(
  serviceErrorHandler("Product Service", (error, res) => {
    if (error instanceof ImageUploadError) {
      res.status(error.statusCode).json({ message: error.message });
      return true;
    }
    if (error instanceof multer.MulterError) {
      const status = error.code === "LIMIT_FILE_SIZE" ? 413 : 400;
      res.status(status).json({
        message:
          status === 413
            ? "Image must be 5 MB or smaller."
            : "Upload one JPG, PNG, or WEBP image at a time.",
      });
      return true;
    }
    return false;
  }),
);

if (process.env.NODE_ENV !== "production") {
  const port = Number(process.env.PORT || 5002);
  app.listen(port, () => console.log(`Product Service running on port ${port}`));
}

export default app;
