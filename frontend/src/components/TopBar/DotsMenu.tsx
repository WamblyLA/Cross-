import React from "react";
import DropBar from "../../ui/Dropbar/Dropbar";
import DropbarContent from "../../ui/Dropbar/DropbarContent";
import { useDropbar } from "../../hooks/useDropbar";
import { DropbarProviderContext } from "../../providers/DropbarContextProvider";
interface DotsMenuProps {
  id: string;
  children: React.ReactNode[];
}
export default function DotsMenu({ id, children }: DotsMenuProps) {
  const { change } = useDropbar(id);
  return (
    <div className="relative inline-block">
      <div className="cursor-pointer text-sm" onClick={change}>
        ...
      </div>
      <DropBar id={id} dir="down">
        <DropbarProviderContext mode="only">
          <DropbarContent elements={children} />
        </DropbarProviderContext>
      </DropBar>
    </div>
  );
}
