const ANSI_ESCAPE_PATTERN =
  // eslint-disable-next-line no-control-regex
  /\u001b(?:\][^\u0007]*(?:\u0007|\u001b\\)|[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g;

export function sanitizeNotebookTextOutput(value: string) {
  return value.replace(ANSI_ESCAPE_PATTERN, "").replace(/\r\n/g, "\n");
}
