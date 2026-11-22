import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import { createProxyMiddleware } from "http-proxy-middleware";

const app = express();
const authTarget = process.env.AUTH_SERVICE_URL || "http://localhost:5001";
const productTarget = process.env.PRODUCT_SERVICE_URL || "http://localhost:5002";
const goldRateTarget = process.env.GOLD_RATE_SERVICE_URL || "http://localhost:5003";
const dependencies = {
  auth: authTarget,
  products: productTarget,
  goldRates: goldRateTarget,
};

async function checkDependency(target) {
  try {
    const response = await fetch(`${target.replace(/\/+$/, "")}/health`, {
      signal: AbortSignal.timeout(2000),
    });
    return response.ok ? "ok" : "unavailable";
  } catch {
    return "unavailable";
  }
}

app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_ORIGIN || "http://localhost:5173" }));
app.use(morgan("dev"));
app.use(
  rateLimit({
    windowMs: 60000,
    limit: 180,
    standardHeaders: "draft-7",
    legacyHeaders: false,
  }),
);

app.get("/health", async (_req, res) => {
  const checks = await Promise.all(
    Object.entries(dependencies).map(async ([name, target]) => [
      name,
      await checkDependency(target),
    ]),
  );
  const dependencyStatus = Object.fromEntries(checks);
  const status = Object.values(dependencyStatus).every(
    (dependency) => dependency === "ok",
  )
    ? "ok"
    : "unavailable";

  res.status(status === "ok" ? 200 : 503).json({
    service: "api-gateway",
    status,
    dependencies: dependencyStatus,
  });
});

app.use(
  "/api/auth",
  createProxyMiddleware({
    target: authTarget,
    changeOrigin: true,
    on: {
    error: (error, _req, res) => {
      console.error("API Gateway auth proxy failed:", {
        name: error.name || "Error",
        code: error.code,
      });
      if (!res.headersSent) {
        res.status(503).json({ message: "Auth service temporarily unavailable." });
        }
      },
    },
  }),
);

app.use(
  "/api/products",
  createProxyMiddleware({
    target: productTarget,
    changeOrigin: true,
    on: {
      error: (error, _req, res) => {
        console.error("API Gateway product proxy failed:", {
          name: error.name || "Error",
          code: error.code,
        });
        if (!res.headersSent) {
          res.status(503).json({ message: "Product service temporarily unavailable." });
        }
      },
    },
  }),
);

app.use(
  "/api/gold-rates",
  createProxyMiddleware({
    target: goldRateTarget,
    changeOrigin: true,
    pathRewrite: (path) => `/gold-rates${path === "/" ? "" : path}`,
    on: {
      error: (error, _req, res) => {
        console.error("API Gateway gold-rate proxy failed:", {
          name: error.name || "Error",
          code: error.code,
        });
        if (!res.headersSent) {
          res.status(503).json({ message: "Gold rate service temporarily unavailable." });
        }
      },
    },
  }),
);

app.use((_req, res) => res.status(404).json({ message: "Gateway route not found." }));

const port = Number(process.env.PORT || 5000);
const startServer = (serverPort) => {
  const onListening = () =>
    console.log(`API Gateway running on port ${serverPort}`);
  const server = process.env.HOST
    ? app.listen(serverPort, process.env.HOST, onListening)
    : app.listen(serverPort, onListening);

  server.on("error", (error) => {
    if (error.code === "EADDRINUSE") {
      console.error(
        `API Gateway failed to start: port ${serverPort} is already in use. Stop the existing process or set a different PORT in .env.`,
      );
      process.exit(1);
    }

    console.error("API Gateway failed to start:", error);
    process.exit(1);
  });
};

startServer(port);
