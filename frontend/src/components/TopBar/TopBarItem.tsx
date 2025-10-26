import DropBar from "../../ui/Dropbar/Dropbar";
import DropbarContent from "../../ui/Dropbar/DropbarContent";
import { useDropbar } from "../../hooks/useDropbar";
interface TopBarItemProps {
  id: string;
  label: string;
  dir: "down" | "up" | "left" | "right";
  data: string[];
}
export default function TopBarItem({ id, label, dir, data }: TopBarItemProps) {
  const { change } = useDropbar(id);
  return (
    <div className="relative inline-block">
      <div className="px-2 py-1 cursor-pointer text-sm" onClick={change}>
        {label}
      </div>
      <DropBar id={id} dir={dir}>
        <DropbarContent elements={data} />
      </DropBar>
      </div>
    );
  }