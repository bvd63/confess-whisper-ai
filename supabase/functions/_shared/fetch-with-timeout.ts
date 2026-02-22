const linkAbortSignals = (parentSignal: AbortSignal | undefined, controller: AbortController) => {
  if (!parentSignal) return;

  if (parentSignal.aborted) {
    controller.abort();
    return;
  }

  parentSignal.addEventListener("abort", () => controller.abort(), { once: true });
};

export const fetchWithTimeout = async (
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = 10_000,
): Promise<Response> => {
  const controller = new AbortController();
  linkAbortSignals(init.signal ?? undefined, controller);

  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
};
