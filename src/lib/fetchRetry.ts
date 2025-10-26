/**
 * Fetch with retry logic and exponential backoff
 */

export async function fetchRetry(
  input: RequestInfo,
  init?: RequestInit,
  tries: number = 3,
  backoff: number = 300
): Promise<Response> {
  let lastErr: any;
  
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(input, init);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r;
    } catch (e) {
      lastErr = e;
      if (i < tries - 1) {
        await new Promise(res => setTimeout(res, backoff * (i + 1)));
      }
    }
  }
  
  throw lastErr;
}
