import { useEffect, useMemo, useState, type ReactNode } from "react";

const TEXT_OUTPUT_LINE_LIMIT = 50;

type NotebookTextOutputProps = {
  text: string;
  outputKey: string;
  tone?: "default" | "error";
  header?: ReactNode;
};

function splitOutputLines(text: string) {
  return text.split(/\r?\n/);
}

export default function NotebookTextOutput({
  text,
  outputKey,
  tone = "default",
  header = null,
}: NotebookTextOutputProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const lines = useMemo(() => splitOutputLines(text), [text]);
  const isCollapsible = lines.length > TEXT_OUTPUT_LINE_LIMIT;
  const visibleText =
    isExpanded || !isCollapsible
      ? text
      : lines.slice(0, TEXT_OUTPUT_LINE_LIMIT).join("\n");
  const containerClassName =
    tone === "error"
      ? "border-[color:var(--error)] bg-[rgba(217,121,121,0.08)] text-error"
      : "border-default bg-input text-secondary";

  useEffect(() => {
    setIsExpanded(false);
  }, [outputKey]);

  return (
    <div className={`overflow-hidden rounded-[10px] border ${containerClassName}`}>
      {header ? <div className="border-b border-current/15 px-3 py-2">{header}</div> : null}

      <pre className="ui-scrollbar-x overflow-x-auto px-3 py-2 text-xs leading-6 whitespace-pre">
        {visibleText}
      </pre>

      {isCollapsible ? (
        <div className="border-t border-current/15 px-3 py-2">
          <button
            type="button"
            className="ui-control rounded-md px-2 py-1 text-xs text-secondary"
            onClick={() => setIsExpanded((currentValue) => !currentValue)}
          >
            {isExpanded ? "Свернуть" : "Показать ещё"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
