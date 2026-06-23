#!/usr/bin/env node
import { createServer } from "node:http";
import { createReadStream } from "node:fs";
import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { statSync } from "node:fs";
import path from "node:path";

const root = path.resolve(process.cwd());
const port = Number(process.env.PORT || 8765);
const jobsDir = path.join(root, ".plog-export-jobs");

const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml; charset=utf-8"
};

function send(res, status, body, type = "text/plain; charset=utf-8") {
  res.writeHead(status, { "content-type": type, "cache-control": "no-store" });
  res.end(body);
}

function body(req) {
  return new Promise((resolve, reject) => {
    let text = "";
    req.setEncoding("utf8");
    req.on("data", (chunk) => {
      text += chunk;
      if (text.length > 8_000_000) reject(new Error("request body too large"));
    });
    req.on("end", () => resolve(text));
    req.on("error", reject);
  });
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

function execChrome(args) {
  const chrome = chromePath();
  if (!chrome) {
    return Promise.reject(new Error("Missing Chrome/Edge. Install Google Chrome or set CHROME_PATH=/path/to/chrome."));
  }
  return new Promise((resolve, reject) => {
    execFile(chrome, args, { timeout: 45000 }, (error, stdout, stderr) => {
      if (error) {
        error.message = `${error.message}\n${stderr || stdout || ""}`;
        reject(error);
        return;
      }
      resolve();
    });
  });
}

function exportHtml(html, pageIndex) {
  const css = `
<style id="real-browser-export-style">
html,body{width:1080px!important;height:1440px!important;margin:0!important;padding:0!important;overflow:hidden!important;background:#fff!important}
.toolbar{display:none!important}
.board{display:block!important;width:1080px!important;height:1440px!important;margin:0!important;padding:0!important}
.page-frame{display:none!important;width:1080px!important;height:1440px!important;margin:0!important;padding:0!important}
.page-frame.real-export-active{display:block!important}
.sheet{width:1080px!important;height:1440px!important;transform:none!important;border-radius:0!important;border:0!important;box-shadow:none!important}
.image-control{display:none!important}
</style>`;
  const script = `
<script id="real-browser-export-script">
window.addEventListener("load", function () {
  document.querySelectorAll(".page-frame").forEach(function (frame, index) {
    frame.classList.toggle("real-export-active", index === ${pageIndex});
  });
});
</script>`;
  return html
    .replace(/<base\b[^>]*>/i, "")
    .replace("<head>", `<head><base href="http://127.0.0.1:${port}/">${css}`)
    .replace("</body>", `${script}</body>`);
}

async function handleExport(req, res) {
  try {
    const payload = JSON.parse(await body(req));
    const pageIndex = Number(payload.pageIndex);
    if (!Number.isInteger(pageIndex) || pageIndex < 0 || typeof payload.html !== "string") {
      send(res, 400, "invalid export payload");
      return;
    }
    const id = randomUUID();
    const dir = path.join(jobsDir, id);
    await mkdir(dir, { recursive: true });
    const htmlPath = path.join(dir, "export.html");
    const pngPath = path.join(dir, "card.png");
    await writeFile(htmlPath, exportHtml(payload.html, pageIndex), "utf8");
    await execChrome([
      "--headless=new",
      "--disable-gpu",
      "--hide-scrollbars",
      "--force-device-scale-factor=1",
      "--window-size=1080,1440",
      "--virtual-time-budget=2500",
      `--screenshot=${pngPath}`,
      `http://127.0.0.1:${port}/.plog-export-jobs/${id}/export.html`
    ]);
    const png = await readFile(pngPath);
    res.writeHead(200, { "content-type": "image/png", "content-length": png.length, "cache-control": "no-store" });
    res.end(png);
    setTimeout(() => rm(dir, { recursive: true, force: true }).catch(() => {}), 5000);
  } catch (error) {
    send(res, 500, error.message || "export failed");
  }
}

async function serve(req, res) {
  const url = new URL(req.url, `http://127.0.0.1:${port}`);
  let pathname = decodeURIComponent(url.pathname);
  if (pathname === "/") pathname = "/preview.html";
  const file = path.resolve(root, pathname.replace(/^\/+/, ""));
  if (!file.startsWith(root)) return send(res, 403, "forbidden");
  try {
    const info = await stat(file);
    if (!info.isFile()) return send(res, 404, "not found");
    res.writeHead(200, { "content-type": types[path.extname(file).toLowerCase()] || "application/octet-stream" });
    createReadStream(file).pipe(res);
  } catch {
    send(res, 404, "not found");
  }
}

createServer((req, res) => {
  if (req.method === "POST" && req.url === "/api/export-card") return handleExport(req, res);
  if (req.method === "GET" || req.method === "HEAD") return serve(req, res);
  send(res, 405, "method not allowed");
}).listen(port, "127.0.0.1", () => {
  console.log(`Plog preview server: http://127.0.0.1:${port}/preview.html`);
});
