import { Pressable, Text, View } from "react-native";
import { useTheme } from "../../hooks/useTheme";
import { cn } from "../../lib/utils/cn";
import { Card } from "../common/Card";
import { InlineNotice } from "../common/InlineNotice";

const MIN_FONT_SIZE = 9;
const MAX_FONT_SIZE = 32;
const MIN_TAB_SIZE = 2;
const MAX_TAB_SIZE = 8;

type SettingStepperProps = {
  label: string;
  description: string;
  value: number;
  min: number;
  max: number;
  disabled: boolean;
  onChange: (nextValue: number) => void;
};

function SettingStepper({
  label,
  description,
  value,
  min,
  max,
  disabled,
  onChange,
}: SettingStepperProps) {
  return (
    <View className="gap-2 rounded-md border border-default bg-editor p-3">
      <View className="gap-1">
        <Text className="will-change-variable text-sm font-semibold text-primary">{label}</Text>
        <Text className="will-change-variable text-xs leading-5 text-secondary">{description}</Text>
      </View>

      <View className="flex-row items-center gap-2">
        <Pressable
          className={cn(
            "will-change-variable min-h-10 min-w-10 items-center justify-center rounded-sm border border-default bg-panel",
            disabled || value <= min ? "opacity-50" : "active:translate-y-px",
          )}
          disabled={disabled || value <= min}
          onPress={() => onChange(value - 1)}
        >
          <Text className="will-change-variable text-base font-bold text-primary">-</Text>
        </Pressable>

        <View className="will-change-variable min-h-10 flex-1 items-center justify-center rounded-sm border border-default bg-input px-3">
          <Text className="will-change-variable text-sm font-semibold text-primary">{value}</Text>
        </View>

        <Pressable
          className={cn(
            "will-change-variable min-h-10 min-w-10 items-center justify-center rounded-sm border border-default bg-panel",
            disabled || value >= max ? "opacity-50" : "active:translate-y-px",
          )}
          disabled={disabled || value >= max}
          onPress={() => onChange(value + 1)}
        >
          <Text className="will-change-variable text-base font-bold text-primary">+</Text>
        </Pressable>
      </View>
    </View>
  );
}

export function ThemeSettingsCard() {
  const {
    themeName,
    visualSettings,
    applyTheme,
    updateVisualSettings,
    isThemeSyncPending,
    themeError,
    clearThemeError,
  } = useTheme();

  return (
    <Card>
      <View className="gap-4">
        <View className="gap-1">
          <Text className="will-change-variable text-xs font-bold uppercase tracking-[2.4px] text-muted">
            Редактор
          </Text>
          <Text className="will-change-variable text-sm leading-6 text-secondary">
            Тема, размер шрифта и табуляция синхронизируются с вашим аккаунтом.
          </Text>
        </View>

        <View className="will-change-variable flex-row gap-2 rounded-md border border-default bg-editor p-1">
          <Pressable
            className={cn(
              "will-change-variable min-h-10 flex-1 items-center justify-center rounded-sm border px-3",
              themeName === "dark"
                ? "border-default bg-active"
                : "border-transparent bg-transparent",
            )}
            disabled={isThemeSyncPending}
            onPress={() => {
              void applyTheme("dark");
            }}
          >
            <Text
              className={cn(
                "will-change-variable text-xs font-bold uppercase tracking-[2px]",
                themeName === "dark" ? "text-primary" : "text-secondary",
              )}
            >
              Темная
            </Text>
          </Pressable>

          <Pressable
            className={cn(
              "will-change-variable min-h-10 flex-1 items-center justify-center rounded-sm border px-3",
              themeName === "light"
                ? "border-default bg-active"
                : "border-transparent bg-transparent",
            )}
            disabled={isThemeSyncPending}
            onPress={() => {
              void applyTheme("light");
            }}
          >
            <Text
              className={cn(
                "will-change-variable text-xs font-bold uppercase tracking-[2px]",
                themeName === "light" ? "text-primary" : "text-secondary",
              )}
            >
              Светлая
            </Text>
          </Pressable>
        </View>

        <SettingStepper
          description="Применяется к открытым редакторам на этом устройстве и сохраняется в профиле."
          disabled={isThemeSyncPending}
          label="Размер шрифта"
          max={MAX_FONT_SIZE}
          min={MIN_FONT_SIZE}
          onChange={(nextValue) => {
            void updateVisualSettings({ fontSize: nextValue });
          }}
          value={visualSettings.fontSize}
        />

        <SettingStepper
          description="Хранится в профиле редактора и используется на других устройствах Cross++."
          disabled={isThemeSyncPending}
          label="Размер табуляции"
          max={MAX_TAB_SIZE}
          min={MIN_TAB_SIZE}
          onChange={(nextValue) => {
            void updateVisualSettings({ tabSize: nextValue });
          }}
          value={visualSettings.tabSize}
        />

        {themeError ? (
          <Pressable onPress={clearThemeError}>
            <InlineNotice text={themeError} tone="warning" />
          </Pressable>
        ) : null}
      </View>
    </Card>
  );
}
