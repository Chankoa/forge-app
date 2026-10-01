import type { ContentTask } from "./contracts";

// Task limits are stricter than the 20,000-character authoring form schema.
// Full Forge lesson proposals already have a 3,800-character application contract.
export const contentTaskPolicy = {
  improve: { maxChars: 3800, target: "2600 à 3400 caractères si une réécriture substantielle est nécessaire", maxOutputTokens: 4000 },
  clarify: { maxChars: 3800, target: "2400 à 3200 caractères si une clarification substantielle est nécessaire", maxOutputTokens: 4000 },
  adapt_level: { maxChars: 3800, target: "2400 à 3200 caractères si une adaptation substantielle est nécessaire", maxOutputTokens: 4000 },
  add_example: { maxChars: 2000, target: "900 à 1600 caractères", maxOutputTokens: 2600 },
  suggest_activity: { maxChars: 2500, target: "1200 à 2000 caractères", maxOutputTokens: 3200 },
  coherence_review: { maxChars: 1800, target: "un résumé et au plus quatre constats concis, nettement sous 1800 caractères", maxOutputTokens: 1800 },
} as const satisfies Record<ContentTask, { maxChars: number; target: string; maxOutputTokens: number }>;

const unfinishedEnding = /(?:[,;:—–-]|\b(?:et|ou|de|du|des|le|la|les|un|une|pour|avec|sur|dans|à|au|aux))\s*$/iu;
const unfinishedList = /^(?:[-*+]\s*|\d+[.)]\s*)$/u;

export function completeContentText(value: string, task: ContentTask): boolean {
  const text = value.trim();
  if (!text || text.length > contentTaskPolicy[task].maxChars) return false;
  const lastLine = text.split("\n").at(-1)?.trim() ?? "";
  if (!lastLine || unfinishedList.test(lastLine) || unfinishedEnding.test(lastLine)) return false;
  if ((text.match(/```/gu) ?? []).length % 2 !== 0) return false;
  if (task === "coherence_review") return true;
  const closed = /[.!?…][)\]"'»”]*$/u.test(lastLine) || lastLine === "```";
  if (!closed) return false;
  // Additions are self-contained passages: a complete terminal sentence is required.
  if (task === "add_example" || task === "suggest_activity") {
    if (text.length === contentTaskPolicy[task].maxChars) return false;
    return /[.!?…][)\]"'»”]*$/u.test(lastLine);
  }
  // At the full-content cap, accept only an unambiguous terminal sentence.
  if (text.length === contentTaskPolicy[task].maxChars) return /[.!?…][)\]"'»”]*$/u.test(lastLine);
  return true;
}

export function reviewTextLength(value: { summary: string; findings: Array<{ reason: string; suggestion: string }> }) {
  return value.summary.length + value.findings.reduce((total, finding) => total + finding.reason.length + finding.suggestion.length, 0);
}
