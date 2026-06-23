#!/usr/bin/env node
import { execFile } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

function chromePath() {
  const candidates = [
    process.env.CHROME_PATH,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "google-chrome",
    "chromium",
    "chromium-browser"
  ].filter(Boolean);
  for (const candidate of candidates) {
    try {
      if (candidate.includes("/") && !statSync(candidate).isFile()) continue;
      return candidate;
    } catch {
      if (!candidate.includes("/")) return candidate;
    }
  }
  return "";
}

function runChrome(bin, args) {
  return new Promise((resolve, reject) => {
    execFile(bin, args, { timeout: 45000 }, (error, stdout, stderr) => {
      if (error) {
        error.message = `${error.message}\n${stderr || stdout || ""}`;
        reject(error);
        return;
      }
      resolve();
    });
  });
}

const input = path.resolve(arg("input", "index.html"));
const outDir = path.resolve(arg("out", "exports/cards/png"));
const prefix = arg("prefix", "card");
const selector = arg("selector", ".page-frame");
const width = Number(arg("width", "1080"));
const height = Number(arg("height", "1440"));
const chrome = arg("chrome", chromePath());

if (!chrome) {
  console.error("Missing Chrome/Edge. Install Google Chrome or set CHROME_PATH=/path/to/chrome.");
  process.exit(1);
}

mkdirSync(outDir, { recursive: true });

const sourceHtml = readFileSync(input, "utf8");
const workDir = path.join(outDir, "..");
const exportHtml = path.join(workDir, "export-single.html");
const baseHref = pathToFileURL(path.dirname(input) + path.sep).href;

const exportCss = `
<base href="${baseHref}">
<style id="real-browser-export-overrides">
html,body{width:${width}px!important;height:${height}px!important;margin:0!important;padding:0!important;overflow:hidden!important;background:#fff!important}
.toolbar{display:none!important}
.board{display:block!important;width:${width}px!important;height:${height}px!important;margin:0!important;padding:0!important}
${selector}{display:none!important;width:${width}px!important;height:${height}px!important;margin:0!important;padding:0!important}
${selector}.export-active{display:block!important}
.sheet{width:${width}px!important;height:${height}px!important;transform:none!important;border-radius:0!important;border:0!important;box-shadow:none!important}
.image-control{display:none!important}
</style>`;

const exportScript = `
<script id="real-browser-export-script">
window.addEventListener("load", function () {
  var page=Math.max(1,parseInt(new URLSearchParams(location.search).get("page")||"1",10));
  var frames=Array.prototype.slice.call(document.querySelectorAll(${JSON.stringify(selector)}));
  frames.forEach(function(f,i){f.classList.toggle("export-active",i===page-1);});
});
</script>`;

writeFileSync(
  exportHtml,
  sourceHtml.replace("<head>", `<head>${exportCss}`).replace("</body>", `${exportScript}</body>`),
  "utf8"
);

const countHtml = path.join(workDir, "count.html");
writeFileSync(countHtml, sourceHtml, "utf8");

const count = (sourceHtml.match(new RegExp(`<[^>]+class=["'][^"']*${selector.replace(".", "")}`, "g")) || []).length ||
  (sourceHtml.match(/class=["'][^"']*page-frame/g) || []).length;

const reports = [];
for (let i = 1; i <= count; i += 1) {
  const file = path.join(outDir, `${prefix}-${String(i).padStart(2, "0")}.png`);
  await runChrome(chrome, [
    "--headless=new",
    "--disable-gpu",
    "--hide-scrollbars",
    "--force-device-scale-factor=1",
    `--window-size=${width},${height}`,
    "--virtual-time-budget=2500",
    `--screenshot=${file}`,
    `${pathToFileURL(exportHtml).href}?page=${i}`
  ]);
  reports.push({ page: i, file, width, height });
}

try { rmSync(countHtml, { force: true }); } catch {}
writeFileSync(path.join(workDir, "export-report.json"), JSON.stringify(reports, null, 2), "utf8");
console.log(JSON.stringify({ outDir, pages: reports.length, width, height, chrome }, null, 2));
