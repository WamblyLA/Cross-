import type { IconType } from "react-icons";
interface TopBarIconProps {
    icon: IconType;
}

export default function TopBarIcon({ icon: Icon }: TopBarIconProps) {
  return (
    <div className="p-1 rounded">
      <Icon className="h-4 w-4" />
    </div>
  )
}
