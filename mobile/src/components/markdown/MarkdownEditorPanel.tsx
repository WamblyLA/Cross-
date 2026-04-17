import { Pressable, Text, View } from "react-native";
import { TextFileEditor } from "../file/TextFileEditor";
import { MarkdownPreview } from "./MarkdownPreview";
import { cn } from "../../lib/utils/cn";

type MarkdownEditorPanelProps = {
  value: string;
  editable: boolean;
  mode: "edit" | "preview";
  onChangeMode: (mode: "edit" | "preview") => void;
  onChangeText: (value: string) => void;
};

export function MarkdownEditorPanel({
  value,
  editable,
  mode,
  onChangeMode,
  onChangeText,
}: MarkdownEditorPanelProps) {
  return (
    <View className="flex-1 gap-3">
      <View className="will-change-variable flex-row gap-2 rounded-md border border-default bg-editor p-1">
        {editable ? (
          <Pressable
            className={cn(
              "will-change-variable min-h-10 flex-1 items-center justify-center rounded-sm border px-3",
              mode === "edit" ? "border-default bg-active" : "border-transparent bg-transparent",
            )}
            onPress={() => onChangeMode("edit")}
          >
            <Text
              className={cn(
                "will-change-variable text-xs font-bold uppercase tracking-[2px]",
                mode === "edit" ? "text-primary" : "text-secondary",
              )}
            >
              Редактирование
            </Text>
          </Pressable>
        ) : null}

        <Pressable
          className={cn(
            "will-change-variable min-h-10 flex-1 items-center justify-center rounded-sm border px-3",
            mode === "preview" ? "border-default bg-active" : "border-transparent bg-transparent",
          )}
          onPress={() => onChangeMode("preview")}
        >
          <Text
            className={cn(
              "will-change-variable text-xs font-bold uppercase tracking-[2px]",
              mode === "preview" ? "text-primary" : "text-secondary",
            )}
          >
            Просмотр
          </Text>
        </Pressable>
      </View>

      {mode === "edit" && editable ? (
        <TextFileEditor editable={editable} onChangeText={onChangeText} value={value} />
      ) : (
        <MarkdownPreview content={value} />
      )}
    </View>
  );
}
