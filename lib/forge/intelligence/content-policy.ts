import type { ContentTask } from "./contracts";

// Task limits are stricter than the 20,000-character authoring form schema.
// Full Forge lesson proposals already have a 3,800-character application contract.
export const contentTaskPolicy = {
  improve: { maxChars: 3800, target: "une réécriture concise et proportionnée ; environ 600 à 1400 caractères pour une leçon courte", maxOutputTokens: 4000 },
  clarify: { maxChars: 3800, target: "une clarification concise et proportionnée ; environ 600 à 1400 caractères pour une leçon courte", maxOutputTokens: 4000 },
  adapt_level: { maxChars: 3800, target: "une adaptation concise et proportionnée ; environ 600 à 1400 caractères pour une leçon courte", maxOutputTokens: 4000 },
  add_example: { maxChars: 2000, target: "900 à 1600 caractères", maxOutputTokens: 2600 },
  suggest_activity: { maxChars: 2500, target: "1200 à 2000 caractères", maxOutputTokens: 3200 },
  coherence_review: { maxChars: 1800, target: "un résumé et au plus quatre constats concis, nettement sous 1800 caractères", maxOutputTokens: 1800 },
} as const satisfies Record<ContentTask, { maxChars: number; target: string; maxOutputTokens: number }>;

// Full replacement is intentionally kept below the editor persistence maximum.
// Larger lessons use a deterministic local operation instead.
export const fullRewriteThreshold = contentTaskPolicy.improve.maxChars;

const unfinishedEnding = /(?:[,;:—–-]|\b(?:et|ou|de|du|des|le|la|les|un|une|pour|avec|sur|dans|à|au|aux))\s*$/iu;
const unfinishedList = /^(?:[-*+]\s*|\d+[.)]\s*)$/u;

export function contentCompletionFailure(value: string, task: ContentTask): "empty" | "over_limit" | "unfinished_list" | "unfinished_ending" | "unclosed_fence" | "at_limit" | null {
  const text = value.trim();
  if (!text) return "empty";
  if (text.length > contentTaskPolicy[task].maxChars) return "over_limit";
  const lastLine = text.split("\n").at(-1)?.trim() ?? "";
  if (!lastLine || unfinishedList.test(lastLine)) return "unfinished_list";
  if (unfinishedEnding.test(lastLine)) return "unfinished_ending";
  if ((text.match(/```/gu) ?? []).length % 2 !== 0) return "unclosed_fence";
  if (task === "coherence_review") return null;
  const closed = /[.!?…][)\]"'»”]*$/u.test(lastLine) || lastLine === "```";
  if (!closed) return "unfinished_ending";
  // Additions are self-contained passages: a complete terminal sentence is required.
  if (task === "add_example" || task === "suggest_activity") {
    if (text.length === contentTaskPolicy[task].maxChars) return "at_limit";
    return /[.!?…][)\]"'»”]*$/u.test(lastLine) ? null : "unfinished_ending";
  }
  // At the full-content cap, accept only an unambiguous terminal sentence.
  if (text.length === contentTaskPolicy[task].maxChars && !/[.!?…][)\]"'»”]*$/u.test(lastLine)) return "at_limit";
  return null;
}

export function completeContentText(value: string, task: ContentTask): boolean {
  return contentCompletionFailure(value, task) === null;
}

export function reviewTextLength(value: { summary: string; findings: Array<{ reason: string; suggestion: string }> }) {
  return value.summary.length + value.findings.reduce((total, finding) => total + finding.reason.length + finding.suggestion.length, 0);
}
