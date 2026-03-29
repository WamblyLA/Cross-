import type { ThemeName } from "../../../styles/tokens";
import NotebookMimeRendererHost from "./output/NotebookMimeRendererHost";
import type { NotebookOutput } from "./types";

type OutputRendererProps = {
  outputs: NotebookOutput[];
  hasUnsupportedOutputs: boolean;
  filePath: string;
  theme: ThemeName;
};

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
            <NotebookMimeRendererHost output={output} filePath={filePath} theme={theme} />
          </div>
        );
      })}

      {hasUnsupportedOutputs ? (
        <div className="rounded-[14px] border border-dashed border-default px-4 py-3 text-xs leading-6 text-secondary">
          В этом ноутбуке есть сохранённые выводы, которые этот просмотрщик пока не умеет
          отображать
        </div>
      ) : null}
    </div>
  );
}
