import mongoose from "mongoose";
import { logDatabaseError } from "../../common/database-diagnostics.js";

const databaseName = "amir_products";
const connectionCache =
  globalThis.__productDatabaseConnection ||
  (globalThis.__productDatabaseConnection = { promise: null, listenersRegistered: false });

export async function connectDatabase() {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error("MONGO_URI is required.");
  if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET is required.");

  if (!connectionCache.listenersRegistered) {
    mongoose.connection.on("disconnected", () => {
      connectionCache.promise = null;
      console.error("Product Service MongoDB connection was lost.");
    });
    mongoose.connection.on("error", (error) => {
      logDatabaseError("Product Service", "MongoDB connection error", error);
    });
    connectionCache.listenersRegistered = true;
  }

  if (mongoose.connection.readyState !== 1) {
    connectionCache.promise ??= mongoose
      .connect(uri, {
        dbName: databaseName,
        serverSelectionTimeoutMS: 10000,
      })
      .catch((error) => {
        connectionCache.promise = null;
        throw error;
      });
    await connectionCache.promise;
    if (!connectionCache.connectedLogged) {
      console.log(`Connected to MongoDB database "${databaseName}".`);
      connectionCache.connectedLogged = true;
    }
  }
}

export async function closeDatabase() {
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
  connectionCache.promise = null;
  connectionCache.connectedLogged = false;
}
