import { Text } from "react-native";
import { Card } from "../common/Card";
import { MarkdownPreview } from "../markdown/MarkdownPreview";

type NotebookMarkdownCellProps = {
  index: number;
  source: string;
};

export function NotebookMarkdownCell({
  index,
  source,
}: NotebookMarkdownCellProps) {
  return (
    <Card>
      <Text className="will-change-variable text-xs font-bold text-secondary">{`Markdown-ячейка ${index + 1}`}</Text>
      <MarkdownPreview content={source} scrollable={false} />
    </Card>
  );
}
