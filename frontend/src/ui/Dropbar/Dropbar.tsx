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
  return <div className={`absolute z-30 ${dirStyle[dir]} bg-dropbar-bg-1 px-4 py-4 rounded-lg`}>{children}</div>;
}
