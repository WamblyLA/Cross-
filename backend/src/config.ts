const DEFAULT_PORT = 3000;
const DEFAULT_RENDERER_ORIGIN = "http://127.0.0.1:5173";

function parsePort(value: string | undefined) {
  const port = Number.parseInt(value ?? `${DEFAULT_PORT}`, 10);

  if (Number.isNaN(port) || port <= 0) {
    return DEFAULT_PORT;
  }

  return port;
}

function parseOrigins(value: string | undefined) {
  const source = value ?? DEFAULT_RENDERER_ORIGIN;

  return source
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
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

export const NODE_ENV = process.env.NODE_ENV ?? "development";
export const IS_PROD = NODE_ENV === "production";
export const PORT = parsePort(process.env.PORT);
export const CORS_ORIGINS = parseOrigins(process.env.CORS_ORIGIN);
export const API_URL = `http://127.0.0.1:${PORT}`;
export const WS_URL = toWsUrl(API_URL);
