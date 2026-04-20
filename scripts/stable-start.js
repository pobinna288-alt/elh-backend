"use strict";

const { spawn } = require("child_process");
const path = require("path");

const PROJECT_ROOT = path.resolve(__dirname, "..");
const SERVER_ENTRY = path.join(PROJECT_ROOT, "server.js");
const BASE_RESTART_DELAY_MS = 1000;
const MAX_RESTART_DELAY_MS = 10000;

let backendProcess = null;
let isShuttingDown = false;
let restartCount = 0;

function computeRestartDelay() {
  return Math.min(BASE_RESTART_DELAY_MS * Math.max(restartCount, 1), MAX_RESTART_DELAY_MS);
}

function startBackend() {
  console.log("🚀 Supervisor starting backend process...");

  backendProcess = spawn(process.execPath, [SERVER_ENTRY], {
    cwd: PROJECT_ROOT,
    env: process.env,
    stdio: "inherit",
  });

  backendProcess.on("error", (error) => {
    if (isShuttingDown) {
      return;
    }

    restartCount += 1;
    const restartDelay = computeRestartDelay();
    console.error("❌ Supervisor failed to launch backend:", error);
    console.error(`🔁 Retrying backend startup in ${restartDelay}ms...`);
    setTimeout(startBackend, restartDelay);
  });

  backendProcess.on("exit", (code, signal) => {
    const exitCode = Number.isInteger(code) ? code : null;

    if (isShuttingDown) {
      console.log("🛑 Supervisor shutdown complete.");
      process.exit(exitCode ?? 0);
      return;
    }

    const gracefulSignal = signal === "SIGINT" || signal === "SIGTERM";
    if (exitCode === 0 || gracefulSignal) {
      console.log("✅ Backend process exited gracefully.");
      process.exit(exitCode ?? 0);
      return;
    }

    restartCount += 1;
    const restartDelay = computeRestartDelay();
    console.error(`❌ Backend exited unexpectedly (code=${exitCode}, signal=${signal || "none"}).`);
    console.error(`🔁 Restarting backend in ${restartDelay}ms...`);
    setTimeout(startBackend, restartDelay);
  });
}

function shutdownSupervisor(signalName) {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  console.log(`🛑 Supervisor received ${signalName}. Stopping backend...`);

  if (backendProcess && !backendProcess.killed) {
    backendProcess.kill(signalName);
  } else {
    process.exit(0);
  }
}

process.on("SIGINT", () => shutdownSupervisor("SIGINT"));
process.on("SIGTERM", () => shutdownSupervisor("SIGTERM"));

startBackend();
