import DropbarElem from "./DropbarElem";
interface DropbarContentProps {
  elements: string[];
}
export default function DropbarContent({ elements }: DropbarContentProps) {
  return (
    <div>
      {elements.map((elem, i) => (
        <DropbarElem key={i} label={elem} />
      ))}
    </div>
  );
}
