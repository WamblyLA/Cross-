import { useDropbar } from "../../hooks/useDropbar";

interface DropBarProps {
  id: string;
  dir?: "up" | "down" | "left" | "right";
  children: React.ReactNode;
}

export default function DropBar({ id, dir = "down", children }: DropBarProps) {
  const { isOpen } = useDropbar(id);
  const dirStyle = {
    up: "bottom-full left-0",
    down: "top-full left-0",
    left: "top-0 right-full",
    right: "top-0 left-full",
  };

  if (!isOpen) return null;

  return (
    <div
      className={`absolute z-30 ${dirStyle[dir]} ui-panel mt-1 min-w-32 px-2 py-2 text-sm`}
    >
      {children}
    </div>
  );
}
