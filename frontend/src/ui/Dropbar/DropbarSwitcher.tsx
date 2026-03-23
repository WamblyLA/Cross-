import { useDropbar } from "../../hooks/useDropbar";

interface DropbarSwitcherProps {
  id: string;
  label: string;
}

export default function DropbarSwitcher({ id, label }: DropbarSwitcherProps) {
  const { change } = useDropbar(id);

  return (
    <button onClick={change} className="ui-control px-2 py-1 text-xs">
      {label}
    </button>
  );
}
