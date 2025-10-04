import TopBarItem from "./TopBarItem";
import TopBarIcon from "./TopBarIcon";
import { RxCross1 } from "react-icons/rx";
import { IoIosSquareOutline } from "react-icons/io";
import { TfiLayoutLineSolid } from "react-icons/tfi";
import SearchBar from "../../ui/SearchBar";
export default function TopBar() {
  return (
    <div className="top-0 left-0 w-full h-10 bg-[#0F1710] flex px-2 items-center justify-between relative">
      <div className="flex items-center gap-3 flex-none">
        <img src="/logo.svg" alt="Logo" className="h-6 w-auto" />
        <TopBarItem label="About" />
        <TopBarItem label="File" />
        <TopBarItem label="Edit" />
        <TopBarItem label="Menu" />
        <TopBarItem label="Terminal" />
        <TopBarItem label="Help" />
        <TopBarItem label="Run" />
        <TopBarItem label="Synchronize" />
      </div>
      <div className="flex items-center justify-center transform -translate-x-1/2 left-1/2 absolute w-1/2 min-w-[200px] max-w-[650px]">
        <SearchBar />
      </div>
      <div className="flex items-center gap-3">
        <TopBarIcon icon={TfiLayoutLineSolid} />
        <TopBarIcon icon={IoIosSquareOutline} />
        <TopBarIcon icon={RxCross1} />
      </div>
    </div>
  );
}
