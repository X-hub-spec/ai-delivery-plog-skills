---
name: ai-delivery-plog-skills
description: Create AI交付局图文Plog cards from Feishu/Lark docs, Markdown, Word, or longform articles. Use when the user wants a vertical webpage preview of 1080x1440 article/Plog cards, source-faithful pagination, floating complete screenshots, browser-adjustable image sizes, built-in PNG download buttons, and optional final PNG/ZIP export only after preview approval.
---

# AI交付局图文PlogSKills

Create reading-first AI交付局图文 Plog cards from Feishu/Lark docs, Markdown, Word, or image-supported longform text. Default output is a vertical webpage preview, not an immediate PNG package.

## Core Workflow

1. On first use in a workspace, run `node /path/to/skill/scripts/check-deps.mjs`. If a required dependency is missing, install or ask the user to install it before producing final exports.
2. Read `references/rules.md` before generating or editing cards.
3. Read `references/input-format.md` when the input is Markdown, Word, Feishu export, or when image placement is unclear.
4. If the user provides a Feishu/Lark/Wiki URL, fetch the latest remote document content. Do not rely on local cached HTML, old exports, or old images unless they match the latest fetched document or the user explicitly selects them.
5. Use `assets/template.html` as the starting point for new HTML output.
6. Build a vertical preview: cards stack top-to-bottom in the browser. Do not default to horizontal side-by-side preview.
7. Preserve original content. Do not add facts, examples, explanations, marketing claims, or rewrites. Allowed edits are pagination, line breaks, short title extraction, visual hierarchy, and highlights from original wording.
8. Paginate by meaning. Each page should carry one clear idea and fit without clipping.
9. Float screenshots/images on the page: no visible image container frame, no background panel, no forced crop. Use `object-fit: contain` and local assets when possible.
10. Add browser controls for preview adjustment:
   - A download button for PNG export from the webpage.
   - Per-image size controls so the user can adjust image scale before final export.
   - Vertical-only image dragging while keeping images horizontally centered.
   - Vertical-only caption dragging while keeping captions horizontally centered.
   - Do not force a PNG/ZIP package until the user asks or approves the preview.
11. After user approval or explicit export request, export each page as `1080x1440` PNG. Prefer real-browser Chrome screenshot export over canvas re-rendering. If packaging is requested, create a ZIP after validating dimensions and overflow.

## Fixed Practices From Prior Work

- Treat existing local preview files and `exports/` folders as stale until proven current.
- When Feishu image URLs are private or slow in headless export, download or map them to local `assets/` files, then point HTML at local assets.
- When the user gives browser annotations for image size, encode them as durable semantic classes or CSS variables, not temporary browser attributes.
- Keep the preview editable. Prefer source-level controls and CSS custom properties over one-off manual PNG edits.
- If exporting via Puppeteer/Chrome stalls on network idle, switch to local images or a less fragile load strategy rather than waiting indefinitely.
- Prefer `scripts/preview-server.mjs` or `scripts/export-cards.mjs` for final PNG export. Both use real Chrome/Edge screenshots, so PNGs match browser preview more closely than `html2canvas`.
- Always verify: page count, `1080x1440` dimensions, images loaded, no content overflow, no footer/watermark unless requested.

## Visual Direction

Use warm reading texture by default: warm paper surface, low-contrast dark brown text, restrained gold highlights, and subtle premium texture. The layout should feel like a polished AI交付局 article/Plog, not a generic template.

Avoid generic emoji, decorative dots, bento grids, nested cards, framed screenshot boxes, heavy shadows, loud gradients, footers, watermarks, and left-border quote panels.

## Resources

- `assets/template.html`: vertical preview template with per-page PNG download and image-size controls.
- `assets/card-data.example.json`: example data shape for generated pages and images.
- `references/rules.md`: fixed design, content, preview, interaction, and export requirements.
- `references/input-format.md`: recommended input contracts for Feishu, Markdown, Word, and images.
- `scripts/check-deps.mjs`: first-use dependency check for Node.js, Chrome/Edge, and optional lark-cli.
- `scripts/preview-server.mjs`: local preview server with `/api/export-card` real Chrome screenshot export for page buttons.
- `scripts/export-cards.mjs`: real Chrome/Edge screenshot PNG export helper for final approved exports.
- `scripts/render-png-from-svg.mjs`: fallback SVG-to-PNG export helper for locked-down environments.

## Dependency Notes

Required for normal use:

- Node.js 18+
- Google Chrome, Microsoft Edge, Chromium, or `CHROME_PATH`

Required for Feishu/Lark sources:

- `lark-cli` configured with user access

Do not assume dependencies are present on first use. Run `scripts/check-deps.mjs`, then install or ask the user to install missing required dependencies. Do not use Puppeteer as the default export path.

## Word Input Notes

When the user provides Word:

1. Extract `.docx` text and embedded images.
2. Preserve title, heading hierarchy, paragraph order, lists, links, and image order.
3. Convert the document to the same internal shape as Markdown/Feishu content.
4. Continue with the normal vertical preview workflow.

If extraction loses content or images, ask for Markdown export plus image files.
