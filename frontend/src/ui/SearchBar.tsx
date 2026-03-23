import { IoSearchOutline } from "react-icons/io5";
import { setSearchQuery } from "../features/workspace/workspaceSlice";
import { useAppDispatch, useAppSelector } from "../store/hooks";

export default function SearchBar() {
  const dispatch = useAppDispatch();
  const rootPath = useAppSelector((state) => state.workspace.rootPath);
  const searchQuery = useAppSelector((state) => state.workspace.searchQuery);

  return (
    <div className="ui-field flex h-9 min-w-0 items-center gap-2 px-3">
      <IoSearchOutline className="h-4 w-4 shrink-0 text-secondary" />
      <input
        type="text"
        value={searchQuery}
        onChange={(event) => dispatch(setSearchQuery(event.target.value))}
        placeholder={
          rootPath
            ? "Фильтр по проекту"
            : "Откройте папку через File или Ctrl+O чтобы фильтровать файлы"
        }
        className="w-full min-w-0 border-none bg-transparent text-sm text-primary placeholder:text-muted focus:outline-none focus:ring-0"
      />
    </div>
  );
}
