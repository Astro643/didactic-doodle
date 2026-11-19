const WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS = 5;
const MAX_CLIENTS = 10_000;
const hits = new Map<string, { count: number; expiresAt: number }>();

function pruneExpired(now: number) {
  for (const [key, entry] of hits) {
    if (entry.expiresAt <= now) hits.delete(key);
  }
}

export function isPlaygroundRateLimited(ip: string, now = Date.now()): { limited: boolean } {
  pruneExpired(now);
  const entry = hits.get(ip);
  if (!entry || entry.expiresAt <= now) {
    if (hits.size >= MAX_CLIENTS) {
      const oldest = hits.keys().next().value;
      if (oldest) hits.delete(oldest);
    }
    hits.set(ip, { count: 1, expiresAt: now + WINDOW_MS });
    return { limited: false };
  }

  if (entry.count >= MAX_REQUESTS) return { limited: true };
  entry.count += 1;
  return { limited: false };
}

export function playgroundRateLimitKey(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();
  if (first) return first.slice(0, 64);

  const nitroIp = (req as Request & { nitro?: { req?: { ip?: string } } }).nitro?.req?.ip;
  if (nitroIp) return nitroIp.slice(0, 64);

  return "unknown";
}

export function resetPlaygroundRateLimits() {
  hits.clear();
}
