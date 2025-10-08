import { useDropbar } from "../../hooks/useDropbar";
import DropbarElem from "./DropbarElem";
interface DropbarContentProps {
  elements: string[];
}
export default function DropbarContent({ elements }: DropbarContentProps) {
  const { isOpen, dir } = useDropbar();
  console.log(isOpen);
  if (!isOpen) return null;
  const stylesDir =
    dir === "right"
      ? "left-full top-0"
      : dir === "left"
      ? "right-full top-0"
      : dir === "up"
      ? "bottom-full left-0"
      : "top-full left-0";
  return (
    <div className={`${stylesDir} absolute mt-1 w-full border-black`}>
      {elements.map((elem, i) => (
        <DropbarElem key={i} label={elem} />
      ))}
    </div>
  );
}
