/**
 * Toast utilities - wrappers for the existing toast system
 */

export function toastError(msg: string): void {
  console.error('[Toast Error]', msg);
}

export function toastOk(msg: string): void {
  console.log('[Toast Success]', msg);
}
