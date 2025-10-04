import { IoSearchOutline } from "react-icons/io5";
export default function SearchBar() {
  return (
    <div className="flex items-center w-full max-w-xs gap-1">
      <IoSearchOutline className="h-5 w-5 text-green-400"/>
      <input
        type="text"
        placeholder="Name of File"
        className="w-full border border-green-800 bg-green-950 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-green-800"
      />
    </div>
  )
}
