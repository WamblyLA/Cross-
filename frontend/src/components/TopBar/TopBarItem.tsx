import React from "react";
import DropBar from "../../ui/Dropbar/Dropbar";
import DropbarContent from "../../ui/Dropbar/DropbarContent";
import DropbarSwitcher from "../../ui/Dropbar/DropbarSwitcher";
interface TopBarItemProps {
  label: string;
}
const mockData: string[] = ["Lorem", "Ipsum", "Dolor", "Sit", "Amet"];
const TopBarItem = React.forwardRef<HTMLDivElement, TopBarItemProps>(
  ({ label }, ref) => {
    return (
      <div ref={ref} className="relative">
        <DropBar dir={"down"}>
          <DropbarSwitcher label={label}></DropbarSwitcher>
          <DropbarContent elements={mockData} />
        </DropBar>
      </div>
    );
  }
);

export default TopBarItem;
