import type { PropsWithChildren } from "react";
import { useLayoutEffect } from "react";
import { VariableContextProvider, colorScheme as nativeCssColorScheme } from "react-native-css/native";
import { useThemeContext } from "./themeContext";

export function ThemeRuntimeProvider({ children }: PropsWithChildren) {
  const { colorScheme, resolvedThemeVariables } = useThemeContext();

  useLayoutEffect(() => {
    nativeCssColorScheme.set(colorScheme);
  }, [colorScheme]);

  return (
    <VariableContextProvider value={resolvedThemeVariables}>
      {children}
    </VariableContextProvider>
  );
}
