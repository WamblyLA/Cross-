import React from "react";
import { DropbarProviderContext } from "../../providers/DropbarContextProvider";
import { useDropbar } from "../../hooks/useDropbar";
import DropBar from "../../ui/Dropbar/Dropbar";
import DropbarContent from "../../ui/Dropbar/DropbarContent";

interface DotsMenuProps {
  id: string;
  children: React.ReactNode[];
}

export default function DotsMenu({ id, children }: DotsMenuProps) {
  const { change } = useDropbar(id);

  return (
    <div className="relative inline-block h-full justify-end items-end">
      <button type="button" className="ui-control px-2 py-1 text-sm h-full" onClick={change}>
        ...
      </button>
      <DropBar id={id} dir="down">
        <DropbarProviderContext mode="only">
          <DropbarContent elements={children} />
        </DropbarProviderContext>
      </DropBar>
    </div>
  );
}
