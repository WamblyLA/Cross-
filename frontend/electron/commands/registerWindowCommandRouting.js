import { shell } from "electron";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import trustedRendererPolicy from "../security/trustedRenderer.cjs";
import { resolveAppCommandFromInput } from "./appCommands.js";

const { isSafeExternalUrl, isTrustedRendererUrl } = trustedRendererPolicy;

function resolveTrustedRendererUrl() {
  const rendererUrl = process.env.ELECTRON_RENDERER_URL ?? process.env.VITE_DEV_SERVER_URL;

  if (rendererUrl) {
    return rendererUrl;
  }

  const moduleDirectory = path.dirname(fileURLToPath(import.meta.url));
  return pathToFileURL(path.join(moduleDirectory, "../../dist/index.html")).href;
}

function openExternalUrl(url) {
  if (isSafeExternalUrl(url)) {
    void shell.openExternal(url);
  }
}

export function registerWindowCommandRouting(windowInstance, sendToRenderer) {
  if (!windowInstance?.webContents) {
    return;
  }

  const trustedRendererUrl = resolveTrustedRendererUrl();
  const blockUntrustedNavigation = (event, url) => {
    if (isTrustedRendererUrl(url, trustedRendererUrl)) {
      return;
    }

    event.preventDefault();
    openExternalUrl(url);
  };

  windowInstance.webContents.setWindowOpenHandler(({ url }) => {
    openExternalUrl(url);
    return { action: "deny" };
  });
  windowInstance.webContents.on("will-navigate", blockUntrustedNavigation);
  windowInstance.webContents.on("will-redirect", blockUntrustedNavigation);

  windowInstance.webContents.on("before-input-event", (event, input) => {
    const commandId = resolveAppCommandFromInput(input);

    if (!commandId) {
      return;
    }

    event.preventDefault();
    sendToRenderer("app:command", {
      commandId,
    });
  });
}
