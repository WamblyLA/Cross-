import { Text } from "react-native";
import { Card } from "../common/Card";
import { MarkdownPreview } from "../markdown/MarkdownPreview";

type NotebookMarkdownCellProps = {
  index: number;
  source: string;
};

export function NotebookMarkdownCell({ index, source }: NotebookMarkdownCellProps) {
  return (
    <Card className="gap-2">
      <Text className="will-change-variable text-[11px] font-bold uppercase tracking-[1.4px] text-secondary">
        {`Markdown-ячейка ${index + 1}`}
      </Text>
      <MarkdownPreview content={source} framed={false} scrollable={false} />
    </Card>
  );
}
