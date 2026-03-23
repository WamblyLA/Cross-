import { BiHide } from "react-icons/bi";
import { GoPlus } from "react-icons/go";
import { RiCollapseVerticalLine, RiExpandVerticalLine } from "react-icons/ri";
import { TbFocus2 } from "react-icons/tb";

export default function OptionsBar() {
  return (
    <div className="px-2 py-1.5 flex justify-end items-center gap-2 h-11 text-lg bg-chrome border-b border-default">
      <button type="button" className="ui-control h-8 w-8">
        <GoPlus />
      </button>
      <button type="button" className="ui-control h-8 w-8">
        <RiExpandVerticalLine />
      </button>
      <button type="button" className="ui-control h-8 w-8">
        <RiCollapseVerticalLine />
      </button>
      <button type="button" className="ui-control h-8 w-8">
        <TbFocus2 />
      </button>
      <button type="button" className="ui-control h-8 w-8">
        <BiHide />
      </button>
    </div>
  );
}
