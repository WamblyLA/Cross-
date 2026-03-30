import { selectIsAuthenticated } from "../../features/auth/authSelectors";
import {
  selectAccountVisualSettings,
  selectCurrentVisualSettings,
  selectVisualSettingsActionError,
  selectVisualSettingsLoadPending,
  selectVisualSettingsSyncPending,
} from "../../features/visualSettings/visualSettingsSelectors";
import { applyVisualSettings, clearVisualSettingsError } from "../../features/visualSettings/visualSettingsSlice";
import {
  loadAccountVisualSettings,
  syncVisualSettingsToAccount,
} from "../../features/visualSettings/visualSettingsThunks";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import PrimaryButton from "../../ui/PrimaryButton";
import VisualSettingsForm from "./VisualSettingsForm";

type VisualSettingsPanelProps = {
  title: string;
  description: string;
};

export default function VisualSettingsPanel({
  title,
  description,
}: VisualSettingsPanelProps) {
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const currentSettings = useAppSelector(selectCurrentVisualSettings);
  const accountSettings = useAppSelector(selectAccountVisualSettings);
  const actionError = useAppSelector(selectVisualSettingsActionError);
  const syncPending = useAppSelector(selectVisualSettingsSyncPending);
  const loadPending = useAppSelector(selectVisualSettingsLoadPending);

  return (
    <VisualSettingsForm
      title={title}
      description={description}
      value={currentSettings}
      onChange={(nextPatch) => {
        dispatch(clearVisualSettingsError());
        dispatch(applyVisualSettings(nextPatch));
      }}
      footer={
        <>
          <div className="rounded-[12px] border border-default bg-editor px-4 py-3 text-sm text-secondary">
            {isAuthenticated
              ? accountSettings
                ? "Локальные изменения применяются сразу. Синхронизация с аккаунтом выполняется при нажатии"
                : "Локальные изменения применяются сразу. Настройки аккаунта можно загрузить или сохранить"
              : "Для гостей настройки сохраняются локально на этом устройстве"}
          </div>

          {actionError ? <div className="text-sm text-error">{actionError.message}</div> : null}

          {isAuthenticated ? (
            <div className="flex flex-wrap items-center gap-3">
              <PrimaryButton
                onClick={() => {
                  void dispatch(syncVisualSettingsToAccount());
                }}
                disabled={syncPending || loadPending}
                className="h-11 justify-center"
              >
                {syncPending ? "Синхронизируем..." : "Синхронизировать"}
              </PrimaryButton>

              <button
                type="button"
                className="ui-button-secondary ui-control h-11 px-4"
                onClick={() => {
                  void dispatch(loadAccountVisualSettings());
                }}
                disabled={syncPending || loadPending}
              >
                {loadPending ? "Загружаем..." : "Загрузить"}
              </button>
            </div>
          ) : null}
        </>
      }
    />
  );
}
