import { katexStyles } from "./katexStyles";

type BuildMarkdownHtmlDocumentOptions = {
  contentHtml: string;
  background: string;
  panelBackground: string;
  text: string;
  secondary: string;
  accent: string;
  border: string;
  codeBackground: string;
  editorBackground: string;
};

const texmathStyles = `
  .katex { font-size: 1em !important; }
  eq { display: inline-block; }
  eqn { display: block; }
  section.eqno {
    display: flex;
    flex-direction: row;
    align-content: space-between;
    align-items: center;
    gap: 16px;
  }
  section.eqno > eqn {
    width: 100%;
    margin-left: 3em;
  }
  section.eqno > span {
    width: 3em;
    text-align: right;
  }
`;

export function buildMarkdownHtmlDocument({
  contentHtml,
  background,
  panelBackground,
  text,
  secondary,
  accent,
  border,
  codeBackground,
  editorBackground,
}: BuildMarkdownHtmlDocumentOptions) {
  return `<!DOCTYPE html>
<html lang="ru">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
    <style>
      ${katexStyles}
      ${texmathStyles}
      html, body {
        margin: 0;
        padding: 0;
        background: ${background};
        color: ${text};
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }

      body {
        padding: 16px;
        font-size: 14px;
        line-height: 1.7;
        word-wrap: break-word;
      }

      body > :first-child {
        margin-top: 0;
      }

      body > :last-child {
        margin-bottom: 0;
      }

      p, ul, ol, blockquote, table, pre, section {
        margin: 0 0 12px;
      }

      h1, h2, h3, h4, h5, h6 {
        margin: 0 0 12px;
        color: ${text};
      }

      h1 { font-size: 28px; }
      h2 { font-size: 24px; }
      h3 { font-size: 20px; }

      a {
        color: ${accent};
        text-decoration: none;
      }

      hr {
        border: 0;
        border-top: 1px solid ${border};
        margin: 16px 0;
      }

      blockquote {
        border-left: 4px solid ${accent};
        color: ${secondary};
        margin-left: 0;
        padding-left: 12px;
      }

      code {
        background: ${editorBackground};
        border-radius: 6px;
        color: ${text};
        padding: 2px 4px;
      }

      pre {
        background: ${codeBackground};
        border: 1px solid ${border};
        border-radius: 12px;
        overflow-x: auto;
        padding: 16px;
      }

      pre code {
        background: transparent;
        padding: 0;
      }

      table {
        border-collapse: collapse;
        width: 100%;
      }

      th, td {
        border: 1px solid ${border};
        padding: 8px 10px;
        text-align: left;
      }

      th {
        background: ${panelBackground};
      }

      img, svg {
        max-width: 100%;
      }

      section > eqn,
      .katex-display {
        overflow-x: auto;
        overflow-y: hidden;
        padding: 4px 0;
      }
    </style>
  </head>
  <body>
    ${contentHtml}
  </body>
</html>`;
}
