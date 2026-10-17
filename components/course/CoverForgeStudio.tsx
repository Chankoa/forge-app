"use client";

import { useReducer } from "react";
import { useRouter } from "next/navigation";
import { acceptGeneratedCoverAction } from "@/app/app/courses/cover-actions";
import { generateCoverImageAction, prepareCoverBriefAction, prepareCoverPromptAction } from "@/app/app/forge/cover-workflow-actions";
import { coverFlowReducer, dataUrlToFile, initialCoverFlow, type CoverFlowState } from "@/lib/forge/orchestrator/cover-flow";
import { coverMessages } from "@/lib/forge/orchestrator/media-contracts";
import { CoverStudioView, type CoverStudioHandlers } from "./CoverStudioView";
import { dispatchToast } from "@/lib/ui/toast";

export function CoverForgeEntry({ courseId, onDone }: { courseId: string; onDone?: () => void }) {
  const router = useRouter();
  const [state, dispatch] = useReducer(coverFlowReducer, { ...initialCoverFlow, step: "brief" });
  const call = async <T,>(busy: "brief" | "prompt" | "image", message: string, task: () => Promise<{ status: string; data: T | null }>, done: (data: T) => void) => {
    dispatch({ type: "start", busy });
    try {
      const result = await task();
      if (result.status === "success" && result.data) done(result.data); else dispatch({ type: "fail", message });
    } catch { dispatch({ type: "fail", message }); }
  };
  const handlers: CoverStudioHandlers = {
    onBrief: () => void call("brief", coverMessages.brief, () => prepareCoverBriefAction({ courseId, ...(state.brief && state.instruction.trim() ? { previous: state.brief, instruction: state.instruction.trim() } : {}) }), (data: { brief: NonNullable<CoverFlowState["brief"]> }) => dispatch({ type: "brief", brief: data.brief })),
    onPrompt: () => state.brief && void call("prompt", coverMessages.brief, () => prepareCoverPromptAction({ courseId, brief: state.brief }), (data: { prompt: NonNullable<CoverFlowState["prompt"]> }) => dispatch({ type: "prompt", prompt: data.prompt })),
    onImage: () => state.prompt && void call("image", coverMessages.image, () => generateCoverImageAction({ courseId, prompt: state.prompt!.prompt, aspectRatio: state.prompt!.aspectRatio }), (data: NonNullable<CoverFlowState["image"]>) => dispatch({ type: "image", image: data })),
    onAccept: async () => {
      const file = state.image ? dataUrlToFile(state.image.previewUrl, state.image.mimeType) : null;
      if (!file) { dispatch({ type: "fail", message: coverMessages.unusable }); return; }
      dispatch({ type: "start", busy: "accept" });
      const data = new FormData();
      data.set("cover", file);
      try {
        await acceptGeneratedCoverAction(courseId, data);
        dispatchToast("Image de couverture enregistrée.");
        dispatch({ type: "cancel" });
        onDone?.();
        router.refresh();
      } catch { dispatch({ type: "fail", message: coverMessages.save }); }
    },
    onCancel: () => { dispatch({ type: "cancel" }); onDone?.(); },
    onAdjust: () => dispatch({ type: "adjust" }),
    onEdit: (field, value) => dispatch({ type: "edit", patch: { [field]: value } }),
    onInstruction: (value) => dispatch({ type: "instruction", value }),
  };
  return <CoverStudioView state={state} handlers={handlers} />;
}
