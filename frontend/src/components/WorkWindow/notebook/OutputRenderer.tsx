import type { ThemeName } from "../../../styles/tokens";
import HtmlOutputFrame from "../HtmlOutputFrame";
import MarkdownRenderer from "../markdown/MarkdownRenderer";
import type { NotebookOutput } from "./types";

type OutputRendererProps = {
  outputs: NotebookOutput[];
  hasUnsupportedOutputs: boolean;
  filePath: string;
  theme: ThemeName;
};

function coerceText(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((part) => `${part ?? ""}`).join("");
  }

  if (typeof value === "string") {
    return value;
  }

  if (value == null) {
    return "";
  }

  if (typeof value === "object") {
    return JSON.stringify(value, null, 2);
  }

  return `${value}`;
}

function renderRichOutput(
  output: Extract<NotebookOutput, { output_type: "display_data" | "execute_result" }>,
  filePath: string,
  theme: ThemeName,
) {
  const data = output.data ?? {};
  const html = coerceText(data["text/html"]);

  if (html) {
    return <HtmlOutputFrame html={html} filePath={filePath} theme={theme} minHeight={140} />;
  }

  const svg = coerceText(data["image/svg+xml"]);

  if (svg) {
    return (
      <img
        src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`}
        alt="Сохранённый вывод ячейки"
        className="max-w-full rounded-[12px] border border-default"
      />
    );
  }

  const png = coerceText(data["image/png"]);

  if (png) {
    return (
      <img
        src={`data:image/png;base64,${png}`}
        alt="Сохранённый вывод ячейки"
        className="max-w-full rounded-[12px] border border-default"
      />
    );
  }

  const jpeg = coerceText(data["image/jpeg"]);

  if (jpeg) {
    return (
      <img
        src={`data:image/jpeg;base64,${jpeg}`}
        alt="Сохранённый вывод ячейки"
        className="max-w-full rounded-[12px] border border-default"
      />
    );
  }

  const markdown = coerceText(data["text/markdown"]);

  if (markdown) {
    return (
      <MarkdownRenderer
        source={markdown}
        filePath={filePath}
        className="rounded-[14px] border border-default bg-input px-4 py-4"
      />
    );
  }

  const jsonValue = data["application/json"];

  if (jsonValue != null) {
    return (
      <pre className="overflow-x-auto rounded-[14px] border border-default bg-input px-4 py-3 text-xs leading-6 text-secondary">
        {typeof jsonValue === "string" ? jsonValue : JSON.stringify(jsonValue, null, 2)}
      </pre>
    );
  }

  const plainText = coerceText(data["text/plain"]);

  return (
    <pre className="overflow-x-auto rounded-[14px] border border-default bg-input px-4 py-3 text-xs leading-6 text-secondary">
      {plainText}
    </pre>
  );
}

export default function OutputRenderer({
  outputs,
  hasUnsupportedOutputs,
  filePath,
  theme,
}: OutputRendererProps) {
  if (outputs.length === 0 && !hasUnsupportedOutputs) {
    return null;
  }

  return (
    <div className="flex flex-col gap-3">
      {outputs.map((output, index) => {
        if (output.output_type === "stream") {
          return (
            <pre
              key={`${output.output_type}-${index}`}
              className={`overflow-x-auto rounded-[14px] border px-4 py-3 text-xs leading-6 ${
                output.name === "stderr"
                  ? "border-[color:var(--error)] bg-[rgba(217,121,121,0.08)] text-error"
                  : "border-default bg-input text-secondary"
              }`}
            >
              {output.text}
            </pre>
          );
        }

        if (output.output_type === "error") {
          const traceback = output.traceback.join("");

          return (
            <div
              key={`${output.output_type}-${index}`}
              className="rounded-[14px] border border-[color:var(--error)] bg-[rgba(217,121,121,0.08)] px-4 py-3"
            >
              <div className="text-sm font-medium text-error">
                {output.ename}
                {output.evalue ? `: ${output.evalue}` : ""}
              </div>
              {traceback ? (
                <pre className="mt-3 overflow-x-auto text-xs leading-6 text-error">{traceback}</pre>
              ) : null}
            </div>
          );
        }

        return (
          <div key={`${output.output_type}-${index}`} className="overflow-hidden">
            {renderRichOutput(output, filePath, theme)}
          </div>
        );
      })}

      {hasUnsupportedOutputs ? (
        <div className="rounded-[14px] border border-dashed border-default px-4 py-3 text-xs leading-6 text-secondary">
          В этом ноутбуке есть сохранённые выводы, которые этот просмотрщик пока не умеет
          отображать. Они будут сохранены при повторном сохранении файла.
        </div>
      ) : null}
    </div>
  );
}
