import { IoSearchOutline } from "react-icons/io5";
import { selectIsAuthenticated } from "../features/auth/authSelectors";
import { selectCloudActiveProject } from "../features/cloud/cloudSelectors";
import { setSearchQuery } from "../features/workspace/workspaceSlice";
import { useAppDispatch, useAppSelector } from "../store/hooks";

export default function SearchBar() {
  const dispatch = useAppDispatch();
  const source = useAppSelector((state) => state.workspace.source);
  const rootPath = useAppSelector((state) => state.workspace.rootPath);
  const searchQuery = useAppSelector((state) => state.workspace.searchQuery);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const activeCloudProject = useAppSelector(selectCloudActiveProject);

  const placeholder =
    source === "cloud"
      ? !isAuthenticated
        ? "Войдите в аккаунт, чтобы искать по облачным проектам"
        : activeCloudProject
          ? "Фильтр по облачному проекту и его файлам"
          : "Фильтр по списку облачных проектов"
      : rootPath
        ? "Фильтр по локальному проекту"
        : "Откройте локальную папку через меню File или Ctrl+O, чтобы фильтровать файлы";

  return (
    <div className="ui-field flex h-9 min-w-0 items-center gap-2 px-3">
      <IoSearchOutline className="h-4 w-4 shrink-0 text-secondary" />
      <input
        type="text"
        value={searchQuery}
        onChange={(event) => dispatch(setSearchQuery(event.target.value))}
        placeholder={placeholder}
        className="w-full min-w-0 border-none bg-transparent text-sm text-primary placeholder:text-muted focus:outline-none focus:ring-0"
      />
    </div>
  );
}
