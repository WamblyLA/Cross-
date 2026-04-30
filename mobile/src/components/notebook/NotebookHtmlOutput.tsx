import { useMemo } from "react";
import { isNotebookHtmlMimeType } from "../../features/files/notebookMime";
import { useThemeVariable } from "../../hooks/useThemeVariable";
import { MonospaceBlock } from "../file/MonospaceBlock";
import { NotebookWebViewFrame } from "./NotebookWebViewFrame";

type NotebookHtmlOutputProps = {
  mimeType: string | null;
  text: string;
};

export function NotebookHtmlOutput({
  mimeType,
  text,
}: NotebookHtmlOutputProps) {
  const background = useThemeVariable("--bg-input", "#101913");
  const textColor = useThemeVariable("--text-primary", "#edf5ee");
  const accent = useThemeVariable("--accent", "#316e43");
  const border = useThemeVariable("--border-default", "#243228");

  const html = useMemo(() => {
    if (!isNotebookHtmlMimeType(mimeType) || !text.trim()) {
      return "";
    }

    return `<!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
          <style>
            body {
              margin: 0;
              padding: 12px;
              background: ${background};
              color: ${textColor};
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
              line-height: 1.5;
              overflow-wrap: anywhere;
            }
            img, svg, canvas, table, pre, code {
              max-width: 100%;
            }
            table {
              width: 100%;
              border-collapse: collapse;
            }
            td, th {
              border: 1px solid ${border};
              padding: 6px 8px;
            }
            pre, code {
              background: ${background};
            }
            a {
              color: ${accent};
            }
          </style>
        </head>
        <body>${text}</body>
      </html>`;
  }, [accent, background, border, mimeType, text, textColor]);

  if (!html) {
    return <MonospaceBlock compact text={text} />;
  }

  return <NotebookWebViewFrame html={html} />;
}
