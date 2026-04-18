const DEFAULT_API_BASE_URL = "https://api.crosspp.ru";

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

export const API_BASE_URL = trimTrailingSlash(
  process.env.EXPO_PUBLIC_API_BASE_URL?.trim() || DEFAULT_API_BASE_URL,
);

export function resolveWsUrl(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(normalizedPath, `${API_BASE_URL}/`);

  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";

  return url.toString();
}
