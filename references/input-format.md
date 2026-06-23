# Input Format

## Feishu/Lark Input

When the user gives a Feishu/Lark/Wiki URL:

- Fetch the latest linked document content for the current task.
- Prefer Markdown or XML extraction that preserves headings, paragraphs, image order, and links.
- Record the fetched document revision in the local HTML metadata or notes when available.
- Ignore old local generated HTML/PNG files as content sources unless the user explicitly says to reuse them.
- For document images, prefer local copies in the project `assets/` directory before final export.

## Best Markdown Input

Ask the user for:

```md
标题：文章标题

需求：
- 默认不做封面
- 纵向网页预览
- 页面内可调图片大小
- 网页按钮下载 PNG
- 阅读优先，少装饰
- 字号不低于 35
- 图片完整展示，不裁切

正文：
粘贴 Markdown 全文……

图片说明：
- image01.png 放在第 3 段后
- 如果 Markdown 图片链接失效，以我上传的图片文件为准
```

## Word Input

For `.docx` files:

- Extract title, headings, paragraphs, lists, links, and embedded images.
- Preserve source order and intended image positions.
- Convert to the same working structure used for Feishu/Markdown.
- If Word extraction loses formatting or images, ask for Markdown export plus separate image files.

## Image Handling

- Prefer user-provided local image files over broken/private Markdown URLs.
- If image placement is unclear, place the image near the paragraph that first references it.
- Use full-image containment unless the user asks for a crop.
- Add preview controls so the user can tune image scale visually before export.
