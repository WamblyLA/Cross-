interface DropbarElemProps {
  label: string;
}
export default function DropbarElem({ label }: DropbarElemProps) {
  return (
    <div className="w-full px-2 py-1 cursor-pointer select-none">{label}</div>
  );
}
