import { Text, View } from "react-native";
import { MonospaceBlock } from "../file/MonospaceBlock";
import { MarkdownPreview } from "../markdown/MarkdownPreview";
import type { NotebookOutput } from "../../types/notebook";

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
      <Text className="text-xs font-bold text-secondary">Вывод</Text>

      {outputs.map((output, index) => {
        if (output.outputType === "stream") {
          return <MonospaceBlock compact key={`${output.outputType}-${index}`} text={output.text} />;
        }

        if (output.outputType === "error") {
          const text = [output.ename, output.evalue, ...output.traceback].filter(Boolean).join("\n");
          return <MonospaceBlock compact key={`${output.outputType}-${index}`} text={text} />;
        }

        if (output.mimeType === "text/markdown") {
          return (
            <MarkdownPreview
              content={output.text}
              key={`${output.outputType}-${index}`}
              scrollable={false}
            />
          );
        }

        return <MonospaceBlock compact key={`${output.outputType}-${index}`} text={output.text} />;
      })}

      {hasUnsupportedOutputs ? (
        <Text className="text-xs text-muted">Часть вывода показана в упрощённом виде.</Text>
      ) : null}
    </View>
  );
}
