import { useState } from "react";
import { SvgXml } from "react-native-svg";
import { isNotebookSvgMimeType } from "../../features/files/notebookMime";
import { MonospaceBlock } from "../file/MonospaceBlock";

type NotebookSvgOutputProps = {
  mimeType: string | null;
  text: string;
};

export function NotebookSvgOutput({
  mimeType,
  text,
}: NotebookSvgOutputProps) {
  const [hasError, setHasError] = useState(false);

  if (!isNotebookSvgMimeType(mimeType) || !text.trim() || hasError) {
    return <MonospaceBlock compact text={text} />;
  }

  return (
    <SvgXml
      height={240}
      onError={() => setHasError(true)}
      width="100%"
      xml={text}
    />
  );
}
