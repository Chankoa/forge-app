// Builds the bounded body excerpt sent to Forge: rich directives, URLs and identifiers are removed so no resource ID or storage reference leaves the server.
export function lessonExcerpt(content: string | null | undefined, max = 1500): string {
  if (!content) return "";
  return content
    .replace(/^:::[a-z]+[\s\S]*?^:::\s*$/gm, " ")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/https?:\/\/\S+/gi, " ")
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, " ")
    .replace(/[#>*_`|]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}
