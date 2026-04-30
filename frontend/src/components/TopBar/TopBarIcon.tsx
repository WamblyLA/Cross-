import type { IconType } from "react-icons";

interface TopBarIconProps {
  icon: IconType;
  onClick?: () => void;
}

export default function TopBarIcon({ icon: Icon, onClick }: TopBarIconProps) {
  return (
    <button type="button" onClick={onClick} className="ui-control h-8 w-8">
      <Icon className="h-4 w-4" />
    </button>
  );
}
