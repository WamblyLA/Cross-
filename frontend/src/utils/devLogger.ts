type LogLevel = "debug" | "info" | "warn" | "error";

function isLoggingEnabled() {
  if (typeof import.meta !== "undefined" && import.meta.env?.DEV) {
    return true;
  }

  if (typeof window === "undefined") {
    return false;
  }

  return window.localStorage.getItem("crosspp:debug") === "1";
}

export function createDevLogger(namespace: string) {
  const prefix = `[${namespace}]`;

  const write = (level: LogLevel, message: string, payload?: unknown) => {
    if (!isLoggingEnabled()) {
      return;
    }

    const consoleMethod =
      level === "debug" ? console.debug : level === "info" ? console.info : level === "warn" ? console.warn : console.error;

    if (payload === undefined) {
      consoleMethod(prefix, message);
      return;
    }

    consoleMethod(prefix, message, payload);
  };

  return {
    debug(message: string, payload?: unknown) {
      write("debug", message, payload);
    },
    info(message: string, payload?: unknown) {
      write("info", message, payload);
    },
    warn(message: string, payload?: unknown) {
      write("warn", message, payload);
    },
    error(message: string, payload?: unknown) {
      write("error", message, payload);
    },
  };
}
