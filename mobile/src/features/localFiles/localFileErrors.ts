export type LocalFileLoadErrorCode =
  | "unsupported-extension"
  | "unreadable-file"
  | "empty-file"
  | "invalid-notebook";

export class LocalFileLoadError extends Error {
  readonly code: LocalFileLoadErrorCode;
  readonly userMessage: string;

  constructor(code: LocalFileLoadErrorCode, userMessage: string) {
    super(userMessage);
    this.code = code;
    this.userMessage = userMessage;
  }
}

export function isLocalFileLoadError(error: unknown): error is LocalFileLoadError {
  return error instanceof LocalFileLoadError;
}
