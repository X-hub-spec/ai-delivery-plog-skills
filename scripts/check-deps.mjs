#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";

const checks = [];

function add(name, ok, detail, fix = "") {
  checks.push({ name, ok, detail, fix });
}

function commandOk(cmd, args = ["--version"]) {
  try {
    return execFileSync(cmd, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  } catch {
    return "";
  }
}

const nodeVersion = commandOk("node");
const major = Number(nodeVersion.match(/^v(\d+)/)?.[1] || 0);
add("Node.js", major >= 18, nodeVersion || "not found", "Install Node.js 18+ from https://nodejs.org/");

const chromeCandidates = [
  process.env.CHROME_PATH,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser"
].filter(Boolean);
const chromePath = chromeCandidates.find((candidate) => existsSync(candidate));
add("Chrome/Edge", Boolean(chromePath), chromePath || "not found", "Install Google Chrome or set CHROME_PATH=/path/to/chrome.");

const larkCli = commandOk("lark-cli", ["--version"]);
add("lark-cli", Boolean(larkCli), larkCli || "not found", "Install/configure lark-cli when using Feishu/Lark URLs.");

const failed = checks.filter((check) => !check.ok);
for (const check of checks) {
  console.log(`${check.ok ? "✓" : "✗"} ${check.name}: ${check.detail}`);
  if (!check.ok && check.fix) console.log(`  fix: ${check.fix}`);
}

if (failed.length) {
  console.error(`\n${failed.length} required/recommended dependency check(s) failed.`);
  process.exit(failed.some((check) => check.name !== "lark-cli") ? 1 : 0);
}

console.log("\nAll required dependencies are ready.");
