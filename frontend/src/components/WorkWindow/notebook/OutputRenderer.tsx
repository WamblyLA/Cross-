import type { ThemeName } from "../../../styles/tokens";
import NotebookMimeRendererHost from "./output/NotebookMimeRendererHost";
import NotebookTextOutput from "./output/NotebookTextOutput";
import type { NotebookOutput } from "./types";

type OutputRendererProps = {
  cellLocalId: string;
  outputs: NotebookOutput[];
  hasUnsupportedOutputs: boolean;
  filePath: string;
  theme: ThemeName;
};

export default function OutputRenderer({
  cellLocalId,
  outputs,
  hasUnsupportedOutputs,
  filePath,
  theme,
}: OutputRendererProps) {
  if (outputs.length === 0 && !hasUnsupportedOutputs) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2">
      {outputs.map((output, index) => {
        const outputKey = `${cellLocalId}:${index}:${output.output_type}`;

        if (output.output_type === "stream") {
          return (
            <NotebookTextOutput
              key={outputKey}
              outputKey={outputKey}
              text={output.text}
              tone={output.name === "stderr" ? "error" : "default"}
            />
          );
        }

        if (output.output_type === "error") {
          const traceback = output.traceback.join("");

          return (
            <NotebookTextOutput
              key={outputKey}
              outputKey={outputKey}
              text={traceback}
              tone="error"
              header={(
                <div className="text-sm font-medium text-error">
                  {output.ename}
                  {output.evalue ? `: ${output.evalue}` : ""}
                </div>
              )}
            />
          );
        }

        return (
          <div key={outputKey} className="overflow-hidden">
            <NotebookMimeRendererHost
              output={output}
              outputKey={outputKey}
              filePath={filePath}
              theme={theme}
            />
          </div>
        );
      })}

      {hasUnsupportedOutputs ? (
        <div className="rounded-[10px] border border-dashed border-default px-3 py-2 text-xs leading-6 text-secondary">
          В этом ноутбуке есть сохранённые выводы, которые этот просмотрщик пока не умеет
          отображать.
        </div>
      ) : null}
    </div>
  );
}
