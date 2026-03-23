import { getParentPath } from "../../utils/path";

const INLINE_LATEX_REPLACEMENTS: Record<string, string> = {
  "\\alpha": "&alpha;",
  "\\beta": "&beta;",
  "\\gamma": "&gamma;",
  "\\delta": "&delta;",
  "\\epsilon": "&epsilon;",
  "\\theta": "&theta;",
  "\\lambda": "&lambda;",
  "\\mu": "&mu;",
  "\\pi": "&pi;",
  "\\sigma": "&sigma;",
  "\\phi": "&phi;",
  "\\omega": "&omega;",
  "\\times": "&times;",
  "\\cdot": "&middot;",
  "\\pm": "&plusmn;",
  "\\leq": "&le;",
  "\\geq": "&ge;",
  "\\neq": "&ne;",
  "\\approx": "&asymp;",
  "\\infty": "&infin;",
  "\\rightarrow": "&rarr;",
  "\\leftarrow": "&larr;",
  "\\sum": "&sum;",
  "\\int": "&int;",
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function normalizePathSlashes(value: string) {
  return value.replace(/\\/g, "/");
}

function toDirectoryFileUrl(directoryPath: string) {
  const normalized = normalizePathSlashes(directoryPath).replace(/\/+$/, "");

  if (normalized.startsWith("//")) {
    return encodeURI(`file:${normalized}/`);
  }

  if (/^[A-Za-z]:\//.test(normalized)) {
    return encodeURI(`file:///${normalized}/`);
  }

  return encodeURI(`file://${normalized}/`);
}

function toFileUrl(filePath: string) {
  const normalized = normalizePathSlashes(filePath);

  if (normalized.startsWith("file://")) {
    return normalized;
  }

  if (normalized.startsWith("//")) {
    return encodeURI(`file:${normalized}`);
  }

  if (/^[A-Za-z]:\//.test(normalized)) {
    return encodeURI(`file:///${normalized}`);
  }

  return encodeURI(`file://${normalized}`);
}

function resolveMarkdownUrl(rawUrl: string, filePath: string, isImage = false) {
  const trimmedUrl = rawUrl.trim().replace(/^<|>$/g, "");

  if (!trimmedUrl) {
    return null;
  }

  if (/^javascript:/i.test(trimmedUrl)) {
    return null;
  }

  if (/^(https?:|mailto:|file:|#)/i.test(trimmedUrl)) {
    return trimmedUrl;
  }

  if (isImage && /^data:image\//i.test(trimmedUrl)) {
    return trimmedUrl;
  }

  if (/^[A-Za-z]:[\\/]/.test(trimmedUrl) || trimmedUrl.startsWith("\\\\")) {
    return toFileUrl(trimmedUrl);
  }

  const baseDirectory = getParentPath(filePath);

  if (!baseDirectory) {
    return trimmedUrl;
  }

  try {
    return new URL(trimmedUrl.replace(/\\/g, "/"), toDirectoryFileUrl(baseDirectory)).toString();
  } catch {
    return null;
  }
}

function renderLatexTokens(source: string): string {
  let html = escapeHtml(source.trim());

  const replaceRecursive = (
    pattern: RegExp,
    replacer: (...groups: string[]) => string,
  ) => {
    let previous = "";

    while (previous !== html) {
      previous = html;
      html = html.replace(pattern, (...args) => replacer(...(args.slice(1, -2) as string[])));
    }
  };

  replaceRecursive(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, (top, bottom) => {
    return `<span class="markdown-math-fraction"><span class="markdown-math-top">${renderLatexTokens(
      top,
    )}</span><span class="markdown-math-bottom">${renderLatexTokens(bottom)}</span></span>`;
  });

  replaceRecursive(/\\sqrt\{([^{}]+)\}/g, (value) => {
    return `<span class="markdown-math-root">&radic;<span class="markdown-math-root-value">${renderLatexTokens(
      value,
    )}</span></span>`;
  });

  replaceRecursive(/([A-Za-z0-9)\]])\^\{([^{}]+)\}/g, (base, power) => {
    return `${base}<sup>${renderLatexTokens(power)}</sup>`;
  });

  replaceRecursive(/([A-Za-z0-9)\]])_\{([^{}]+)\}/g, (base, index) => {
    return `${base}<sub>${renderLatexTokens(index)}</sub>`;
  });

  html = html.replace(/([A-Za-z0-9)\]])\^([A-Za-z0-9]+)/g, "$1<sup>$2</sup>");
  html = html.replace(/([A-Za-z0-9)\]])_([A-Za-z0-9]+)/g, "$1<sub>$2</sub>");

  for (const [token, replacement] of Object.entries(INLINE_LATEX_REPLACEMENTS)) {
    html = html.replaceAll(token, replacement);
  }

  html = html.replaceAll("\\,", " ");
  html = html.replaceAll("{", "");
  html = html.replaceAll("}", "");

  return html;
}

export function renderLatexExpressionToHtml(source: string, displayMode = false) {
  return `<span class="markdown-math${displayMode ? " markdown-math-display" : ""}">${renderLatexTokens(
    source,
  )}</span>`;
}

function renderInlineMarkdown(source: string, filePath: string) {
  const placeholders: string[] = [];
  const stash = (html: string) => {
    const token = `@@CROSSPP_MD_${placeholders.length}@@`;
    placeholders.push(html);
    return token;
  };

  let html = source;

  html = html.replace(/`([^`]+)`/g, (_, code: string) => {
    return stash(`<code class="markdown-inline-code">${escapeHtml(code)}</code>`);
  });

  html = html.replace(/\$([^$\n]+)\$/g, (_, expression: string) => {
    return stash(renderLatexExpressionToHtml(expression));
  });

  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt: string, rawUrl: string) => {
    const resolvedUrl = resolveMarkdownUrl(rawUrl, filePath, true);

    if (!resolvedUrl) {
      return escapeHtml(`${alt}`);
    }

    return stash(
      `<img class="markdown-image" src="${escapeHtml(resolvedUrl)}" alt="${escapeHtml(alt)}" />`,
    );
  });

  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label: string, rawUrl: string) => {
    const resolvedUrl = resolveMarkdownUrl(rawUrl, filePath, false);

    if (!resolvedUrl) {
      return escapeHtml(label);
    }

    return stash(
      `<a class="markdown-link" href="${escapeHtml(resolvedUrl)}" target="_blank" rel="noreferrer">${escapeHtml(
        label,
      )}</a>`,
    );
  });

  html = escapeHtml(html);
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*([^*]+)\*/g, "<em>$1</em>");

  for (const [index, placeholder] of placeholders.entries()) {
    html = html.replaceAll(`@@CROSSPP_MD_${index}@@`, placeholder);
  }

  return html;
}

function isFenceStart(line: string) {
  return line.trimStart().startsWith("```");
}

function isMathFenceStart(line: string) {
  return line.trim() === "$$" || line.trimStart().startsWith("$$ ");
}

function isTableDivider(line: string) {
  return /^\s*\|?(?:\s*:?-{3,}:?\s*\|)+\s*:?-{3,}:?\s*\|?\s*$/.test(line);
}

function splitTableRow(line: string) {
  const trimmed = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  return trimmed.split("|").map((cell) => cell.trim());
}

function isOrderedListItem(line: string) {
  return /^\s*\d+\.\s+/.test(line);
}

function isBulletListItem(line: string) {
  return /^\s*[-*]\s+/.test(line);
}

function isHorizontalRule(line: string) {
  return /^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/.test(line);
}

function isBlockQuote(line: string) {
  return /^\s*>\s?/.test(line);
}

function isHeading(line: string) {
  return /^\s*#{1,6}\s+/.test(line);
}

function renderParagraph(lines: string[], filePath: string) {
  const content = lines.join(" ").trim();

  if (!content) {
    return "";
  }

  return `<p class="markdown-paragraph">${renderInlineMarkdown(content, filePath)}</p>`;
}

function renderTable(lines: string[], filePath: string) {
  if (lines.length < 2) {
    return renderParagraph(lines, filePath);
  }

  const header = splitTableRow(lines[0]);
  const rows = lines.slice(2).map(splitTableRow);

  return `
    <div class="markdown-table-wrap">
      <table class="markdown-table">
        <thead>
          <tr>${header
            .map((cell) => `<th>${renderInlineMarkdown(cell, filePath)}</th>`)
            .join("")}</tr>
        </thead>
        <tbody>
          ${rows
            .map(
              (row) =>
                `<tr>${row
                  .map((cell) => `<td>${renderInlineMarkdown(cell, filePath)}</td>`)
                  .join("")}</tr>`,
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `;
}

export function renderMarkdownToHtml(source: string, filePath: string) {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const blocks: string[] = [];

  for (let index = 0; index < lines.length; ) {
    const line = lines[index];
    const trimmed = line.trim();

    if (!trimmed) {
      index += 1;
      continue;
    }

    if (isFenceStart(line)) {
      const language = line.trim().slice(3).trim();
      const codeLines: string[] = [];
      index += 1;

      while (index < lines.length && !isFenceStart(lines[index])) {
        codeLines.push(lines[index]);
        index += 1;
      }

      if (index < lines.length) {
        index += 1;
      }

      blocks.push(`
        <pre class="markdown-code-block"><code data-language="${escapeHtml(language)}">${escapeHtml(
          codeLines.join("\n"),
        )}</code></pre>
      `);
      continue;
    }

    if (isMathFenceStart(line)) {
      const mathLines: string[] = [];

      if (trimmed !== "$$") {
        mathLines.push(trimmed.slice(2).trim());
        index += 1;
      } else {
        index += 1;
      }

      while (index < lines.length && lines[index].trim() !== "$$") {
        mathLines.push(lines[index]);
        index += 1;
      }

      if (index < lines.length) {
        index += 1;
      }

      blocks.push(renderLatexExpressionToHtml(mathLines.join(" "), true));
      continue;
    }

    if (isHeading(line)) {
      const level = Math.min(6, line.trimStart().match(/^#+/)?.[0].length ?? 1);
      const content = line.trimStart().slice(level).trim();
      blocks.push(
        `<h${level} class="markdown-heading markdown-heading-${level}">${renderInlineMarkdown(
          content,
          filePath,
        )}</h${level}>`,
      );
      index += 1;
      continue;
    }

    if (isHorizontalRule(line)) {
      blocks.push('<hr class="markdown-rule" />');
      index += 1;
      continue;
    }

    if (index + 1 < lines.length && isTableDivider(lines[index + 1])) {
      const tableLines = [line, lines[index + 1]];
      index += 2;

      while (index < lines.length && /\|/.test(lines[index]) && lines[index].trim()) {
        tableLines.push(lines[index]);
        index += 1;
      }

      blocks.push(renderTable(tableLines, filePath));
      continue;
    }

    if (isBlockQuote(line)) {
      const quoteLines: string[] = [];

      while (index < lines.length && isBlockQuote(lines[index])) {
        quoteLines.push(lines[index].replace(/^\s*>\s?/, ""));
        index += 1;
      }

      blocks.push(
        `<blockquote class="markdown-blockquote">${renderMarkdownToHtml(
          quoteLines.join("\n"),
          filePath,
        )}</blockquote>`,
      );
      continue;
    }

    if (isBulletListItem(line) || isOrderedListItem(line)) {
      const isOrderedList = isOrderedListItem(line);
      const items: string[] = [];

      while (
        index < lines.length &&
        (isOrderedList ? isOrderedListItem(lines[index]) : isBulletListItem(lines[index]))
      ) {
        items.push(lines[index].replace(/^\s*(?:[-*]|\d+\.)\s+/, ""));
        index += 1;
      }

      blocks.push(
        `${
          isOrderedList ? '<ol class="markdown-list markdown-list-ordered">' : '<ul class="markdown-list">'
        }${items
          .map((item) => `<li>${renderInlineMarkdown(item, filePath)}</li>`)
          .join("")}${isOrderedList ? "</ol>" : "</ul>"}`,
      );
      continue;
    }

    const paragraphLines = [line];
    index += 1;

    while (
      index < lines.length &&
      lines[index].trim() &&
      !isFenceStart(lines[index]) &&
      !isMathFenceStart(lines[index]) &&
      !isHeading(lines[index]) &&
      !isHorizontalRule(lines[index]) &&
      !isBlockQuote(lines[index]) &&
      !isBulletListItem(lines[index]) &&
      !isOrderedListItem(lines[index]) &&
      !(index + 1 < lines.length && isTableDivider(lines[index + 1]))
    ) {
      paragraphLines.push(lines[index]);
      index += 1;
    }

    blocks.push(renderParagraph(paragraphLines, filePath));
  }

  return blocks.join("");
}

export { toFileUrl };
