const DEFAULT_API_BASE_URL =
  window.location.protocol === "file:"
    ? "https://api.crosspp.ru"
    : "http://127.0.0.1:3000";

type AppConfigBridge = {
  getAppConfig?: () => {
    apiBaseUrl: string | null;
  };
};

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

function toWsUrl(url: string) {
  if (url.startsWith("https://")) {
    return url.replace("https://", "wss://");
  }

  if (url.startsWith("http://")) {
    return url.replace("http://", "ws://");
  }

  return url;
}

function readRuntimeApiBaseUrl() {
  if (typeof window === "undefined") {
    return null;
  }

  const bridge = (window as Window & { electronAPI?: AppConfigBridge })
    .electronAPI;
  return bridge?.getAppConfig?.().apiBaseUrl?.trim() || null;
}

export const API_BASE_URL = trimTrailingSlash(
  readRuntimeApiBaseUrl() || DEFAULT_API_BASE_URL
);

export const WS_URL = toWsUrl(API_BASE_URL);

export function resolveWsUrl(path = "") {
  const normalizedBase = trimTrailingSlash(WS_URL);

  if (!path) {
    return normalizedBase;
  }

  return `${normalizedBase}${path.startsWith("/") ? path : `/${path}`}`;
}
