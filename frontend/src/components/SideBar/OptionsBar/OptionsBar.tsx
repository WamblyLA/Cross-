import { RiExpandVerticalLine } from "react-icons/ri";
import { RiCollapseVerticalLine } from "react-icons/ri";
import { GoPlus } from "react-icons/go";
import { BiHide } from "react-icons/bi";
import { TbFocus2 } from "react-icons/tb";
export default function OptionsBar() {
  return (
    <div className="px-2 py-1 flex justify-end items-center gap-4 h-10 text-lg bg-main-page-bg">
      <button>
        <GoPlus />
      </button>
      <button>
        <RiExpandVerticalLine />
      </button>
      <button>
        <RiCollapseVerticalLine />
      </button>
      <button>
        <TbFocus2 />
      </button>
      <button>
        <BiHide />
      </button>
    </div>
  );
}
