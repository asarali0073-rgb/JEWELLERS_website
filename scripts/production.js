import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const startupTimeoutMs = 90000;
const healthPollIntervalMs = 500;
const shutdownTimeoutMs = 10000;
const services = [
  {
    name: "auth",
    port: 5001,
    healthService: "auth-service",
    directory: "services/auth-service",
  },
  {
    name: "gold rates",
    port: 5003,
    healthService: "gold-rate-service",
    directory: "services/gold-rate-service",
  },
  {
    name: "products",
    port: 5002,
    healthService: "product-service",
    directory: "services/product-service",
  },
  {
    name: "gateway",
    port: null,
    healthService: "api-gateway",
    directory: "api-gateway",
  },
];

const children = [];
let shuttingDown = false;

function requiredEnvironment(keys) {
  const missing = keys.filter((key) => !process.env[key]?.trim());
  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }
}

function getGatewayPort() {
  const port = Number(process.env.PORT || 5000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("PORT must be a valid TCP port.");
  }
  return port;
}

function serviceEnvironment(service, gatewayPort) {
  const environment = { ...process.env };
  for (const key of [
    "AUTH_MONGODB_URI",
    "PRODUCT_MONGODB_URI",
    "GOLD_RATE_MONGODB_URI",
    "MONGODB_URI",
    "OWNER_EMAIL",
    "OWNER_PASSWORD",
  ]) {
    delete environment[key];
  }

  const shared = {
    ...environment,
    NODE_ENV: "production",
    HOST: "0.0.0.0",
    FRONTEND_ORIGIN: process.env.FRONTEND_ORIGIN,
    JWT_SECRET: process.env.JWT_SECRET,
  };

  if (service.name === "auth") {
    return {
      ...shared,
      PORT: String(service.port),
      MONGODB_URI: process.env.AUTH_MONGODB_URI,
      OWNER_EMAIL: process.env.OWNER_EMAIL,
      OWNER_PASSWORD: process.env.OWNER_PASSWORD,
    };
  }

  if (service.name === "products") {
    return {
      ...shared,
      PORT: String(service.port),
      MONGODB_URI: process.env.PRODUCT_MONGODB_URI,
      GOLD_RATE_SERVICE_URL: "http://127.0.0.1:5003",
    };
  }

  if (service.name === "gold rates") {
    return {
      ...shared,
      PORT: String(service.port),
      MONGODB_URI: process.env.GOLD_RATE_MONGODB_URI,
    };
  }

  return {
    ...shared,
    PORT: String(gatewayPort),
    AUTH_SERVICE_URL: "http://127.0.0.1:5001",
    PRODUCT_SERVICE_URL: "http://127.0.0.1:5002",
    GOLD_RATE_SERVICE_URL: "http://127.0.0.1:5003",
  };
}

function stopAll(exitCode) {
  if (shuttingDown) {
    if (exitCode !== 0) process.exitCode = exitCode;
    return;
  }
  shuttingDown = true;
  process.exitCode = exitCode;

  for (const child of children) {
    if (child.exitCode === null && child.signalCode === null && !child.killed) {
      child.kill("SIGTERM");
    }
  }

  const forceTimer = setTimeout(() => {
    for (const child of children) {
      if (child.exitCode === null && child.signalCode === null) {
        child.kill("SIGKILL");
      }
    }
  }, shutdownTimeoutMs);
  forceTimer.unref();
}

process.once("SIGINT", () => stopAll(0));
process.once("SIGTERM", () => stopAll(0));

function startService(service, gatewayPort) {
  const child = spawn(process.execPath, ["src/server.js"], {
    cwd: path.join(projectRoot, service.directory),
    env: serviceEnvironment(service, gatewayPort),
    stdio: "inherit",
  });

  child.once("error", (error) => {
    console.error(`Could not start ${service.name}:`, error.message);
    stopAll(1);
  });
  child.once("exit", (code, signal) => {
    if (shuttingDown) return;
    const reason = signal ? `signal ${signal}` : `exit code ${code}`;
    console.error(`${service.name} stopped unexpectedly (${reason}).`);
    stopAll(1);
  });

  children.push(child);
  return child;
}

async function waitForHealth(service, child) {
  const port = service.port || getGatewayPort();
  const healthUrl = `http://127.0.0.1:${port}/health`;
  const deadline = Date.now() + startupTimeoutMs;
  let lastHealthResult = "no response";

  while (Date.now() < deadline) {
    if (shuttingDown) throw new Error("Startup cancelled during shutdown.");
    if (child.exitCode !== null || child.signalCode !== null) {
      throw new Error(`${service.name} stopped before becoming healthy.`);
    }

    try {
      const response = await fetch(healthUrl, {
        signal: AbortSignal.timeout(3000),
      });
      if (response.ok) {
        const health = await response.json();
        if (health.service === service.healthService && health.status === "ok") {
          console.log(`${service.name} is healthy.`);
          return;
        }
        lastHealthResult = "health response did not report service status ok";
      } else {
        lastHealthResult = `HTTP ${response.status}`;
      }
    } catch (error) {
      lastHealthResult = error.name || "connection unavailable";
    }

    await new Promise((resolve) => setTimeout(resolve, healthPollIntervalMs));
  }

  throw new Error(
    `${service.name} did not become healthy within ${startupTimeoutMs / 1000} seconds (last result: ${lastHealthResult}).`,
  );
}

async function main() {
  requiredEnvironment([
    "AUTH_MONGODB_URI",
    "PRODUCT_MONGODB_URI",
    "GOLD_RATE_MONGODB_URI",
    "JWT_SECRET",
    "OWNER_EMAIL",
    "OWNER_PASSWORD",
    "FRONTEND_ORIGIN",
  ]);
  const gatewayPort = getGatewayPort();

  console.log("Starting backend services after each dependency is healthy...\n");
  for (const service of services) {
    if (shuttingDown) return;
    const child = startService(service, gatewayPort);
    await waitForHealth(service, child);
  }
}

main().catch((error) => {
  if (shuttingDown) return;
  console.error("Failed to start production services:", error.message);
  stopAll(1);
});
