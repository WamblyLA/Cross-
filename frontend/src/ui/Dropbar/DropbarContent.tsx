import DropbarElem from "./DropbarElem";
interface DropbarContentProps {
  elements: React.ReactNode[];
}
export default function DropbarContent({ elements }: DropbarContentProps) {
  return (
    <div>
      {elements.map((elem, i) => (
        <DropbarElem key={i} element={elem} />
      ))}
    </div>
  );
}
