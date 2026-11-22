const USER_AGENT = "Casey's Catalog/1.0 (aiyakc@gmail.com)";

// MusicBrainz asks clients to keep requests to roughly one per second.
const MIN_INTERVAL_MS = 1100;
const MAX_ATTEMPTS = 3;
const RETRYABLE_STATUSES = new Set([429, 503]);

// One queue per process so every MusicBrainz call shares the same limiter.
let queue: Promise<unknown> = Promise.resolve();
let nextRequestAt = 0;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForSlot() {
  const delay = nextRequestAt - Date.now();
  if (delay > 0) await sleep(delay);
  nextRequestAt = Date.now() + MIN_INTERVAL_MS;
}

// Prefer the server's Retry-After (seconds); otherwise back off exponentially.
function retryDelayMs(response: Response, attempt: number) {
  const retryAfter = Number(response.headers.get("retry-after"));
  if (Number.isFinite(retryAfter) && retryAfter >= 0) return retryAfter * 1000;
  return 1000 * 2 ** (attempt - 1);
}

async function fetchWithRetry(url: URL): Promise<Response> {
  for (let attempt = 1; ; attempt++) {
    await waitForSlot();
    const response = await fetch(url, { headers: { "User-Agent": USER_AGENT } });

    if (!RETRYABLE_STATUSES.has(response.status) || attempt >= MAX_ATTEMPTS) {
      return response;
    }
    await sleep(retryDelayMs(response, attempt));
  }
}

// Requests (including their retries) run one at a time through the queue.
export function musicBrainzFetch(url: URL): Promise<Response> {
  const request = queue.then(() => fetchWithRetry(url));
  queue = request.catch(() => undefined);
  return request;
}
