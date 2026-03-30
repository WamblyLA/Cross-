import type { KeyboardEventHandler, ReactNode, Ref } from "react";
import { IoSearchOutline } from "react-icons/io5";
import { selectIsAuthenticated } from "../features/auth/authSelectors";
import { selectCloudActiveProject } from "../features/cloud/cloudSelectors";
import { setSearchQuery } from "../features/workspace/workspaceSlice";
import { useAppDispatch, useAppSelector } from "../store/hooks";

type SearchBarProps = {
  className?: string;
  inputClassName?: string;
  trailing?: ReactNode;
  autoFocus?: boolean;
  inputRef?: Ref<HTMLInputElement>;
  placeholder?: string;
  onKeyDown?: KeyboardEventHandler<HTMLInputElement>;
  onEscape?: () => void;
};

function joinClasses(...values: Array<string | undefined | false | null>) {
  return values.filter(Boolean).join(" ");
}

export default function SearchBar({
  className,
  inputClassName,
  trailing,
  autoFocus = false,
  inputRef,
  placeholder,
  onKeyDown,
  onEscape,
}: SearchBarProps) {
  const dispatch = useAppDispatch();
  const source = useAppSelector((state) => state.workspace.source);
  const rootPath = useAppSelector((state) => state.workspace.rootPath);
  const searchQuery = useAppSelector((state) => state.workspace.searchQuery);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const activeCloudProject = useAppSelector(selectCloudActiveProject);

  const resolvedPlaceholder =
    placeholder ??
    (source === "cloud"
      ? !isAuthenticated
        ? "Войдите в аккаунт, чтобы искать по облачным проектам"
        : activeCloudProject
          ? "Фильтр по облачному проекту и его файлам"
          : "Фильтр по списку облачных проектов"
      : rootPath
        ? "Фильтр по локальному проекту"
        : "Откройте локальную папку через меню Файл или Ctrl+O, чтобы фильтровать файлы");

  return (
    <div className={joinClasses("ui-field flex h-9 min-w-0 items-center gap-2 px-3", className)}>
      <IoSearchOutline className="h-4 w-4 shrink-0 text-secondary" />
      <input
        ref={inputRef}
        type="text"
        value={searchQuery}
        autoFocus={autoFocus}
        onChange={(event) => dispatch(setSearchQuery(event.target.value))}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            onEscape?.();
          }

          onKeyDown?.(event);
        }}
        placeholder={resolvedPlaceholder}
        className={joinClasses(
          "w-full min-w-0 border-none bg-transparent text-sm text-primary placeholder:text-muted focus:outline-none focus:ring-0",
          inputClassName,
        )}
      />
      {trailing}
    </div>
  );
}
