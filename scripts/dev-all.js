import { spawn } from "node:child_process";
import net from "node:net";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const startupTimeoutMs = 45000;
const healthPollIntervalMs = 500;
const frontendDirectory = path.join(projectRoot, "frontend");

const services = [
  {
    name: "auth",
    port: 5001,
    healthUrl: "http://127.0.0.1:5001/health",
    command: process.execPath,
    args: ["src/server.js"],
    cwd: path.join(projectRoot, "services", "auth-service"),
  },
  {
    name: "products",
    port: 5002,
    healthUrl: "http://127.0.0.1:5002/health",
    command: process.execPath,
    args: ["src/server.js"],
    cwd: path.join(projectRoot, "services", "product-service"),
  },
  {
    name: "rates",
    port: 5003,
    healthUrl: "http://127.0.0.1:5003/health",
    command: process.execPath,
    args: ["src/server.js"],
    cwd: path.join(projectRoot, "services", "gold-rate-service"),
  },
  {
    name: "gateway",
    port: 5000,
    healthUrl: "http://127.0.0.1:5000/health",
    command: process.execPath,
    args: ["src/server.js"],
    cwd: path.join(projectRoot, "api-gateway"),
  },
  {
    name: "frontend",
    port: 5173,
    healthUrl: "http://127.0.0.1:5173/",
    command: process.execPath,
    args: [path.join(frontendDirectory, "node_modules", "vite", "bin", "vite.js"), "--host", "0.0.0.0"],
    cwd: frontendDirectory,
  },
];

const children = [];
let shuttingDown = false;

function portIsInUse(port) {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host: "127.0.0.1", port });
    socket.setTimeout(1000);
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("timeout", () => {
      socket.destroy();
      reject(new Error(`Timed out checking port ${port}.`));
    });
    socket.once("error", (error) => {
      socket.destroy();
      if (error.code === "ECONNREFUSED" || error.code === "EHOSTUNREACH") {
        resolve(false);
        return;
      }
      reject(error);
    });
  });
}

async function waitForHealth(service, child) {
  const deadline = Date.now() + startupTimeoutMs;
  let lastHealthResult = "no response";
  while (Date.now() < deadline) {
    if (shuttingDown)
      throw new Error(`Startup cancelled while waiting for ${service.name}.`);
    if (child.exitCode !== null || child.signalCode !== null)
      throw new Error(`${service.name} stopped before becoming healthy.`);

    try {
      const response = await fetch(service.healthUrl, {
        signal: AbortSignal.timeout(1500),
      });
      if (response.ok) {
        console.log(`${service.name} is ready.`);
        return;
      }
      lastHealthResult = `HTTP ${response.status}`;
    } catch (error) {
      lastHealthResult = error.name || "connection unavailable";
    }

    await new Promise((resolve) =>
      setTimeout(resolve, healthPollIntervalMs),
    );
  }
  throw new Error(
    `${service.name} did not become healthy within ${startupTimeoutMs / 1000} seconds (last health result: ${lastHealthResult}). Check the service startup and database diagnostics above.`,
  );
}

function stopAll(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  if (signal) {
    process.exitCode = signal === "SIGINT" ? 130 : 143;
    console.log(`Stopping all services after ${signal}.`);
  }
  for (const child of children) {
    if (child.exitCode === null && child.signalCode === null && !child.killed) {
      child.kill("SIGTERM");
    }
  }
}

process.once("SIGINT", () => stopAll("SIGINT"));
process.once("SIGTERM", () => stopAll("SIGTERM"));

function startService(service) {
  const child = spawn(service.command, service.args, {
    cwd: service.cwd,
    stdio: "inherit",
    env: process.env,
  });

  child.on("exit", (code, signal) => {
    if (shuttingDown) return;
    const reason = signal ? `signal ${signal}` : `exit code ${code}`;
    console.error(`${service.name} stopped unexpectedly (${reason}).`);
    process.exitCode = 1;
    stopAll();
  });

  child.on("error", (error) => {
    console.error(`Could not start ${service.name}:`, error.message);
    process.exitCode = 1;
    stopAll();
  });

  children.push(child);
  return child;
}

async function main() {
  for (const service of services) {
    if (await portIsInUse(service.port)) {
      throw new Error(
        `Port ${service.port} is already in use. Stop the existing AMIR JEWELLERS process before running dev:all.`,
      );
    }
  }

  console.log("Starting AMIR JEWELLERS services after each dependency is healthy...\n");
  for (const service of services) {
    if (shuttingDown) break;
    const child = startService(service);
    await waitForHealth(service, child);
  }
}

main().catch((error) => {
  console.error("Failed to start services:", error);
  process.exitCode = 1;
  stopAll();
});
