import { useContext, useCallback } from "react";
import { dropbarContext } from "../contexts/DropbarContext";
export const useDropbar = () => {
  const context = useContext(dropbarContext);
  if (!context) {
    throw new Error("Не может быть использовано вне dropbar");
  }
  const { isOpen, setIsOpen, dir } = context;
  const change = useCallback(() => {
    setIsOpen(!isOpen);
    console.log(isOpen);
  }, [isOpen, setIsOpen]);
  const open = useCallback(() => {
    setIsOpen(true);
  }, [setIsOpen]);
  const close = useCallback(() => {
    setIsOpen(false);
  }, [setIsOpen]);
  return {isOpen, setIsOpen, dir, change, open, close};
};
