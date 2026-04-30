import type { ThemeName } from "../../styles/tokens";

export function getConsoleTheme(theme: ThemeName) {
  if (theme === "light") {
    return {
      background: "#f2f7f3",
      foreground: "#142017",
      cursor: "#3f784e",
      selectionBackground: "#cfe2d4",
      black: "#142017",
      red: "#c45555",
      green: "#3d8753",
      yellow: "#b97b2a",
      blue: "#4e8e61",
      magenta: "#607365",
      cyan: "#3d8753",
      white: "#f8fbf8",
      brightBlack: "#607365",
      brightRed: "#c45555",
      brightGreen: "#3d8753",
      brightYellow: "#b97b2a",
      brightBlue: "#4e8e61",
      brightMagenta: "#607365",
      brightCyan: "#3d8753",
      brightWhite: "#ffffff",
    };
  }

  return {
    background: "#0d1410",
    foreground: "#edf5ee",
    cursor: "#67af7b",
    selectionBackground: "#2e5a3a",
    black: "#0a0f0b",
    red: "#d97979",
    green: "#6fbe7f",
    yellow: "#d2a15b",
    blue: "#67af7b",
    magenta: "#8ea28f",
    cyan: "#67af7b",
    white: "#edf5ee",
    brightBlack: "#8ea28f",
    brightRed: "#d97979",
    brightGreen: "#6fbe7f",
    brightYellow: "#d2a15b",
    brightBlue: "#67af7b",
    brightMagenta: "#c5d5c7",
    brightCyan: "#67af7b",
    brightWhite: "#f6fbf7",
  };
}
