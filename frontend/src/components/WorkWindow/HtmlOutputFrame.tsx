import { useEffect, useId, useMemo, useState } from "react";
import type { ThemeName } from "../../styles/tokens";
import { resolveMarkdownBaseHref } from "./markdown/markdownUrlResolver";

type HtmlOutputFrameProps = {
  html: string;
  filePath: string;
  theme: ThemeName;
  minHeight?: number;
};

function getBaseHref(filePath: string) {
  return resolveMarkdownBaseHref(filePath);
}

function buildFrameDocument({
  frameId,
  html,
  theme,
  filePath,
}: {
  frameId: string;
  html: string;
  theme: ThemeName;
  filePath: string;
}) {
  const colors =
    theme === "light"
      ? {
          text: "#142017",
          muted: "#607365",
          border: "#c9d6cc",
          surface: "#ffffff",
          code: "#eef3ef",
          link: "#3f784e",
        }
      : {
          text: "#edf5ee",
          muted: "#8ea28f",
          border: "#243228",
          surface: "#101913",
          code: "#0d1410",
          link: "#6fbe7f",
        };
  const baseHref = getBaseHref(filePath);

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    ${baseHref ? `<base href="${baseHref}" />` : ""}
    <style>
      :root {
        color-scheme: ${theme};
      }

      html, body {
        margin: 0;
        padding: 0;
        background: transparent;
        color: ${colors.text};
        font: 14px/1.6 "Segoe UI", system-ui, sans-serif;
      }

      body {
        overflow-x: hidden;
      }

      table {
        border-collapse: collapse;
        width: 100%;
      }

      th, td {
        border: 1px solid ${colors.border};
        padding: 8px 10px;
        text-align: left;
      }

      pre, code {
        font-family: Consolas, "Cascadia Code", monospace;
      }

      pre {
        white-space: pre-wrap;
        overflow-wrap: anywhere;
        background: ${colors.code};
        border: 1px solid ${colors.border};
        border-radius: 12px;
        padding: 12px 14px;
      }

      blockquote {
        margin: 0;
        padding-left: 16px;
        border-left: 3px solid ${colors.border};
        color: ${colors.muted};
      }

      a {
        color: ${colors.link};
      }

      img, svg, canvas, iframe {
        max-width: 100%;
      }

      .plotly-graph-div {
        width: 100% !important;
      }
    </style>
  </head>
  <body>
    ${html}
    <script>
      const frameId = ${JSON.stringify(frameId)};

      const notifyHeight = () => {
        const root = document.documentElement;
        const height = Math.max(root.scrollHeight, document.body ? document.body.scrollHeight : 0, 80);
        window.parent.postMessage({ source: "crosspp-html-frame", id: frameId, height }, "*");
      };

      const scheduleNotify = () => window.requestAnimationFrame(notifyHeight);

      window.addEventListener("load", scheduleNotify);
      window.addEventListener("resize", scheduleNotify);

      if (typeof ResizeObserver !== "undefined") {
        const resizeObserver = new ResizeObserver(scheduleNotify);
        resizeObserver.observe(document.documentElement);
        if (document.body) {
          resizeObserver.observe(document.body);
        }
      }

      if (typeof MutationObserver !== "undefined") {
        const mutationObserver = new MutationObserver(scheduleNotify);
        mutationObserver.observe(document.documentElement, { childList: true, subtree: true, attributes: true });
      }

      setTimeout(scheduleNotify, 0);
      setTimeout(scheduleNotify, 120);
      setTimeout(scheduleNotify, 600);
    </script>
  </body>
</html>`;
}

export default function HtmlOutputFrame({
  html,
  filePath,
  theme,
  minHeight = 120,
}: HtmlOutputFrameProps) {
  const frameId = useId().replace(/:/g, "");
  const [height, setHeight] = useState(minHeight);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (
        !event.data ||
        typeof event.data !== "object" ||
        event.data.source !== "crosspp-html-frame" ||
        event.data.id !== frameId
      ) {
        return;
      }

      const nextHeight =
        typeof event.data.height === "number" && Number.isFinite(event.data.height)
          ? Math.max(minHeight, Math.min(1600, Math.ceil(event.data.height)))
          : minHeight;

      setHeight(nextHeight);
    };

    window.addEventListener("message", handleMessage);

    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, [frameId, minHeight]);

  const srcDoc = useMemo(
    () =>
      buildFrameDocument({
        frameId,
        html,
        theme,
        filePath,
      }),
    [filePath, frameId, html, theme],
  );

  return (
    <iframe
      title="Вывод notebook"
      className="w-full rounded-[14px] border border-default bg-input"
      style={{ height }}
      sandbox="allow-scripts allow-popups"
      srcDoc={srcDoc}
    />
  );
}
