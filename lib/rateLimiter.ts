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
 * Parses Groq / API error messages for suggested retry delay times.
 * Example: "Please try again in 1s." or "Please try again in 2.5m."
 */
function parseRetryDelayMs(errorText: string): number | null {
  const matchSecs = errorText.match(/try again in ([\d\.]+)\s*s/i);
  if (matchSecs) {
    const secs = parseFloat(matchSecs[1]);
    if (!isNaN(secs) && secs > 0) return Math.ceil(secs * 1000);
  }

  const matchMins = errorText.match(/try again in ([\d\.]+)\s*m/i);
  if (matchMins) {
    const mins = parseFloat(matchMins[1]);
    if (!isNaN(mins) && mins > 0) return Math.ceil(mins * 60 * 1000);
  }

  return null;
}

/**
 * Fetch wrapper that automatically retries HTTP 429, 400 (Quota Rate Limit),
 * and 5xx transient server errors with smart backoff and log notifications.
 */
export async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retryOptions?: RetryOptions
): Promise<Response> {
  const maxAttempts = retryOptions?.maxAttempts ?? 8;
  let attempt = 0;

  while (attempt < maxAttempts) {
    attempt++;
    const res = await fetch(url, options);

    if (res.ok) {
      return res;
    }

    // Inspect non-200 responses to check for retryable rate limits or server errors
    const contentType = res.headers.get('content-type') || '';
    let errorText = '';
    let isRateLimit = res.status === 429;

    try {
      const clone = res.clone();
      if (contentType.includes('application/json')) {
        const json = await clone.json();
        errorText =
          (typeof json.detail === 'string' && json.detail) ||
          (typeof json.error === 'string' && json.error) ||
          (typeof json.error?.message === 'string' && json.error.message) ||
          JSON.stringify(json);
      } else {
        errorText = await clone.text();
      }
    } catch {
      // Ignore parsing errors
    }

    // Detect rate limit keywords in 400/429 status responses
    if (
      res.status === 429 ||
      res.status === 400 ||
      errorText.toLowerCase().includes('rate limit') ||
      errorText.toLowerCase().includes('rate_limit_exceeded') ||
      errorText.toLowerCase().includes('seconds of audio per hour')
    ) {
      isRateLimit = true;
    }

    // Retry on rate limit or 5xx server errors
    if (isRateLimit || res.status >= 500) {
      let delayMs = Math.pow(2, attempt) * 1000;

      // Check header or parse message for exact retry delay
      const retryAfterHeader = res.headers.get('Retry-After');
      if (retryAfterHeader) {
        const parsedSecs = parseInt(retryAfterHeader, 10);
        if (!isNaN(parsedSecs) && parsedSecs > 0) {
          delayMs = parsedSecs * 1000;
        }
      } else {
        const parsedBodyDelay = parseRetryDelayMs(errorText);
        if (parsedBodyDelay !== null) {
          delayMs = parsedBodyDelay + 1000; // Add 1s safety margin
        }
      }

      delayMs = Math.min(120000, delayMs); // Cap backoff at 120s

      const shortReason = isRateLimit
        ? `Groq rate limit reached ("${errorText.slice(0, 120)}..."). Auto-retrying attempt ${attempt}/${maxAttempts} in ${(delayMs / 1000).toFixed(1)}s...`
        : `Server error (${res.status}). Auto-retrying attempt ${attempt}/${maxAttempts} in ${(delayMs / 1000).toFixed(1)}s...`;

      retryOptions?.onRetry?.(attempt, delayMs, shortReason);

      await new Promise((resolve) => setTimeout(resolve, delayMs));
      continue;
    }

    // Non-retryable error
    return res;
  }

  throw new Error(`Request failed after ${maxAttempts} attempts due to rate limits or server errors.`);
}
