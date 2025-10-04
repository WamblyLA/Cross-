interface TopBarItemProps {
    label: string;
}
export default function TopBarItem({label}: TopBarItemProps) {
  return (
    <div className="text-xs px-1 py-1 rounded">{label}</div>
  )
}
