export function getEditorLanguage(extension: string | null | undefined) {
  if (!extension) {
    return "plaintext";
  }

  switch (extension.toLowerCase()) {
    case "py":
      return "python";
    case "ts":
    case "tsx":
      return "typescript";
    case "js":
    case "jsx":
      return "javascript";
    case "cpp":
    case "cc":
    case "cxx":
    case "h":
    case "hpp":
      return "cpp";
    case "json":
      return "json";
    case "md":
      return "markdown";
    case "html":
      return "html";
    case "css":
      return "css";
    default:
      return "plaintext";
  }
}
