import { useCallback } from "react";
import { clearFiles, markFileSaved } from "../features/files/filesSlice";
import { setTerminalVisible, terminalReady } from "../features/runner/runnerSlice";
import { setRootPath } from "../features/workspace/workspaceSlice";
import { useAppDispatch, useAppSelector } from "../store/hooks";

export function useDesktopActions() {
  const dispatch = useAppDispatch();
  const isRunning = useAppSelector((state) => state.runner.isRunning);
  const isTerminalVisible = useAppSelector((state) => state.runner.isVisible);
  const activeFile = useAppSelector((state) =>
    state.files.openedFiles.find((file) => file.path === state.files.activeFilePath),
  );

  const openFolder = useCallback(async () => {
    try {
      const result = await window.electronAPI.openFolder();

      if (!result) {
        return null;
      }

      dispatch(clearFiles());
      dispatch(setRootPath(result.folderPath));

      return result.folderPath;
    } catch (error) {
      console.error("Ошибка при открытии папки", error);
      return null;
    }
  }, [dispatch]);

  const saveActiveFile = useCallback(async () => {
    if (!activeFile) {
      return {
        ok: false,
        message: "Нет активного файла для сохранения.",
      };
    }

    try {
      await window.electronAPI.writeFile(activeFile.path, activeFile.content);
      dispatch(markFileSaved(activeFile.path));

      return {
        ok: true,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Не удалось сохранить текущий файл.";

      return {
        ok: false,
        message,
      };
    }
  }, [activeFile, dispatch]);

  const ensureTerminalSession = useCallback(async () => {
    const session = await window.electronAPI.ensureTerminalSession();

    dispatch(terminalReady({ shellLabel: session.shellLabel }));

    return session;
  }, [dispatch]);

  const openTerminal = useCallback(async () => {
    const session = await ensureTerminalSession();

    dispatch(setTerminalVisible(true));

    return session;
  }, [dispatch, ensureTerminalSession]);

  const toggleTerminal = useCallback(async () => {
    if (isTerminalVisible) {
      dispatch(setTerminalVisible(false));
      return null;
    }

    return openTerminal();
  }, [dispatch, isTerminalVisible, openTerminal]);

  const printTerminalMessage = useCallback(
    async (message: string) => {
      await ensureTerminalSession();
      await window.electronAPI.printTerminalMessage(message);
    },
    [ensureTerminalSession],
  );

  const clearTerminal = useCallback(async () => {
    await ensureTerminalSession();
    await window.electronAPI.clearTerminal();
  }, [ensureTerminalSession]);

  const runActivePythonFile = useCallback(async () => {
    if (isRunning) {
      return {
        ok: false,
      };
    }

    await openTerminal();

    if (!activeFile) {
      await printTerminalMessage("Нет активного файла для запуска.");
      return {
        ok: false,
      };
    }

    if (activeFile.extension?.toLowerCase() !== "py") {
      await printTerminalMessage(
        "Для локального запуска откройте активный Python-файл с расширением .py.",
      );
      return {
        ok: false,
      };
    }

    if (activeFile.isDirty) {
      const saveResult = await saveActiveFile();

      if (!saveResult.ok) {
        await printTerminalMessage(
          saveResult.message ?? "Не удалось сохранить текущий файл перед запуском.",
        );
        return {
          ok: false,
        };
      }
    }

    try {
      await window.electronAPI.runPythonInTerminal(activeFile.path);

      return {
        ok: true,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Не удалось запустить Python-файл.";

      await printTerminalMessage(message);

      return {
        ok: false,
      };
    }
  }, [activeFile, isRunning, openTerminal, printTerminalMessage, saveActiveFile]);

  return {
    activeFile,
    isRunning,
    openFolder,
    saveActiveFile,
    ensureTerminalSession,
    openTerminal,
    toggleTerminal,
    clearTerminal,
    runActivePythonFile,
  };
}
