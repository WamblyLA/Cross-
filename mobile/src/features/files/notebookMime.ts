export const NOTEBOOK_MIME_PRIORITY = [
  "application/vnd.plotly.v1+json",
  "text/html",
  "image/svg+xml",
  "image/png",
  "image/jpeg",
  "text/markdown",
  "application/json",
  "text/plain",
] as const;

export function coerceMimeText(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((part) => `${part ?? ""}`).join("");
  }

  if (typeof value === "string") {
    return value;
  }

  if (value == null) {
    return "";
  }

  if (typeof value === "object") {
    return JSON.stringify(value, null, 2);
  }

  return `${value}`;
}

export function pickPreferredMimeType(data: Record<string, unknown>) {
  for (const mimeType of NOTEBOOK_MIME_PRIORITY) {
    if (data[mimeType] != null) {
      return mimeType;
    }
  }

  const vendorMimeType = Object.keys(data).find(
    (mimeType) => mimeType.startsWith("application/vnd.") && data[mimeType] != null,
  );

  if (vendorMimeType) {
    return vendorMimeType;
  }

  return Object.keys(data).find((mimeType) => data[mimeType] != null) ?? null;
}

export function formatMimeLabel(mimeType: string | null) {
  return mimeType ?? "unknown";
}

export function isNotebookImageMimeType(mimeType: string | null) {
  return mimeType === "image/png" || mimeType === "image/jpeg";
}

export function isNotebookSvgMimeType(mimeType: string | null) {
  return mimeType === "image/svg+xml";
}

export function isNotebookHtmlMimeType(mimeType: string | null) {
  return mimeType === "text/html";
}

export function isNotebookPlotlyMimeType(mimeType: string | null) {
  return mimeType === "application/vnd.plotly.v1+json";
}
