interface DropbarElemProps {
  element: React.ReactNode;
}
export default function DropbarElem({ element }: DropbarElemProps) {
  return (
    <div className="w-full h-full cursor-pointer select-none px-2 py-1 relative">
      {element}
    </div>
  );
}
