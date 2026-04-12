import { Text, View } from "react-native";
import { Card } from "../common/Card";
import { NotebookCodeCell } from "./NotebookCodeCell";
import { NotebookMarkdownCell } from "./NotebookMarkdownCell";
import type { NotebookCell } from "../../types/notebook";

type NotebookCellListProps = {
  cells: NotebookCell[];
};

export function NotebookCellList({ cells }: NotebookCellListProps) {
  return (
    <View className="gap-3">
      {cells.map((cell, index) => {
        if (cell.cellType === "markdown") {
          return <NotebookMarkdownCell index={index} key={cell.id} source={cell.source} />;
        }

        if (cell.cellType === "code" && "outputs" in cell) {
          return (
            <NotebookCodeCell
              executionCount={cell.executionCount}
              hasUnsupportedOutputs={cell.hasUnsupportedOutputs}
              index={index}
              key={cell.id}
              outputs={cell.outputs}
              source={cell.source}
            />
          );
        }

        return (
          <Card key={cell.id}>
            <Text className="text-sm font-extrabold text-primary">{`Ячейка ${index + 1}`}</Text>
            <Text className="text-sm leading-6 text-secondary">
              {`Тип "${cell.cellType}" пока не поддерживается в мобильном просмотре.`}
            </Text>
          </Card>
        );
      })}
    </View>
  );
}
