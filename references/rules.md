# Rules

## Content

- Default to no cover. Page 1 is article content unless the user explicitly asks for a cover.
- Respect the source text. Do not add information, viewpoints, background, examples, metrics, or claims.
- Allowed edits: pagination, line breaks, short title extraction, visual hierarchy, and highlighting original phrases.
- Highlights must use original wording from the source.
- Keep product names, project names, official links, file names, and tool names exact.
- For Feishu/Lark sources, fetch the latest linked document version for each new task. Local cached HTML, PNGs, or exports are only reference material unless the user explicitly chooses them.

## Layout

- Card size is exactly `1080x1440`.
- Preview must be vertical: cards stack top-to-bottom in the webpage, centered in a scrollable page.
- Header left: short article title.
- Header right: page number formatted like `01 / 10`.
- Do not include footer, watermark, source strip, author/date, or QR code unless explicitly requested.
- Minimum visible font size is `35px`.
- Keep a safe margin of at least `70px` around meaningful content.
- Avoid nested frames. Prefer open article rhythm, section rules, and text hierarchy over panels inside panels.
- Paginate to avoid large blank areas, but prefer adding a page over compressing text into unreadability.

## Images

- Screenshots/images must be fully readable and complete by default.
- Do not crop images unless the user explicitly asks for a crop.
- Do not wrap screenshots in visible frames, cards, bordered containers, or tinted boxes.
- Use floating images: transparent container, no border, no panel background, image-level drop shadow if needed.
- Prefer local image assets for preview and export. If remote document images are private, slow, or auth-bound, download or copy them into a local `assets/` folder and reference those files from HTML.
- Add per-image controls in the preview so the user can adjust image size before export. Use CSS variables such as `--img-size`, `--img-max-w`, or `--visual-h` so adjustments survive export.
- When browser annotations request image size changes, apply them to semantic classes on the specific image/page rather than changing all images of the same generic type.

## Preview

- The first deliverable should be an HTML webpage preview unless the user explicitly asks for immediate image export.
- The preview should include a visible control bar with:
  - Download all PNGs.
  - Download current/single PNG when practical.
  - Reset image sizes.
  - Per-image size sliders or number inputs near each image.
- The preview may use client-side libraries only when bundled locally or loaded from stable public CDNs with graceful failure. Keep the page usable if a CDN fails.
- Do not make the user edit CSS to adjust an image; make the common image-size operation available in the preview UI.

## Export

- Do not package PNGs before preview approval unless the user asks for PNG/ZIP directly.
- When exporting, export each page as an individual PNG at exactly `1080x1440`.
- Validate:
  - Page count matches the preview.
  - Every PNG is `1080x1440`.
  - Images are loaded.
  - No content overflow or clipping.
  - No stale old output is mixed with the current export.
- Use a new output directory or clean the target before exporting to avoid mixing old pages with current pages.
- If headless browser export hangs on remote images, switch HTML to local images and rerun export.
