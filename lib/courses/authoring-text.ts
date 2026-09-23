/** Preserve authored content while making length checks platform-independent. */
export function normalizeAuthoringText(value: unknown): string | undefined {
  return typeof value === "string" ? value.replace(/\r\n?/g, "\n") : undefined;
}
