import type { CoverImageResult, CoverPrompt, VisualBrief } from "./media-contracts";

export type CoverFlowStep = "closed" | "brief" | "prompt" | "image";
export type CoverFlowBusy = null | "brief" | "prompt" | "image" | "accept";
export type CoverFlowState = {
  step: CoverFlowStep; busy: CoverFlowBusy; brief: VisualBrief | null; prompt: CoverPrompt | null;
  image: CoverImageResult | null; instruction: string; error: string;
};
export type CoverFlowAction =
  | { type: "open" } | { type: "cancel" } | { type: "start"; busy: Exclude<CoverFlowBusy, null> }
  | { type: "brief"; brief: VisualBrief } | { type: "prompt"; prompt: CoverPrompt } | { type: "image"; image: CoverImageResult }
  | { type: "fail"; message: string } | { type: "edit"; patch: Partial<Pick<VisualBrief, "subject" | "visualDirection" | "mood">> }
  | { type: "instruction"; value: string } | { type: "adjust" };

export const initialCoverFlow: CoverFlowState = { step: "closed", busy: null, brief: null, prompt: null, image: null, instruction: "", error: "" };

// Pure transitions only: nothing here triggers generation. Every provider call comes from an explicit user action.
export function coverFlowReducer(state: CoverFlowState, action: CoverFlowAction): CoverFlowState {
  switch (action.type) {
    case "open": return state.step === "closed" ? { ...initialCoverFlow, step: "brief" } : state;
    case "cancel": return initialCoverFlow;
    case "start": return { ...state, busy: action.busy, error: "" };
    case "brief": return { ...state, step: "brief", busy: null, brief: action.brief, prompt: null, image: null, instruction: "" };
    case "prompt": return { ...state, step: "prompt", busy: null, prompt: action.prompt, image: null };
    case "image": return { ...state, step: "image", busy: null, image: action.image };
    case "fail": return { ...state, busy: null, error: action.message };
    case "edit": return state.brief ? { ...state, brief: { ...state.brief, ...action.patch }, prompt: null, image: null } : state;
    case "instruction": return { ...state, instruction: action.value };
    case "adjust": return { ...state, step: "brief", image: null, error: "" };
  }
}

export function dataUrlToFile(previewUrl: string, mimeType: string): File | null {
  const match = /^data:([^;]+);base64,(.+)$/.exec(previewUrl);
  if (!match) return null;
  const binary = atob(match[2]);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return new File([bytes], "forge-cover", { type: mimeType });
}
