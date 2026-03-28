import { useEffect, useRef, type ReactNode } from "react";

type CloudInlineInputProps = {
  icon: ReactNode;
  value: string;
  placeholder: string;
  depth?: number;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
};

export default function CloudInlineInput({
  icon,
  value,
  placeholder,
  depth = 0,
  onChange,
  onSubmit,
  onCancel,
}: CloudInlineInputProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  return (
    <div className="px-2 py-1.5" style={{ paddingLeft: `${depth * 16 + 8}px` }}>
      <div className="ui-tree-item flex items-center gap-2 border border-default bg-active px-2 py-1.5">
        <span className="w-4 shrink-0" />
        <span className="flex w-4 shrink-0 justify-center text-secondary">{icon}</span>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onCancel}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              onSubmit();
            }

            if (event.key === "Escape") {
              event.preventDefault();
              onCancel();
            }
          }}
          placeholder={placeholder}
          className="w-full border-none bg-transparent text-sm text-primary placeholder:text-muted focus:outline-none focus:ring-0"
        />
      </div>
    </div>
  );
}
