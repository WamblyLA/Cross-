import type { IncomingMessage } from "node:http";
import { COOKIE_NAME } from "../config.js";
import { extractBearerToken, verifyAuthToken } from "../lib/auth.js";

function parseCookies(headerValue: string | undefined) {
  const cookies = new Map<string, string>();

  if (!headerValue) {
    return cookies;
  }

  for (const chunk of headerValue.split(";")) {
    const [namePart, ...valueParts] = chunk.trim().split("=");

    if (!namePart || valueParts.length === 0) {
      continue;
    }

    cookies.set(namePart, valueParts.join("="));
  }

  return cookies;
}
export function authenticateWebSocketRequest(request: IncomingMessage) {
  const cookies = parseCookies(request.headers.cookie);
  const token = cookies.get(COOKIE_NAME) ?? extractBearerToken(request.headers.authorization);

  if (!token) {
    throw new Error("Требуется авторизация");
  }

  const payload = verifyAuthToken(token);

  return {
    userId: payload.sub,
  };
}
