interface DropbarElemProps {
  element: React.ReactNode;
}
export default function DropbarElem({ element }: DropbarElemProps) {
  return (
    <div className="w-full px-2 py-1 cursor-pointer select-none">{element}</div>
  );
}
