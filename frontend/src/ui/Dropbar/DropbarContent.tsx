import DropbarElem from "./DropbarElem";
interface DropbarContentProps {
  elements: React.ReactNode[];
}
export default function DropbarContent({ elements }: DropbarContentProps) {
  return (
    <div className="w-full h-full box-border">
      {elements.map((elem, i) => (
        <DropbarElem key={i} element={elem} />
      ))}
    </div>
  );
}
