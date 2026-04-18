import { Text, View } from "react-native";
import type { NotebookOutput } from "../../types/notebook";
import { MonospaceBlock } from "../file/MonospaceBlock";
import { NotebookRichOutputRenderer } from "./NotebookRichOutputRenderer";

type NotebookOutputListProps = {
  outputs: NotebookOutput[];
  hasUnsupportedOutputs: boolean;
};

export function NotebookOutputList({
  outputs,
  hasUnsupportedOutputs,
}: NotebookOutputListProps) {
  if (outputs.length === 0 && !hasUnsupportedOutputs) {
    return null;
  }

  return (
    <View className="gap-2">
      <Text className="will-change-variable text-xs font-bold text-secondary">Вывод</Text>

      {outputs.map((output, index) => {
        if (output.outputType === "stream") {
          return <MonospaceBlock compact key={`${output.outputType}-${index}`} text={output.text} />;
        }

        if (output.outputType === "error") {
          const text = [output.ename, output.evalue, ...output.traceback].filter(Boolean).join("\n");
          return <MonospaceBlock compact key={`${output.outputType}-${index}`} text={text} />;
        }

        return (
          <NotebookRichOutputRenderer
            key={`${output.outputType}-${index}-${output.mimeType ?? "fallback"}`}
            output={output}
          />
        );
      })}

      {hasUnsupportedOutputs ? (
        <Text className="will-change-variable text-xs text-muted">Часть вывода показана в упрощённом виде.</Text>
      ) : null}
    </View>
  );
}
