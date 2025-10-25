import DropBar from "../../ui/Dropbar/Dropbar";
import DropbarContent from "../../ui/Dropbar/DropbarContent";
import { useDropbar } from "../../hooks/useDropbar";
interface TopBarItemProps {
  id: string;
  label: string;
}
const mockData: string[] = ["Lorem", "Ipsum", "Dolor", "Sit", "Amet"];
export default function TopBarItem({ id, label }: TopBarItemProps) {
  const { change } = useDropbar(id);
  return (
    <div className="relative inline-block">
      <div className="px-2 py-1 cursor-pointer" onClick={change}>
        {label}
      </div>
      <DropBar id={id} dir="down">
        <DropbarContent elements={mockData} />
      </DropBar>
      </div>
    );
  }