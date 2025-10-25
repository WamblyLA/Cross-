import { useDropbar } from "../../hooks/useDropbar";
interface DropbarSwitcherProps {
    id: string;
    label: string;
}
export default function DropbarSwitcher({id, label}: DropbarSwitcherProps) {
  const { change } = useDropbar(id);
  return (
    <button onClick={change} className="px-1 py-1 text-xs rounded">
      {label}
    </button>
  );
}
