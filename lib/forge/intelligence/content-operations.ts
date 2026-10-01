import { lessonContentMaxLength } from "../authoring-contracts";
import type { TargetedOperation } from "./contracts";

export type TargetedOperationResult = { ok: true; content: string } | { ok: false; reason: "missing_target" | "ambiguous_target" | "stale" | "too_long" };

export function resolveTarget(content: string, target: string) {
  const first = content.indexOf(target);
  if (first < 0) return { count: 0, index: -1 };
  return { count: content.indexOf(target, first + target.length) < 0 ? 1 : 2, index: first };
}

export function applyTargetedOperation(content: string, operation: TargetedOperation): TargetedOperationResult {
  let next: string;
  if (operation.operation === "append") {
    next = [content.trimEnd(), operation.replacement].filter(Boolean).join("\n\n");
  } else {
    const target = operation.targetText;
    if (!target) return { ok: false, reason: "missing_target" };
    const hasRange = operation.targetStart != null && operation.targetEnd != null;
    const resolved = hasRange ? { count: 1, index: operation.targetStart } : resolveTarget(content, target);
    if (hasRange && content.slice(operation.targetStart!, operation.targetEnd!) !== target) return { ok: false, reason: "stale" };
    if (resolved.count === 0) return { ok: false, reason: "stale" };
    if (resolved.count !== 1) return { ok: false, reason: "ambiguous_target" };
    const at = resolved.index;
    if (at == null || at < 0) return { ok: false, reason: "stale" };
    next = operation.operation === "replace_section"
      ? `${content.slice(0, at)}${operation.replacement}${content.slice(at + target.length)}`
      : `${content.slice(0, at + target.length)}\n\n${operation.replacement}${content.slice(at + target.length)}`;
  }
  if (next.length > lessonContentMaxLength) return { ok: false, reason: "too_long" };
  return { ok: true, content: next };
}
