import { useEffect, useMemo, useRef, useState } from "react";
import Plotly from "plotly.js-dist-min";

type PlotlyMimeRendererProps = {
  value: unknown;
};

function normalizeFigure(value: unknown) {
  if (!value) {
    return null;
  }

  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }

  return typeof value === "object" ? value : null;
}

export default function PlotlyMimeRenderer({ value }: PlotlyMimeRendererProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const figure = useMemo(() => normalizeFigure(value), [value]);

  useEffect(() => {
    const container = containerRef.current;

    if (!container || !figure || typeof figure !== "object") {
      return;
    }

    let cancelled = false;
    const figureRecord = figure as Record<string, unknown>;
    const data = Array.isArray(figureRecord.data) ? figureRecord.data : [];
    const layout: Record<string, unknown> =
      figureRecord.layout && typeof figureRecord.layout === "object" && !Array.isArray(figureRecord.layout)
        ? (figureRecord.layout as Record<string, unknown>)
        : {};
    const config: Record<string, unknown> =
      figureRecord.config && typeof figureRecord.config === "object" && !Array.isArray(figureRecord.config)
        ? (figureRecord.config as Record<string, unknown>)
        : {};
    const frames = Array.isArray(figureRecord.frames) ? figureRecord.frames : [];

    const renderFigure = async () => {
      try {
        await Plotly.react(container, data, layout, {
          ...config,
          responsive: true,
          displaylogo: false,
        });

        if (cancelled) {
          return;
        }

        if (frames.length > 0) {
          await Plotly.addFrames(container, frames);
        }

        setError(null);
      } catch (nextError) {
        setError(nextError instanceof Error ? nextError.message : "Не удалось отрисовать Plotly-output.");
      }
    };

    void renderFigure();

    const resizeObserver =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => {
            void Plotly.Plots.resize(container);
          })
        : null;
    resizeObserver?.observe(container);

    return () => {
      cancelled = true;
      resizeObserver?.disconnect();
      Plotly.purge(container);
    };
  }, [figure]);

  if (!figure) {
    return (
      <pre className="overflow-x-auto rounded-[14px] border border-default bg-input px-4 py-3 text-xs leading-6 text-secondary">
        {typeof value === "string" ? value : JSON.stringify(value, null, 2)}
      </pre>
    );
  }

  return (
    <div className="rounded-[14px] border border-default bg-input p-3">
      <div ref={containerRef} className="min-h-[240px] w-full" />
      {error ? <div className="mt-3 text-xs text-error">{error}</div> : null}
    </div>
  );
}
