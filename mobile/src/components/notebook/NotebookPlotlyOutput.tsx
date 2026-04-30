import { useMemo } from "react";
import { isNotebookPlotlyMimeType } from "../../features/files/notebookMime";
import { useThemeVariable } from "../../hooks/useThemeVariable";
import { MonospaceBlock } from "../file/MonospaceBlock";
import { NotebookWebViewFrame } from "./NotebookWebViewFrame";

type NotebookPlotlyOutputProps = {
  mimeType: string | null;
  value: unknown;
};

export function NotebookPlotlyOutput({
  mimeType,
  value,
}: NotebookPlotlyOutputProps) {
  const background = useThemeVariable("--bg-input", "#101913");
  const textColor = useThemeVariable("--text-primary", "#edf5ee");

  const html = useMemo(() => {
    if (!isNotebookPlotlyMimeType(mimeType)) {
      return "";
    }

    const payload = JSON.stringify(value ?? {});

    return `<!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
          <style>
            html, body, #plotly-root {
              margin: 0;
              padding: 0;
              width: 100%;
              min-height: 160px;
              background: ${background};
              color: ${textColor};
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            }
            #plotly-root {
              min-height: 220px;
            }
            .plotly-fallback {
              display: flex;
              min-height: 220px;
              flex-direction: column;
              justify-content: center;
              gap: 8px;
              padding: 16px;
              overflow-wrap: anywhere;
              text-align: center;
            }
            .plotly-fallback-title {
              font-size: 15px;
              font-weight: 600;
            }
            .plotly-fallback-detail {
              font-size: 13px;
              line-height: 1.5;
              opacity: 0.84;
            }
          </style>
          <script src="https://cdn.plot.ly/plotly-2.35.2.min.js"></script>
        </head>
        <body>
          <div id="plotly-root"></div>
          <script>
            (function () {
              var payload = ${payload};
              var root = document.getElementById("plotly-root");

              function notifyHeight() {
                var height = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight, 220);
                if (window.ReactNativeWebView) {
                  window.ReactNativeWebView.postMessage(String(height));
                }
              }

              function showFallback() {
                root.replaceChildren();
                var fallback = document.createElement("div");
                fallback.className = "plotly-fallback";
                var title = document.createElement("div");
                title.className = "plotly-fallback-title";
                title.textContent = "Не удалось отобразить интерактивный график";
                var detail = document.createElement("div");
                detail.className = "plotly-fallback-detail";
                detail.textContent = "Проверьте подключение к интернету или откройте файл позже";
                fallback.appendChild(title);
                fallback.appendChild(detail);
                root.appendChild(fallback);
                notifyHeight();
              }

              function render() {
                if (!window.Plotly) {
                  showFallback();
                  return;
                }

                var data = Array.isArray(payload.data) ? payload.data : [];
                var layout = payload.layout && typeof payload.layout === "object" ? payload.layout : {};
                var config = payload.config && typeof payload.config === "object" ? payload.config : {};

                window.Plotly.newPlot(
                  root,
                  data,
                  layout,
                  Object.assign({ responsive: true, displayModeBar: false, displaylogo: false }, config),
                ).then(function () {
                  notifyHeight();
                }).catch(function () {
                  showFallback();
                });
              }

              if (document.readyState === "complete") {
                render();
              } else {
                window.addEventListener("load", render);
              }

              setTimeout(render, 200);
            })();
          </script>
        </body>
      </html>`;
  }, [background, mimeType, textColor, value]);

  if (!html) {
    return <MonospaceBlock compact text={JSON.stringify(value, null, 2)} />;
  }

  return <NotebookWebViewFrame html={html} javaScriptEnabled minHeight={220} maxHeight={560} />;
}
