import { useEffect, useRef, type ReactNode } from "react";
import { CiFileOn } from "react-icons/ci";
import { IoMdFolder } from "react-icons/io";
import { FILE_TREE_INDENT_SIZE_PX, FILE_TREE_ROW_BASE_PADDING_PX } from "./fileTreeConstants";
import type { TreeDraft } from "./fileTreeTypes";

type FileTreeInlineInputProps = {
  value: string;
  placeholder: string;
  depth: number;
  nodeType: TreeDraft["nodeType"];
  variant: "draft" | "rename";
  leadingSlot?: ReactNode;
  withOuterPadding?: boolean;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
};

export default function FileTreeInlineInput({
  value,
  placeholder,
  depth,
  nodeType,
  variant,
  leadingSlot,
  withOuterPadding = true,
  onChange,
  onSubmit,
  onCancel,
}: FileTreeInlineInputProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const content = (
    <div
      className="px-2 py-1.5"
      style={{ paddingLeft: `${depth * FILE_TREE_INDENT_SIZE_PX + FILE_TREE_ROW_BASE_PADDING_PX}px` }}
    >
      <div className="ui-tree-item flex min-w-0 items-center gap-2 border border-default bg-active px-2 py-1.5">
        <span className="flex w-4 shrink-0 justify-center text-secondary">{leadingSlot ?? null}</span>
        <span className="flex w-4 shrink-0 justify-center text-secondary">
          {nodeType === "folder" ? (
            <IoMdFolder className="h-4 w-4" />
          ) : (
            <CiFileOn className="h-4 w-4" />
          )}
        </span>
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
          className={
            variant === "rename"
              ? "w-full rounded-[6px] border border-default bg-input px-2 py-1 text-sm text-primary focus:outline-none focus:ring-0"
              : "w-full border-none bg-transparent text-sm text-primary placeholder:text-muted focus:outline-none focus:ring-0"
          }
        />
      </div>
    </div>
  );

  if (withOuterPadding) {
    return content;
  }

  return (
    <div className="ui-tree-item flex min-w-0 items-center gap-2 border border-default bg-active px-2 py-1.5">
      <span className="flex w-4 shrink-0 justify-center text-secondary">{leadingSlot ?? null}</span>
      <span className="flex w-4 shrink-0 justify-center text-secondary">
        {nodeType === "folder" ? (
          <IoMdFolder className="h-4 w-4" />
        ) : (
          <CiFileOn className="h-4 w-4" />
        )}
      </span>
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
        className={
          variant === "rename"
            ? "w-full rounded-[6px] border border-default bg-input px-2 py-1 text-sm text-primary focus:outline-none focus:ring-0"
            : "w-full border-none bg-transparent text-sm text-primary placeholder:text-muted focus:outline-none focus:ring-0"
        }
      />
    </div>
  );
}
