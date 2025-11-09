/**
 * Toast utilities - wrappers for the existing toast system
 */

import { logDebug, logError } from '@/lib/logger';

export function toastError(msg: string): void {
  logError('[Toast Error]', undefined, { message: msg });
}

export function toastOk(msg: string): void {
  logDebug('[Toast Success]', { message: msg });
}
