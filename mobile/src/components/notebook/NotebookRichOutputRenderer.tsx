import { MarkdownPreview } from "../markdown/MarkdownPreview";
import type { NotebookOutput } from "../../types/notebook";
import {
  isNotebookHtmlMimeType,
  isNotebookImageMimeType,
  isNotebookPlotlyMimeType,
  isNotebookSvgMimeType,
} from "../../features/files/notebookMime";
import { NotebookFallbackOutput } from "./NotebookFallbackOutput";
import { NotebookHtmlOutput } from "./NotebookHtmlOutput";
import { NotebookImageOutput } from "./NotebookImageOutput";
import { NotebookPlotlyOutput } from "./NotebookPlotlyOutput";
import { NotebookSvgOutput } from "./NotebookSvgOutput";

type NotebookRichOutputRendererProps = {
  output: Extract<NotebookOutput, { outputType: "rich" }>;
};

export function NotebookRichOutputRenderer({
  output,
}: NotebookRichOutputRendererProps) {
  if (isNotebookPlotlyMimeType(output.mimeType)) {
    return <NotebookPlotlyOutput mimeType={output.mimeType} value={output.data[output.mimeType ?? ""]} />;
  }

  if (isNotebookHtmlMimeType(output.mimeType)) {
    return <NotebookHtmlOutput mimeType={output.mimeType} text={output.text} />;
  }

  if (isNotebookSvgMimeType(output.mimeType)) {
    return <NotebookSvgOutput mimeType={output.mimeType} text={output.text} />;
  }

  if (isNotebookImageMimeType(output.mimeType)) {
    return <NotebookImageOutput mimeType={output.mimeType} text={output.text} />;
  }

  if (output.mimeType === "text/markdown") {
    return <MarkdownPreview content={output.text} scrollable={false} />;
  }

  return <NotebookFallbackOutput mimeType={output.mimeType} text={output.text} />;
}
