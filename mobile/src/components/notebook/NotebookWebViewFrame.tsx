import { AutoHeightHtmlWebView } from "../common/AutoHeightHtmlWebView";

type NotebookWebViewFrameProps = {
  html: string;
  minHeight?: number;
  maxHeight?: number;
  javaScriptEnabled?: boolean;
};

export function NotebookWebViewFrame({
  html,
  minHeight = 160,
  maxHeight = 520,
  javaScriptEnabled = true,
}: NotebookWebViewFrameProps) {
  return (
    <AutoHeightHtmlWebView
      html={html}
      javaScriptEnabled={javaScriptEnabled}
      maxHeight={maxHeight}
      minHeight={minHeight}
    />
  );
}
