import { spawn } from "node:child_process";
import process from "node:process";

const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "--hostname", "127.0.0.1"], {
  stdio: ["ignore", "pipe", "pipe"],
  detached: process.platform !== "win32",
});

let serverLog = "";
server.stdout.on("data", (chunk) => { serverLog += String(chunk); });
server.stderr.on("data", (chunk) => { serverLog += String(chunk); });

async function waitForServer() {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) throw new Error(`Next.js exited before it was ready.\n${serverLog}`);
    try {
      const response = await fetch("http://127.0.0.1:3000");
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Timed out waiting for Next.js.\n${serverLog}`);
}

async function stopServer() {
  if (server.exitCode !== null) return;
  if (process.platform === "win32") {
    await new Promise((resolve) => {
      const cleanup = spawn("taskkill", ["/pid", String(server.pid), "/T", "/F"], { stdio: "ignore" });
      cleanup.on("exit", resolve);
      cleanup.on("error", resolve);
    });
  } else {
    try { process.kill(-server.pid, "SIGTERM"); } catch {}
  }
}

let exitCode = 1;
try {
  await waitForServer();
  exitCode = await new Promise((resolve, reject) => {
    const tests = spawn(process.execPath, ["node_modules/@playwright/test/cli.js", "test"], {
      stdio: "inherit",
      env: { ...process.env, HEATSHIFT_E2E_EXTERNAL_SERVER: "1" },
    });
    tests.on("exit", (code) => resolve(code ?? 1));
    tests.on("error", reject);
  });
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
} finally {
  await stopServer();
}
process.exit(exitCode);
