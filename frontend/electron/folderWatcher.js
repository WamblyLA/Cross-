import chokidar from "chokidar";

export function startFolderWatcher(folderPath, onChange) {
  const watcher = chokidar.watch(folderPath, {
    ignoreInitial: true,
    persistent: true
  });

  watcher.on("all", (event, changedPath) => {
    onChange({ event, path: changedPath });
  });

  return watcher;
}