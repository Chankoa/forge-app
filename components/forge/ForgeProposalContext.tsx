"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { ForgeResult } from "@/lib/forge/contracts";

type ForgeProposalContextValue = {
  proposal: Extract<ForgeResult, { mode: "edit" }> | null;
  setProposal(proposal: Extract<ForgeResult, { mode: "edit" }> | null): void;
};

const ForgeProposalContext = createContext<ForgeProposalContextValue | null>(null);

export function ForgeProposalProvider({ children }: { children: ReactNode }) {
  const [proposal, setProposal] = useState<Extract<ForgeResult, { mode: "edit" }> | null>(null);
  useEffect(() => {
    if (!proposal) return;
    const field = proposal.proposal.field;
    if (field === "outline") return;
    const tabIndex = field === "content" ? 1 : 0;
    document.querySelectorAll<HTMLButtonElement>(`[role="tab"]`)[tabIndex]?.click();
    requestAnimationFrame(() => {
      const name = field === "content" ? "content" : field === "description" ? "description" : "objectives";
      const target = document.querySelector<HTMLTextAreaElement>(`textarea[name="${name}"]`);
      const value = field === "objectives" ? proposal.proposal.objectives?.join("\n") : proposal.proposal.suggestedContent;
      if (target && value) {
        const setValue = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
        setValue?.call(target, value);
        target.dispatchEvent(new Event("input", { bubbles: true }));
        target.focus();
      }
      setProposal(null);
    });
  }, [proposal]);
  return <ForgeProposalContext value={{ proposal, setProposal }}>{children}</ForgeProposalContext>;
}

export function useForgeProposal() {
  const value = useContext(ForgeProposalContext);
  if (!value) throw new Error("ForgeProposalProvider is required.");
  return value;
}