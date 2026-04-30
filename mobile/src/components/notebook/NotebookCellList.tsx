import { Text, View } from "react-native";
import type { NotebookCellModel } from "../../types/notebook";
import { Card } from "../common/Card";
import { NotebookCodeCell } from "./NotebookCodeCell";
import { NotebookMarkdownCell } from "./NotebookMarkdownCell";

type NotebookCellListProps = {
  cells: NotebookCellModel[];
};

export function NotebookCellList({ cells }: NotebookCellListProps) {
  return (
    <View className="gap-2">
      {cells.map((cell, index) => {
        if (cell.cellType === "markdown") {
          return <NotebookMarkdownCell index={index} key={cell.localId} source={cell.source} />;
        }

        if (cell.cellType === "code") {
          return (
            <NotebookCodeCell
              executionCount={cell.executionCount}
              hasUnsupportedOutputs={cell.hasUnsupportedOutputs}
              index={index}
              key={cell.localId}
              outputs={cell.outputs}
              source={cell.source}
            />
          );
        }

        return (
          <Card key={cell.localId}>
            <Text className="will-change-variable text-sm font-extrabold text-primary">{`Ячейка ${index + 1}`}</Text>
            <Text className="will-change-variable text-sm leading-6 text-secondary">
              {`Тип "${cell.cellType}" пока не поддерживается в мобильном просмотре.`}
            </Text>
          </Card>
        );
      })}
    </View>
  );
}
