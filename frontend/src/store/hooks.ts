import { type StateType, type AppDispatch } from "./store";
import { useDispatch, useSelector, type TypedUseSelectorHook } from "react-redux";
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<StateType> = useSelector;