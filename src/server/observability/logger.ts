import { createLogger } from "../../../supabase/functions/_shared/logger-core.ts";

const environment = process.env.NODE_ENV ?? "development";

const baseLogger = createLogger({
  service: "server",
  component: "edge-services",
  environment,
});

export const logDebug = (message: string, context?: Record<string, unknown>) =>
  baseLogger.debug(message, context);
export const logInfo = (message: string, context?: Record<string, unknown>) =>
  baseLogger.info(message, context);
export const logWarn = (message: string, context?: Record<string, unknown>) =>
  baseLogger.warn(message, context);
export const logError = (message: string, context?: Record<string, unknown>) =>
  baseLogger.error(message, context);
export const logMetric = (name: string, value: number, context?: Record<string, unknown>) =>
  baseLogger.metric(name, value, context);
export const logEvent = (name: string, context?: Record<string, unknown>) =>
  baseLogger.event(name, context);

export const createServiceLogger = (
  component: string,
  defaultContext?: Record<string, unknown>,
) =>
  createLogger({
    service: "server",
    component,
    environment,
    defaultContext,
  });

export type ServiceLogger = ReturnType<typeof createServiceLogger>;
