interface TopBarItemProps {
    label: string;
}
export default function TopBarItem({label}: TopBarItemProps) {
  return (
    <div className="text-sm px-2 py-1 rounded">{label}</div>
  )
}
