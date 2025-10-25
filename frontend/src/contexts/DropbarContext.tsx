import React, {createContext } from 'react';
interface contextInter {
    mode: "all" | "only";
    activeId: string[];
    setActiveId: React.Dispatch<React.SetStateAction<string[]>>;
}
export const DropbarContext = createContext<contextInter | null>(null);