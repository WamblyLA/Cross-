import katex from "katex";
import MarkdownIt from "markdown-it";
import texmath from "markdown-it-texmath";

const markdownRenderer = new MarkdownIt({
  html: true,
  breaks: true,
  linkify: true,
});

markdownRenderer.use(texmath, {
  engine: katex,
  delimiters: ["dollars", "beg_end"],
  katexOptions: {
    throwOnError: false,
    strict: "ignore",
  },
});

export function renderMarkdownToHtml(content: string) {
  return markdownRenderer.render(content);
}
