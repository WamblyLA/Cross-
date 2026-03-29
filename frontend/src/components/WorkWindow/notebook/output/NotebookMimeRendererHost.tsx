import type { ThemeName } from "../../../../styles/tokens";
import HtmlOutputFrame from "../../HtmlOutputFrame";
import MarkdownRenderer from "../../markdown/MarkdownRenderer";
import type { NotebookOutput } from "../types";
import { coerceMimeText, pickPreferredMimeType } from "./mimePriority";
import PlotlyMimeRenderer from "./PlotlyMimeRenderer";

type NotebookMimeRendererHostProps = {
  output: Extract<NotebookOutput, { output_type: "display_data" | "execute_result" }>;
  filePath: string;
  theme: ThemeName;
};

export default function NotebookMimeRendererHost({
  output,
  filePath,
  theme,
}: NotebookMimeRendererHostProps) {
  const data = output.data ?? {};
  const mimeType = pickPreferredMimeType(data);

  if (!mimeType) {
    return (
      <pre className="overflow-x-auto rounded-[14px] border border-default bg-input px-4 py-3 text-xs leading-6 text-secondary">
        {JSON.stringify(data, null, 2)}
      </pre>
    );
  }

  if (mimeType === "application/vnd.plotly.v1+json") {
    return <PlotlyMimeRenderer value={data[mimeType]} />;
  }

  if (mimeType === "text/html") {
    return (
      <HtmlOutputFrame
        html={coerceMimeText(data[mimeType])}
        filePath={filePath}
        theme={theme}
        minHeight={140}
      />
    );
  }

  if (mimeType === "image/svg+xml") {
    return (
      <img
        src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(coerceMimeText(data[mimeType]))}`}
        alt="Вывод ячейки"
        className="max-w-full rounded-[12px] border border-default"
      />
    );
  }

  if (mimeType === "image/png") {
    return (
      <img
        src={`data:image/png;base64,${coerceMimeText(data[mimeType])}`}
        alt="Вывод ячейки"
        className="max-w-full rounded-[12px] border border-default"
      />
    );
  }

  if (mimeType === "image/jpeg") {
    return (
      <img
        src={`data:image/jpeg;base64,${coerceMimeText(data[mimeType])}`}
        alt="Вывод ячейки"
        className="max-w-full rounded-[12px] border border-default"
      />
    );
  }

  if (mimeType === "text/markdown") {
    return (
      <MarkdownRenderer
        source={coerceMimeText(data[mimeType])}
        filePath={filePath}
        className="rounded-[14px] border border-default bg-input px-4 py-4"
      />
    );
  }

  if (mimeType === "application/json") {
    return (
      <pre className="overflow-x-auto rounded-[14px] border border-default bg-input px-4 py-3 text-xs leading-6 text-secondary">
        {typeof data[mimeType] === "string" ? data[mimeType] : JSON.stringify(data[mimeType], null, 2)}
      </pre>
    );
  }

  return (
    <pre className="overflow-x-auto rounded-[14px] border border-default bg-input px-4 py-3 text-xs leading-6 text-secondary">
      {coerceMimeText(data[mimeType])}
    </pre>
  );
}
