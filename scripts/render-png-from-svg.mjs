#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

let sharp;
try {
  ({ default: sharp } = await import('sharp'));
} catch {
  console.error('Missing dependency: npm install sharp');
  process.exit(1);
}

const input = path.resolve(arg('input', 'card-data.json'));
const outDir = path.resolve(arg('out', 'exports/cards'));
const prefix = arg('prefix', 'card');
const W = 1080;
const H = 1440;
const left = 78;
const right = 78;
const maxW = W - left - right;
const sans = '"PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif';
const serif = '"Songti SC","Noto Serif SC","Source Han Serif SC",serif';
const mono = '"SFMono-Regular",Menlo,monospace';

mkdirSync(path.join(outDir, 'svg'), { recursive: true });
mkdirSync(path.join(outDir, 'png'), { recursive: true });

const data = JSON.parse(readFileSync(input, 'utf8'));
const total = data.pages.length;

function esc(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function unit(ch) {
  if (/[A-Za-z0-9/_.:-]/.test(ch)) return 0.58;
  if (/\s/.test(ch)) return 0.35;
  return 1;
}

function wrap(text, size, width) {
  const max = width / size;
  const tokens = String(text || '').match(/[A-Za-z0-9/_.:-]+|\s+|./g) || [];
  const lines = [];
  let line = '';
  let score = 0;
  for (const token of tokens) {
    const tokenScore = Array.from(token).reduce((sum, ch) => sum + unit(ch), 0);
    if (line && score + tokenScore > max) {
      lines.push(line.trim());
      line = token;
      score = tokenScore;
    } else {
      line += token;
      score += tokenScore;
    }
  }
  if (line.trim()) lines.push(line.trim());
  return lines;
}

function lines({ text, x, y, width = maxW, size = 35, leading = 1.48, weight = 430, fill = '#4d3d2e', family = sans, highlights = [] }) {
  let svg = '';
  let cy = y;
  for (const line of wrap(text, size, width)) {
    const hit = highlights.some((h) => line.includes(h) || String(h).includes(line));
    if (hit) {
      const lineW = Math.min(width, Array.from(line).reduce((n, ch) => n + unit(ch), 0) * size);
      svg += `<rect x="${x - 4}" y="${cy - size * 0.88}" width="${lineW + 8}" height="${size * 1.15}" rx="6" fill="#ead188" opacity="0.58"/>`;
      svg += `<line x1="${x}" y1="${cy + 7}" x2="${x + lineW}" y2="${cy + 7}" stroke="#c49325" stroke-width="4"/>`;
    }
    svg += `<text x="${x}" y="${cy}" font-family='${family}' font-size="${Math.max(35, size)}" font-weight="${weight}" fill="${hit ? '#7b5718' : fill}">${esc(line)}</text>`;
    cy += Math.max(35, size) * leading;
  }
  return { svg, y: cy };
}

function frame(pageNo) {
  const shortTitle = data.shortTitle || data.title || '';
  return `
  <defs>
    <linearGradient id="paper" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#fff9e9"/><stop offset="0.52" stop-color="#f6ecd4"/><stop offset="1" stop-color="#eadab8"/>
    </linearGradient>
    <radialGradient id="warm" cx="16%" cy="8%" r="52%">
      <stop offset="0" stop-color="#fff5c9" stop-opacity="0.48"/><stop offset="1" stop-color="#fff5c9" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#paper)"/>
  <rect width="${W}" height="${H}" fill="url(#warm)"/>
  <line x1="${left}" y1="136" x2="${W - right}" y2="136" stroke="#d8c99f" stroke-width="1"/>
  <text x="${left}" y="94" font-family='${sans}' font-size="35" fill="#7a6a4e">${esc(shortTitle)}</text>
  <text x="${W - right}" y="94" text-anchor="end" font-family='${mono}' font-size="35" fill="#6b5734">${String(pageNo).padStart(2, '0')} / ${String(total).padStart(2, '0')}</text>`;
}

function title(text, y) {
  let svg = '';
  let cy = y;
  for (const line of wrap(text, 58, 860)) {
    svg += `<text x="${left}" y="${cy}" font-family='${serif}' font-size="58" font-weight="760" fill="#3d3025">${esc(line)}</text>`;
    cy += 66;
  }
  return { svg, y: cy };
}

async function imageTag(img, y) {
  if (!img) return '';
  const src = path.resolve(path.dirname(input), img);
  if (!existsSync(src)) return '';
  const ext = path.extname(src).toLowerCase().includes('png') ? 'png' : 'jpeg';
  const b64 = readFileSync(src).toString('base64');
  return `<image x="${left}" y="${y}" width="${maxW}" height="320" preserveAspectRatio="xMidYMid meet" href="data:image/${ext};base64,${b64}"/>`;
}

const report = [];
for (let i = 0; i < data.pages.length; i += 1) {
  const page = data.pages[i];
  let svg = frame(i + 1);
  let y = 222;
  const h = title(page.heading || data.title || '', y);
  svg += h.svg;
  y = h.y + 44;
  if (page.kicker) {
    svg += `<text x="${left}" y="${y}" font-family='${sans}' font-size="42" font-weight="700" fill="#a87518">${esc(page.kicker)}</text>`;
    y += 64;
  }
  const blocks = page.blocks || [];
  for (const block of blocks) {
    const p = lines({ text: block, x: left, y, size: page.fontSize || 38, leading: page.leading || 1.52, highlights: page.highlights || data.highlights || [] });
    svg += p.svg;
    y = p.y + 30;
  }
  if (page.link) {
    svg += `<line x1="${left}" y1="${y}" x2="${W - right}" y2="${y}" stroke="#d8c99f" stroke-width="1"/>`;
    y += 44;
    const link = lines({ text: page.link, x: left, y, size: 35, leading: 1.35, fill: '#80663a', family: mono });
    svg += link.svg;
    y = link.y + 26;
  }
  svg += await imageTag(page.image, y);
  const doc = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${svg}</svg>`;
  const name = `${prefix}-${String(i + 1).padStart(2, '0')}`;
  const svgPath = path.join(outDir, 'svg', `${name}.svg`);
  const pngPath = path.join(outDir, 'png', `${name}.png`);
  writeFileSync(svgPath, doc, 'utf8');
  await sharp(Buffer.from(doc)).png().toFile(pngPath);
  const meta = await sharp(pngPath).metadata();
  report.push({ page: i + 1, file: pngPath, width: meta.width, height: meta.height });
}

writeFileSync(path.join(outDir, 'render-report.json'), JSON.stringify(report, null, 2), 'utf8');
console.log(JSON.stringify({ outDir, pages: report.length, width: W, height: H }, null, 2));
