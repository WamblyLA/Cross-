import { type ReactNode, useState } from "react";
import { DropbarContext } from "../contexts/DropbarContext";
export const DropbarProviderContext = ({
    children,
    mode = "only",
}: {
    children: ReactNode;
    mode?: "all" | "only";
}) => {
    const [activeId, setActiveId] = useState<string[]>([]);
    return (
        <DropbarContext.Provider value={{mode, activeId, setActiveId}}>
            {children}
        </DropbarContext.Provider>
    )
}