import { useContext, useCallback, useMemo } from "react";
import { DropbarContext } from "../contexts/DropbarContext";
export const useDropbar = (id: string) => {
  const context = useContext(DropbarContext);
  if (!context) {
    throw new Error("Не может быть использовано вне dropbar");
  }
  const { mode, activeId, setActiveId }= context;
  const isOpen = useMemo(() => activeId.includes(id), [id, activeId])
  const open = useCallback(() => {
    setActiveId((pred: string[]) => {
      if (mode === "only") {
      return [id];
      }
      if (!pred.includes(id)) {
      return [...pred, id];
      }
      return pred;
    });
  }, [setActiveId, id, mode]);
  const close = useCallback(() => {
    setActiveId((pred) => pred.filter((item) => item !== id));
  }, [setActiveId, id]);
  const change = useCallback(() => {
    setActiveId((pred) => {
      const opened = pred.includes(id);
      if (mode === "only") {
        return opened ? [] : [id];
      }
      return opened ? pred.filter((item) => item !== id) : [...pred, id];
    });
  }, [setActiveId, id, mode]);
  return {isOpen, open, close, change};
};
