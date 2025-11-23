type LogLevel = "debug" | "info" | "warn" | "error";

const serialize = (payload: Record<string, unknown>) => JSON.stringify(payload);

const log = (level: LogLevel, message: string, context?: Record<string, unknown>) => {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...context,
  };
  const line = serialize(entry);
  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }
};

export const logDebug = (message: string, context?: Record<string, unknown>) =>
  log("debug", message, context);
export const logInfo = (message: string, context?: Record<string, unknown>) =>
  log("info", message, context);
export const logWarn = (message: string, context?: Record<string, unknown>) =>
  log("warn", message, context);
export const logError = (message: string, context?: Record<string, unknown>) =>
  log("error", message, context);

export const withRequestContext = (
  base: Record<string, unknown>,
  extra?: Record<string, unknown>,
) => ({ ...base, ...extra });
