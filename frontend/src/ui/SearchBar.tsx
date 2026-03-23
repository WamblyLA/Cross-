import { IoSearchOutline } from "react-icons/io5";

export default function SearchBar() {
  return (
    <div className="ui-field flex items-center w-full gap-2 px-2 py-1.5">
      <IoSearchOutline className="h-4 w-4 text-secondary" />
      <input
        type="text"
        placeholder="Name of File"
        className="w-full border-none bg-transparent text-sm text-primary placeholder:text-muted focus:outline-none focus:ring-0"
      />
    </div>
  );
}
