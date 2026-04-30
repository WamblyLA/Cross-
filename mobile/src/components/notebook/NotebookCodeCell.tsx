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
    <Card className="gap-2">
      <Text className="will-change-variable text-[11px] font-bold uppercase tracking-[1.4px] text-secondary">
        {`Code ${index + 1}${executionCount != null ? ` - In [${executionCount}]` : ""}`}
      </Text>
      <MonospaceBlock text={source} />
      <NotebookOutputList hasUnsupportedOutputs={hasUnsupportedOutputs} outputs={outputs} />
    </Card>
  );
}
