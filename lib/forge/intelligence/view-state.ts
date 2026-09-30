import type { CurriculumReview, IntelligenceResponse } from "./contracts";

export type CurriculumViewState = { result: CurriculumReview | null; status: "idle" | "ready" | "incomplete" | "unavailable" };

export function curriculumStateAfterResponse(previous: CurriculumViewState, response: IntelligenceResponse<CurriculumReview>): CurriculumViewState {
  if (response.ok) return { result: response.result, status: "ready" };
  return { result: previous.result, status: response.error === "invalid_result" ? "incomplete" : "unavailable" };
}
