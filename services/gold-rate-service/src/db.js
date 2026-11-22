import mongoose from "mongoose";
import { GoldRate } from "./models/gold-rate.js";
import { logDatabaseError } from "../../common/database-diagnostics.js";

const databaseName = "amir_gold_rates";

export async function connectDatabase() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is required.");
  if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET is required.");

  mongoose.connection.on("disconnected", () => {
    console.error("Gold Rate Service MongoDB connection was lost.");
  });
  mongoose.connection.on("error", (error) => {
    logDatabaseError("Gold Rate Service", "MongoDB connection error", error);
  });

  await mongoose.connect(uri, {
    dbName: databaseName,
    serverSelectionTimeoutMS: 10000,
  });
  await GoldRate.init();
  console.log(`Connected to MongoDB database "${databaseName}".`);
}

export async function closeDatabase() {
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
}
