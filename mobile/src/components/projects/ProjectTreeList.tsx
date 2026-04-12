import { Pressable, Text, View } from "react-native";
import { Card } from "../common/Card";
import type { ProjectTreeItem } from "../../types/projects";

type ProjectTreeListProps = {
  items: ProjectTreeItem[];
  onOpenFile: (fileId: string, fileName: string) => void;
  onToggleFolder: (folderId: string) => void;
};

export function ProjectTreeList({
  items,
  onOpenFile,
  onToggleFolder,
}: ProjectTreeListProps) {
  return (
    <Card>
      <Text className="text-lg font-extrabold text-primary">Файлы проекта</Text>
      <View className="gap-1">
        {items.map((item) => {
          const indent = item.level * 16;

          if (item.type === "folder") {
            return (
              <Pressable
                key={item.key}
                className="min-h-11 flex-row items-center gap-2 rounded-md pr-3 active:bg-hover"
                onPress={() => onToggleFolder(item.folder.id)}
                style={{ paddingLeft: 12 + indent }}
              >
                <Text className="w-4 text-center text-secondary">{item.isExpanded ? "▾" : "▸"}</Text>
                <Text className="text-sm font-bold text-primary">{item.folder.name}</Text>
              </Pressable>
            );
          }

          return (
            <Pressable
              key={item.key}
              className="min-h-11 flex-row items-center gap-2 rounded-md pr-3 active:bg-hover"
              onPress={() => onOpenFile(item.file.id, item.file.name)}
              style={{ paddingLeft: 16 + indent }}
            >
              <Text className="w-4 text-center text-accent">•</Text>
              <Text className="text-sm text-primary">{item.file.name}</Text>
            </Pressable>
          );
        })}
      </View>
    </Card>
  );
}
