import { Text } from "react-native";
import type { NotebookOutput } from "../../types/notebook";
import { Card } from "../common/Card";
import { MonospaceBlock } from "../file/MonospaceBlock";
import { NotebookOutputList } from "./NotebookOutputList";

type NotebookCodeCellProps = {
  index: number;
  source: string;
  executionCount: number | null;
  outputs: NotebookOutput[];
  hasUnsupportedOutputs: boolean;
};

export function NotebookCodeCell({
  index,
  source,
  executionCount,
  outputs,
  hasUnsupportedOutputs,
}: NotebookCodeCellProps) {
  return (
    <Card>
      <Text className="will-change-variable mb-1 text-xs font-bold text-secondary">
        {`Code-ячейка ${index + 1}${executionCount != null ? ` • In [${executionCount}]` : ""}`}
      </Text>
      <MonospaceBlock text={source} />
      <NotebookOutputList hasUnsupportedOutputs={hasUnsupportedOutputs} outputs={outputs} />
    </Card>
  );
}
