import { ForgeError } from "./contracts";

// Process-local guard, shared across intents and modes. Distributed quota is a deployment prerequisite.
export function createForgeRateLimiter(now = Date.now) {
  const buckets = new Map<string, { count: number; until: number }>();
  return (userId: string, limit: number) => {
    const time = now();
    for (const [id, bucket] of buckets) if (bucket.until <= time) buckets.delete(id);
    const bucket = buckets.get(userId);
    if (bucket && bucket.count >= limit) throw new ForgeError("rate_limited");
    if (!bucket && buckets.size >= 10000) throw new ForgeError("rate_limited");
    buckets.set(userId, { count: (bucket?.count ?? 0) + 1, until: bucket?.until ?? time + 3600000 });
  };
}
