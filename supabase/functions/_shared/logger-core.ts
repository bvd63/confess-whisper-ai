export type LogLevel = "debug" | "info" | "warn" | "error";
export type LogKind = "log" | "metric" | "event";
export type LogContext = Record<string, unknown> | undefined;

export interface StructuredLogEntry {
  timestamp: string;
  level: LogLevel;
  kind: LogKind;
  message: string;
  service?: string;
  component?: string;
  functionName?: string;
  environment?: string;
  context?: Record<string, unknown>;
}

export interface LoggerWriter {
  debug?: (line: string, entry: StructuredLogEntry) => void;
  info?: (line: string, entry: StructuredLogEntry) => void;
  warn?: (line: string, entry: StructuredLogEntry) => void;
  error?: (line: string, entry: StructuredLogEntry) => void;
}

export interface LoggerOptions {
  service?: string;
  component?: string;
  functionName?: string;
  environment?: string;
  defaultContext?: Record<string, unknown>;
  writer?: LoggerWriter;
  formatter?: (entry: StructuredLogEntry) => string;
}

export interface StructuredLogger {
  debug: (message: string, context?: Record<string, unknown>) => void;
  info: (message: string, context?: Record<string, unknown>) => void;
  warn: (message: string, context?: Record<string, unknown>) => void;
  error: (message: string, context?: Record<string, unknown>) => void;
  metric: (name: string, value: number, context?: Record<string, unknown>) => void;
  event: (name: string, context?: Record<string, unknown>) => void;
  child: (options?: Partial<LoggerOptions>) => StructuredLogger;
  withContext: (
    context: Record<string, unknown>,
    extra?: Record<string, unknown>,
  ) => Record<string, unknown>;
}

const mergeContext = (
  base?: Record<string, unknown>,
  extra?: Record<string, unknown>,
): Record<string, unknown> | undefined => {
  if (!base && !extra) {
    return undefined;
  }
  if (!base) {
    return { ...extra };
  }
  if (!extra) {
    return { ...base };
  }
  return { ...base, ...extra };
};

const defaultFormatter = (entry: StructuredLogEntry) => JSON.stringify(entry);

const defaultWriter: Required<LoggerWriter> = {
  debug: (line) => console.debug(line),
  info: (line) => console.log(line),
  warn: (line) => console.warn(line),
  error: (line) => console.error(line),
};

const getWriter = (writer?: LoggerWriter): Required<LoggerWriter> => ({
  debug: writer?.debug ?? defaultWriter.debug,
  info: writer?.info ?? defaultWriter.info,
  warn: writer?.warn ?? defaultWriter.warn,
  error: writer?.error ?? defaultWriter.error,
});

const emit = (
  writer: Required<LoggerWriter>,
  formatter: (entry: StructuredLogEntry) => string,
  entry: StructuredLogEntry,
) => {
  const line = formatter(entry);
  if (entry.level === "error") {
    writer.error(line, entry);
    return;
  }
  if (entry.level === "warn") {
    writer.warn(line, entry);
    return;
  }
  if (entry.level === "info") {
    writer.info(line, entry);
    return;
  }
  writer.debug(line, entry);
};

export const createLogger = (options: LoggerOptions = {}): StructuredLogger => {
  const writer = getWriter(options.writer);
  const formatter = options.formatter ?? defaultFormatter;
  const baseContext = options.defaultContext;

  const buildEntry = (
    level: LogLevel,
    message: string,
    kind: LogKind,
    context?: Record<string, unknown>,
  ): StructuredLogEntry => {
    const mergedContext = mergeContext(baseContext, context);
    return {
      timestamp: new Date().toISOString(),
      level,
      kind,
      message,
      service: options.service,
      component: options.component,
      functionName: options.functionName,
      environment: options.environment,
      context: mergedContext,
    };
  };

  const logWithKind = (
    level: LogLevel,
    kind: LogKind,
    message: string,
    context?: Record<string, unknown>,
  ) => emit(writer, formatter, buildEntry(level, message, kind, context));

  const logger: StructuredLogger = {
    debug: (message, context) => logWithKind("debug", "log", message, context),
    info: (message, context) => logWithKind("info", "log", message, context),
    warn: (message, context) => logWithKind("warn", "log", message, context),
    error: (message, context) => logWithKind("error", "log", message, context),
    metric: (name, value, context) =>
      logWithKind("info", "metric", name, { value, ...context }),
    event: (name, context) => logWithKind("info", "event", name, context),
    child: (childOptions) =>
      createLogger({
        ...options,
        ...childOptions,
        defaultContext: mergeContext(baseContext, childOptions?.defaultContext),
      }),
    withContext: (context, extra) => mergeContext(context, extra) ?? {},
  };

  return logger;
};

export const mergeLogContext = mergeContext;
