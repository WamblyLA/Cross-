import type { ThemeName } from "../../../../styles/tokens";
import HtmlOutputFrame from "../../HtmlOutputFrame";
import MarkdownRenderer from "../../markdown/MarkdownRenderer";
import type { NotebookOutput } from "../types";
import NotebookTextOutput from "./NotebookTextOutput";
import { coerceMimeText, pickPreferredMimeType } from "./mimePriority";
import PlotlyMimeRenderer from "./PlotlyMimeRenderer";

const RICH_OUTPUT_MAX_HEIGHT_PX = 480;

type NotebookMimeRendererHostProps = {
  output: Extract<NotebookOutput, { output_type: "display_data" | "execute_result" }>;
  outputKey: string;
  filePath: string;
  theme: ThemeName;
};

export default function NotebookMimeRendererHost({
  output,
  outputKey,
  filePath,
  theme,
}: NotebookMimeRendererHostProps) {
  const data = output.data ?? {};
  const mimeType = pickPreferredMimeType(data);

  if (!mimeType) {
    return (
      <NotebookTextOutput
        outputKey={outputKey}
        text={JSON.stringify(data, null, 2)}
      />
    );
  }

  if (mimeType === "application/vnd.plotly.v1+json") {
    return <PlotlyMimeRenderer value={data[mimeType]} />;
  }

  if (mimeType === "text/html") {
    return (
      <div
        className="ui-scrollbar overflow-auto rounded-[14px]"
        style={{ maxHeight: RICH_OUTPUT_MAX_HEIGHT_PX }}
      >
        <HtmlOutputFrame
          html={coerceMimeText(data[mimeType])}
          filePath={filePath}
          theme={theme}
          minHeight={140}
        />
      </div>
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
      <div
        className="ui-scrollbar overflow-auto rounded-[14px]"
        style={{ maxHeight: RICH_OUTPUT_MAX_HEIGHT_PX }}
      >
        <MarkdownRenderer
          source={coerceMimeText(data[mimeType])}
          filePath={filePath}
          className="rounded-[14px] border border-default bg-input px-4 py-4"
        />
      </div>
    );
  }

  if (mimeType === "application/json") {
    return (
      <NotebookTextOutput
        outputKey={outputKey}
        text={
          typeof data[mimeType] === "string"
            ? data[mimeType]
            : JSON.stringify(data[mimeType], null, 2)
        }
      />
    );
  }

  return (
    <NotebookTextOutput
      outputKey={outputKey}
      text={coerceMimeText(data[mimeType])}
    />
  );
}
