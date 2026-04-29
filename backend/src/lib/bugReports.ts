import {
  TELEGRAM_BOT_TOKEN,
  TELEGRAM_BUG_REPORT_CHAT_ID,
} from "../config.js";

const TELEGRAM_MAX_MESSAGE_LENGTH = 4096;
const DESCRIPTION_TRUNCATION_SUFFIX = "\n...";

export type BugReportReporter =
  | {
      kind: "anonymous";
    }
  | {
      kind: "authenticated";
      userId: string;
      username: string | null;
      email: string | null;
    };

export type BugReportInput = {
  title: string;
  description: string;
  reporter: BugReportReporter;
  userAgent?: string | null | undefined;
};

type BugReportDeliveryContext = {
  reason: "missing_config" | "telegram_http_error" | "telegram_api_error" | "network_error";
  httpStatus?: number;
  telegramStatusText?: string;
  errorName?: string;
  errorMessage?: string;
};

export class BugReportDeliveryError extends Error {
  readonly safeContext: BugReportDeliveryContext;

  constructor(message: string, safeContext: BugReportDeliveryContext) {
    super(message);
    this.name = "BugReportDeliveryError";
    this.safeContext = safeContext;
  }
}

function replaceUnsupportedControlCharacters(value: string) {
  return Array.from(value, (character) => {
    const code = character.charCodeAt(0);
    const isUnsupportedControlCharacter =
      (code >= 0 && code <= 8) ||
      code === 11 ||
      code === 12 ||
      (code >= 14 && code <= 31) ||
      code === 127;

    return isUnsupportedControlCharacter ? " " : character;
  }).join("");
}

function sanitizeTelegramText(value: string) {
  return replaceUnsupportedControlCharacters(
    value.replace(/\r\n/g, "\n").replace(/\r/g, "\n"),
  ).trim();
}

function formatReporter(reporter: BugReportReporter) {
  if (reporter.kind === "anonymous") {
    return "anonymous";
  }

  return [
    "authenticated",
    `userId=${reporter.userId}`,
    `username=${reporter.username ?? "unknown"}`,
    `email=${reporter.email ?? "unknown"}`,
  ].join(" | ");
}

function normalizeStatusText(value: unknown) {
  return typeof value === "string" && value.trim().length > 0
    ? sanitizeTelegramText(value)
    : "unknown";
}

export function buildBugReportTelegramMessage({
  title,
  description,
  reporter,
  userAgent,
}: BugReportInput) {
  const normalizedTitle = sanitizeTelegramText(title);
  const normalizedDescription = sanitizeTelegramText(description);
  const normalizedUserAgent =
    typeof userAgent === "string" && userAgent.trim().length > 0
      ? sanitizeTelegramText(userAgent)
      : null;

  const headerLines = [
    "CROSS++ bug report",
    `Reporter: ${formatReporter(reporter)}`,
    `Reported at: ${new Date().toISOString()}`,
    ...(normalizedUserAgent ? [`User-Agent: ${normalizedUserAgent}`] : []),
    "",
    "Title:",
    normalizedTitle,
    "",
    "Description:",
  ];
  const prefix = `${headerLines.join("\n")}\n`;
  const availableDescriptionLength = TELEGRAM_MAX_MESSAGE_LENGTH - prefix.length;

  if (availableDescriptionLength <= 0) {
    return prefix.slice(0, TELEGRAM_MAX_MESSAGE_LENGTH);
  }

  let finalDescription = normalizedDescription;

  if (finalDescription.length > availableDescriptionLength) {
    const truncatedLength = Math.max(
      0,
      availableDescriptionLength - DESCRIPTION_TRUNCATION_SUFFIX.length,
    );
    finalDescription = `${finalDescription.slice(0, truncatedLength).trimEnd()}${DESCRIPTION_TRUNCATION_SUFFIX}`;
  }

  return `${prefix}${finalDescription}`;
}

export async function sendBugReportToTelegram(input: BugReportInput) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_BUG_REPORT_CHAT_ID) {
    throw new BugReportDeliveryError("Telegram bug report config is missing", {
      reason: "missing_config",
    });
  }

  const message = buildBugReportTelegramMessage(input);
  const endpoint = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

  let response: Response;

  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: TELEGRAM_BUG_REPORT_CHAT_ID,
        text: message,
      }),
    });
  } catch (error) {
    throw new BugReportDeliveryError("Network error while sending Telegram bug report", {
      reason: "network_error",
      errorName: error instanceof Error ? error.name : "UnknownError",
      errorMessage: error instanceof Error ? sanitizeTelegramText(error.message) : "Unknown error",
    });
  }

  let payload: unknown;

  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const telegramStatusText =
      payload &&
      typeof payload === "object" &&
      "description" in payload
        ? normalizeStatusText((payload as { description?: unknown }).description)
        : normalizeStatusText(response.statusText);

    throw new BugReportDeliveryError("Telegram returned a non-success HTTP status", {
      reason: "telegram_http_error",
      httpStatus: response.status,
      telegramStatusText,
    });
  }

  const telegramOk =
    payload &&
    typeof payload === "object" &&
    "ok" in payload &&
    (payload as { ok?: unknown }).ok === true;

  if (!telegramOk) {
    const telegramStatusText =
      payload &&
      typeof payload === "object" &&
      "description" in payload
        ? normalizeStatusText((payload as { description?: unknown }).description)
        : "Telegram API returned ok=false";

    throw new BugReportDeliveryError("Telegram API returned ok=false", {
      reason: "telegram_api_error",
      telegramStatusText,
    });
  }
}
