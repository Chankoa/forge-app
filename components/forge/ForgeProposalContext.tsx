"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { ForgeIntent, ForgeResult } from "@/lib/forge/contracts";
import type { TargetedOperation } from "@/lib/forge/intelligence/contracts";
import type { LessonProposalApplication } from "@/lib/forge/lesson-proposal-application";
import { lessonAnalysisState, type LessonAnalysisSnapshot } from "@/lib/forge/lesson-analysis-state";

type ForgeProposalResult = Extract<ForgeResult, { proposal: unknown }>;
export type TargetedContentProposal = { kind: "targeted"; target: { courseId: string; lessonId: string }; operation: TargetedOperation; text: string; sourcesUsed: Array<{ id: string; title: string }> };
export type ForgeLocalProposal = ForgeProposalResult | TargetedContentProposal;
export type LessonDraftBridge = { lessonId: string; getContent(): string; getAnalysisSnapshot(): LessonAnalysisSnapshot; applyContent(content: string): void; applyProposal(intent: ForgeIntent, patch: unknown, baseContent?: string | null): LessonProposalApplication };
export type LessonSelection = { text: string; start: number; end: number };
type ForgeProposalContextValue = {
  proposal: ForgeLocalProposal | null;
  setProposal(proposal: ForgeLocalProposal | null): void;
  registerLessonDraft(bridge: LessonDraftBridge): () => void;
  applyLessonProposal(lessonId: string, proposal: ForgeProposalResult): LessonProposalApplication;
  setLessonSelection(lessonId: string, selection: LessonSelection | null): void;
  lessonDraft(lessonId: string): ({ content: string; selection: LessonSelection | null; apply(content: string): void } & ReturnType<typeof lessonAnalysisState>) | null;
};

const ForgeProposalContext = createContext<ForgeProposalContextValue | null>(null);

export function ForgeProposalProvider({ children }: { children: ReactNode }) {
  const [proposal, setProposal] = useState<ForgeLocalProposal | null>(null);
  const [bridges, setBridges] = useState<Record<string, LessonDraftBridge>>({});
  const [selections, setSelections] = useState<Record<string, LessonSelection | null>>({});
  const registerLessonDraft = useCallback((bridge: LessonDraftBridge) => {
    setBridges((current) => ({ ...current, [bridge.lessonId]: bridge }));
    return () => setBridges((current) => Object.fromEntries(Object.entries(current).filter(([lessonId]) => lessonId !== bridge.lessonId)));
  }, []);
  const applyLessonProposal = useCallback((lessonId: string, proposal: ForgeProposalResult): LessonProposalApplication => {
    if (proposal.proposal.target.lessonId !== lessonId) return { ok: false, reason: "unsupported_patch" };
    return bridges[lessonId]?.applyProposal(proposal.intent, proposal.proposal.patch, proposal.proposal.baseContent) ?? { ok: false, reason: "unsupported_patch" };
  }, [bridges]);
  const lessonDraft = useCallback((lessonId: string) => {
    const bridge = bridges[lessonId];
    if (!bridge) return null;
    return { ...lessonAnalysisState(bridge.getAnalysisSnapshot()), content: bridge.getContent(), selection: selections[lessonId] ?? null, apply: bridge.applyContent };
  }, [bridges, selections]);
  const setLessonSelection = useCallback((lessonId: string, selection: LessonSelection | null) => setSelections((current) => ({ ...current, [lessonId]: selection })), []);
  const value = useMemo<ForgeProposalContextValue>(() => ({ proposal, setProposal, registerLessonDraft, applyLessonProposal, setLessonSelection, lessonDraft }), [applyLessonProposal, lessonDraft, proposal, registerLessonDraft, setLessonSelection]);
  return <ForgeProposalContext value={value}>{children}</ForgeProposalContext>;
}

export function useForgeProposal() {
  const value = useContext(ForgeProposalContext);
  if (!value) throw new Error("ForgeProposalProvider is required.");
  return value;
}
