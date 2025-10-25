import { IoSearchOutline } from "react-icons/io5";
export default function SearchBar() {
  return (
    <div className="flex items-center w-full border border-green-900 gap-2 bg-search rounded-lg px-2 py-1 text-sm focus:outline-none focus-within:border-green-600">
      <IoSearchOutline className="h-5 w-5 text-green-400"/>
      <input
        type="text"
        placeholder="Name of File"
        className="w-full border-none bg-transparent focus:outline-none focus:ring-0"
      />
    </div>
  )
}
