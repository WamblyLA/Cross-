import { useDropbar } from "../../hooks/useDropbar";
interface DropbarSwitcherProps {
    label: string;
}
export default function DropbarSwitcher({label}: DropbarSwitcherProps) {
  const { change } = useDropbar();
  return (
    <button onClick={change} className="px-1 py-1 text-xs rounded">
      {label}
    </button>
  );
}
