"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import type { ForgeResult } from "@/lib/forge/contracts";

type ForgeProposalResult = Extract<ForgeResult, { proposal: unknown }>;
type ForgeProposalContextValue = {
  proposal: ForgeProposalResult | null;
  setProposal(proposal: ForgeProposalResult | null): void;
};

const ForgeProposalContext = createContext<ForgeProposalContextValue | null>(null);

export function ForgeProposalProvider({ children }: { children: ReactNode }) {
  const [proposal, setProposal] = useState<ForgeProposalResult | null>(null);
  return <ForgeProposalContext value={{ proposal, setProposal }}>{children}</ForgeProposalContext>;
}

export function useForgeProposal() {
  const value = useContext(ForgeProposalContext);
  if (!value) throw new Error("ForgeProposalProvider is required.");
  return value;
}