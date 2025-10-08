import {createContext, type Dispatch, type SetStateAction } from 'react';
interface contextInter {
    isOpen: boolean;
    setIsOpen: Dispatch<SetStateAction<boolean>>;
    dir: string;
}
export const dropbarContext = createContext<contextInter | null>(null);