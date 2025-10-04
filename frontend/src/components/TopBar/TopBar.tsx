import TopBarItem from "./TopBarItem";
import TopBarIcon from "./TopBarIcon";
import { RxCross1 } from "react-icons/rx";
import { IoIosSquareOutline } from "react-icons/io";
import { TfiLayoutLineSolid } from "react-icons/tfi";
export default function TopBar() {
  return (
    <div className="top-0 left-0 w-full h-8 bg-[#0F1710] flex items-center justify-between">
      <div className="flex items-center gap-2 m-2">
        <img src="/logo.svg" alt="Logo" className="h-6 w-auto" />
      </div>
      <div className="flex items-center gap-3">
        <TopBarItem label="About" />
        <TopBarItem label="File" />
        <TopBarItem label="Edit" />
        <TopBarItem label="Menu" />
        <TopBarItem label="Terminal" />
        <TopBarItem label="Help" />
        <TopBarItem label="Run" />
        <TopBarItem label="Synchronize" />
      </div>
      <div className="flex items-center gap-3">
        <TopBarIcon icon={TfiLayoutLineSolid} />
        <TopBarIcon icon={IoIosSquareOutline} />
        <TopBarIcon icon={RxCross1} />
      </div>
    </div>
  );
}
