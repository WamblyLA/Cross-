import { useAppDispatch, useAppSelector } from "../../store/hooks";
import {
  closeFile,
  setActiveFile,
  updateFileContent,
} from "../../features/files/filesSlice";
import { RxCross1 } from "react-icons/rx";
import { Editor } from "@monaco-editor/react";
import { useCallback, useRef } from "react";
function extToLang(ext: string | null | undefined) {
  if (!ext) {
    return "plaintext";
  }
  const extL = ext.toLowerCase();
  switch (extL) {
    case "cpp":
      return "cpp";
    case "h":
      return "cpp";
    case "json":
      return "json";
    case "md":
      return "markdown";
    default:
      return "plaintext";
  }
}
export default function WorkWindow() {
  const dispatch = useAppDispatch();
  const { openedFiles, activeFileId } = useAppSelector((state) => state.files);
  const activeFile = openedFiles.find((file) => file.id === activeFileId);
  const ref = useRef<number | null>(null);
  const editorChange = useCallback((value: string | undefined) => {
    if (!activeFile || value === undefined) {
      return null;
    }
    if (ref.current) {
      window.clearTimeout(ref.current);
    }
    ref.current = window.setTimeout(() => {
      if (activeFile) {
        dispatch(updateFileContent({ id: activeFile.id, content: value }));
      }
    }, 300);
  }, [activeFile, dispatch]);
  if (openedFiles.length === 0) return null;
  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex">
        {openedFiles.map((f) => (
          <div
            key={f.id}
            onClick={() => dispatch(setActiveFile(f.id))}
            className={`${
              activeFileId === f.id ? "border-b-2 border-lines-color" : ""
            } px-2 py-1 flex gap-2 items-center`}
          >
            <span>
              {f.name}.{f.extencion}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                dispatch(closeFile(f.id));
              }}
            >
              <RxCross1 />
            </button>
          </div>
        ))}
      </div>
      <div className="flex-1">
        {activeFile ? (
          <Editor 
            height="100%"
            language={extToLang(activeFile.extencion)}
            value={activeFile.content}
            onChange={editorChange}
          />
        ) : null}
    </div>
    </div>
  );
}
