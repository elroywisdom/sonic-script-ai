/**
 * Rolling-window rate limiter for client-side API requests.
 * Enforces a strict maximum number of requests (e.g. 18 RPM) within a 60-second window,
 * staying safely below Groq's 20 RPM free-tier limit.
 */
export class RollingRateLimiter {
  private timestamps: number[] = [];
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor(maxRequests = 18, windowMs = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  /**
   * Returns current active requests in the 60-second rolling window
   */
  public getRollingRPM(): number {
    const now = Date.now();
    this.timestamps = this.timestamps.filter((ts) => now - ts < this.windowMs);
    return this.timestamps.length;
  }

  /**
   * Acquires a request slot. If the rolling window is full, pauses execution
   * until the oldest request ages out.
   */
  public async acquire(onWait?: (waitTimeMs: number, currentRPM: number) => void): Promise<void> {
    while (true) {
      const now = Date.now();
      this.timestamps = this.timestamps.filter((ts) => now - ts < this.windowMs);

      if (this.timestamps.length < this.maxRequests) {
        this.timestamps.push(now);
        return;
      }

      const oldest = this.timestamps[0];
      const waitTime = Math.max(100, oldest + this.windowMs - now + 100);
      onWait?.(waitTime, this.timestamps.length);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }
  }
}

export interface RetryOptions {
  maxAttempts?: number;
  onRetry?: (attempt: number, delayMs: number, reason: string) => void;
}

/**
 * Fetch wrapper that automatically retries HTTP 429 (Rate Limited) errors
 * using exponential backoff or the Retry-After header.
 */
export async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retryOptions?: RetryOptions
): Promise<Response> {
  const maxAttempts = retryOptions?.maxAttempts ?? 5;
  let attempt = 0;

  while (attempt < maxAttempts) {
    attempt++;
    const res = await fetch(url, options);

    if (res.status === 429) {
      const retryAfterHeader = res.headers.get('Retry-After');
      let delayMs = Math.pow(2, attempt) * 1000;

      if (retryAfterHeader) {
        const parsedSeconds = parseInt(retryAfterHeader, 10);
        if (!isNaN(parsedSeconds) && parsedSeconds > 0) {
          delayMs = parsedSeconds * 1000;
        }
      }

      delayMs = Math.min(60000, delayMs); // Cap backoff at 60s
      const reason = `Groq API rate limit reached (HTTP 429). Retrying attempt ${attempt}/${maxAttempts} in ${(delayMs / 1000).toFixed(1)}s...`;

      retryOptions?.onRetry?.(attempt, delayMs, reason);

      await new Promise((resolve) => setTimeout(resolve, delayMs));
      continue;
    }

    return res;
  }

  throw new Error(`Request failed after ${maxAttempts} attempts due to rate limits or server errors.`);
}
