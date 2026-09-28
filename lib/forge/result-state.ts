import type { ForgeResponse, ForgeResult } from "./contracts";

// A failed regeneration must not replace a previously usable proposal.
export function forgeResultAfterResponse(previous: ForgeResult | null, response: ForgeResponse): ForgeResult | null {
  return response.ok ? response.result : previous;
}
