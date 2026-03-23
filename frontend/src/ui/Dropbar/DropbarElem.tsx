interface DropbarElemProps {
  element: React.ReactNode;
}

export default function DropbarElem({ element }: DropbarElemProps) {
  return (
    <div className="ui-control w-full justify-start cursor-pointer select-none px-2 py-1 relative text-sm">
      {element}
    </div>
  );
}
