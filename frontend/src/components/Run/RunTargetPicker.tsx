import { useMemo } from "react";
import { selectActiveFile } from "../../features/files/filesSelectors";
import {
  selectRunConfigurations,
  selectRunCurrentSession,
  selectRunSelectedConfigurationId,
} from "../../features/run/runSelectors";
import { getRunConfigurationAvailability } from "../../features/run/runUtils";
import { useRunActions } from "../../hooks/useRunActions";
import { useAppSelector } from "../../store/hooks";
import FloatingMenu, { type MenuSection } from "../../ui/FloatingMenu";

type RunTargetPickerProps = {
  anchorRect: DOMRect;
  onClose: () => void;
  onRun: () => Promise<unknown> | void;
  onStop: () => Promise<unknown> | void;
  onRerun: () => Promise<unknown> | void;
};

export default function RunTargetPicker({
  anchorRect,
  onClose,
  onRun,
  onStop,
  onRerun,
}: RunTargetPickerProps) {
  const activeFile = useAppSelector(selectActiveFile);
  const configurations = useAppSelector(selectRunConfigurations);
  const selectedConfigurationId = useAppSelector(selectRunSelectedConfigurationId);
  const currentSession = useAppSelector(selectRunCurrentSession);
  const { openRunConfigurationDialog, selectConfiguration, workspaceDescriptor } = useRunActions();

  const sections = useMemo<MenuSection[]>(() => {
    const isBusy = currentSession
      ? ["preparing", "materializing", "building", "running"].includes(currentSession.status)
      : false;

    return [
      {
        id: "run-actions",
        title: "Действия",
        items: [
          {
            id: "run-selected",
            label: "Запустить",
            shortcut: "F5",
            disabled: isBusy,
            onSelect: async () => {
              await onRun();
            },
          },
          {
            id: "stop-run",
            label: "Остановить",
            shortcut: "Shift+F5",
            disabled: !isBusy,
            onSelect: async () => {
              await onStop();
            },
          },
          {
            id: "rerun",
            label: "Перезапустить",
            disabled: !currentSession?.canRerun || isBusy,
            onSelect: async () => {
              await onRerun();
            },
          },
        ],
      },
      {
        id: "run-configurations",
        title: "Конфигурации",
        items: configurations.map((configuration) => {
          const availability = getRunConfigurationAvailability(configuration, {
            workspaceDescriptor,
            activeFile,
          });
          const isSelected = configuration.id === selectedConfigurationId;
          const labelPrefix = isSelected ? "• " : "";

          return {
            id: configuration.id,
            label: availability.available
              ? `${labelPrefix}${configuration.name}`
              : `${labelPrefix}${configuration.name} — ${availability.reason}`,
            disabled: !availability.available,
            onSelect: async () => {
              await selectConfiguration(configuration.id);
            },
          };
        }),
      },
      {
        id: "run-manage",
        items: [
          {
            id: "edit-configurations",
            label: "Изменить конфигурации...",
            onSelect: async () => {
              await openRunConfigurationDialog();
            },
          },
        ],
      },
    ];
  }, [
    activeFile,
    configurations,
    currentSession,
    onRerun,
    onRun,
    onStop,
    openRunConfigurationDialog,
    selectConfiguration,
    selectedConfigurationId,
    workspaceDescriptor,
  ]);

  return (
    <FloatingMenu
      sections={sections}
      position={{ type: "anchor", rect: anchorRect, align: "right" }}
      onClose={onClose}
      width={320}
    />
  );
}
