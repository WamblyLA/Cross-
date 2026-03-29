import { isRecord, type NotebookDocumentModel } from "./types";

const LANGUAGE_ALIASES: Record<string, string> = {
  "c++": "cpp",
  cxx: "cpp",
  py: "python",
  js: "javascript",
  ts: "typescript",
  shell: "shell",
  bash: "shell",
  sh: "shell",
};

export function resolveNotebookCodeCellLanguage(document: NotebookDocumentModel) {
  const metadata = isRecord(document.raw.metadata) ? document.raw.metadata : {};
  const languageInfo = isRecord(metadata.language_info) ? metadata.language_info : null;
  const kernelspec = isRecord(metadata.kernelspec) ? metadata.kernelspec : null;
  const detectedLanguage =
    typeof languageInfo?.name === "string" && languageInfo.name.trim()
      ? languageInfo.name.trim()
      : typeof kernelspec?.language === "string" && kernelspec.language.trim()
        ? kernelspec.language.trim()
        : "python";
  const normalized = detectedLanguage.toLowerCase();

  return LANGUAGE_ALIASES[normalized] ?? normalized;
}
