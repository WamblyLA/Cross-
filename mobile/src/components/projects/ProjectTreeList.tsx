import { Pressable, Text, View } from "react-native";
import type { ProjectTreeItem } from "../../types/projects";
import { Card } from "../common/Card";

type ProjectTreeListProps = {
  items: ProjectTreeItem[];
  canManage: boolean;
  onOpenFile: (fileId: string, fileName: string) => void;
  onToggleFolder: (folderId: string) => void;
  onOpenFileMenu: (fileId: string) => void;
  onOpenFolderMenu: (folderId: string) => void;
};

export function ProjectTreeList({
  items,
  canManage,
  onOpenFile,
  onToggleFolder,
  onOpenFileMenu,
  onOpenFolderMenu,
}: ProjectTreeListProps) {
  return (
    <Card>
      <Text className="will-change-variable text-lg font-extrabold text-primary">Файлы проекта</Text>
      <View className="gap-1">
        {items.map((item) => {
          const indent = item.level * 16;

          if (item.type === "folder") {
            return (
              <View
                className="min-h-11 flex-row items-center gap-2 rounded-md pr-1"
                key={item.key}
                style={{ paddingLeft: 12 + indent }}
              >
                <Pressable
                  className="flex-1 flex-row items-center gap-2 rounded-md py-2 active:bg-hover"
                  onPress={() => onToggleFolder(item.folder.id)}
                >
                  <Text className="will-change-variable w-4 text-center text-secondary">
                    {item.isExpanded ? "▾" : "▸"}
                  </Text>
                  <Text className="will-change-variable text-sm font-bold text-primary">{item.folder.name}</Text>
                </Pressable>
                {canManage ? (
                  <Pressable
                    className="min-h-9 min-w-9 items-center justify-center rounded-md active:bg-hover"
                    onPress={() => onOpenFolderMenu(item.folder.id)}
                  >
                    <Text className="will-change-variable text-lg text-secondary">⋯</Text>
                  </Pressable>
                ) : null}
              </View>
            );
          }

          return (
            <View
              className="min-h-11 flex-row items-center gap-2 rounded-md pr-1"
              key={item.key}
              style={{ paddingLeft: 16 + indent }}
            >
              <Pressable
                className="flex-1 flex-row items-center gap-2 rounded-md py-2 active:bg-hover"
                onPress={() => onOpenFile(item.file.id, item.file.name)}
              >
                <Text className="will-change-variable w-4 text-center text-accent">•</Text>
                <Text className="will-change-variable text-sm text-primary">{item.file.name}</Text>
              </Pressable>
              {canManage ? (
                <Pressable
                  className="min-h-9 min-w-9 items-center justify-center rounded-md active:bg-hover"
                  onPress={() => onOpenFileMenu(item.file.id)}
                >
                  <Text className="will-change-variable text-lg text-secondary">⋯</Text>
                </Pressable>
              ) : null}
            </View>
          );
        })}
      </View>
    </Card>
  );
}
