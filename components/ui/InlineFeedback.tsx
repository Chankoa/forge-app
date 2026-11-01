import type { ReactNode } from "react";

export type InlineFeedbackTone = "error" | "success";

export type InlineFeedbackProps = {
  /** Selects the existing visual class and its matching live-region semantics. */
  tone: InlineFeedbackTone;
  children: ReactNode;
  className?: string;
};

export function InlineFeedback({ tone, children, className }: InlineFeedbackProps) {
  const baseClassName = tone === "error" ? "form-error" : "completion-state";
  return <p className={[baseClassName, className].filter(Boolean).join(" ")} role={tone === "error" ? "alert" : "status"}>{children}</p>;
}
