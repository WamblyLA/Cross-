import { useAppDispatch, useAppSelector } from "../../store/hooks";
import {
  closeFile,
  setActiveFile,
  updateFileContent,
} from "../../features/files/filesSlice";
import { RxCross1 } from "react-icons/rx";
export default function WorkWindow() {
  const dispatch = useAppDispatch();
  const { openedFiles, activeFileId } = useAppSelector((state) => state.files);
  if (openedFiles.length == 0) return null;
  const activeFile = openedFiles.find((file) => file.id === activeFileId);
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
      <textarea
        className="flex-1 resize-none p-2 outline-none bg-top-bar-bg px-6 py-2"
        value={activeFile?.content}
        onChange={(e) =>
          activeFile &&
          dispatch(
            updateFileContent({ id: activeFile.id, content: e.target.value })
          )
        }
      />
    </div>
  );
}
