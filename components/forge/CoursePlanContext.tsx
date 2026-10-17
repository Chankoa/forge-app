"use client";

import { createContext, useContext, useRef, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { applyCoursePlanAction, generateCoursePlanAction } from "@/app/app/forge/course-workflow-actions";
import type { ApplyReport, CourseWorkflowData, WorkflowResult } from "@/lib/forge/orchestrator/contracts";
import { dispatchToast } from "@/lib/ui/toast";

function useCoursePlanState(courseId: string) {
  const [data, setData] = useState<CourseWorkflowData | null>(null);
  const [report, setReport] = useState<WorkflowResult<ApplyReport> | null>(null);
  const [message, setMessage] = useState("");
  const [consumed, setConsumed] = useState(false);
  const [pending, startTransition] = useTransition();
  const lock = useRef(false);
  const consumedRef = useRef(false);
  const router = useRouter();
  function generate(instruction?: string) {
    if (lock.current || (instruction && (!data || consumedRef.current))) return;
    lock.current = true;
    setMessage("");
    startTransition(async () => {
      try {
        const response = await generateCoursePlanAction({ courseId, capability: instruction ? "propose_course_changes" : "analyze_course", ...(instruction && data ? { previous: data.plan, instruction } : {}) });
        if (response.status === "success" && response.data) { setData(response.data); setReport(null); consumedRef.current = false; setConsumed(false); }
        setMessage(response.summary);
      } catch { setMessage(instruction ? "Forge n’a pas pu réviser le plan. La dernière proposition reste disponible." : "Forge n’a pas pu analyser ce parcours."); }
      finally { lock.current = false; }
    });
  }
  function update(id: string, patch: { after?: string; selected?: boolean }) {
    if (lock.current || consumedRef.current) return;
    setData((current) => current ? { ...current, plan: { ...current.plan, operations: current.plan.operations.map((operation) => operation.id === id ? { ...operation, ...patch } : operation) } } : current);
  }
  function selectAll(selected: boolean) {
    if (lock.current || consumedRef.current) return;
    setData((current) => current ? { ...current, plan: { ...current.plan, operations: current.plan.operations.map((operation) => ({ ...operation, selected })) } } : current);
  }
  function apply() {
    if (!data || lock.current || consumedRef.current) return;
    lock.current = true;
    // A network failure may follow a write: never offer a blind retry.
    consumedRef.current = true; setConsumed(true); setMessage("");
    startTransition(async () => {
      try {
        const response = await applyCoursePlanAction({ courseId, plan: data.plan, selectedIds: data.plan.operations.filter((operation) => operation.selected).map((operation) => operation.id) });
        setReport(response); setMessage(response.summary);
        if (response.status === "success") dispatchToast("Modifications du parcours enregistrées.");
      } catch { setMessage("Impossible de confirmer l’enregistrement. Rechargez le parcours, puis relancez l’analyse."); }
      finally { lock.current = false; router.refresh(); }
    });
  }
  return { data, report, message, pending, consumed, generate, update, selectAll, apply };
}
const CoursePlanContext = createContext<ReturnType<typeof useCoursePlanState> | null>(null);
export function CoursePlanProvider({ courseId, children }: { courseId: string; children: ReactNode }) {
  const value = useCoursePlanState(courseId);
  return <CoursePlanContext value={value}>{children}</CoursePlanContext>;
}
export function useCoursePlan() {
  const value = useContext(CoursePlanContext);
  if (!value) throw new Error("CoursePlanProvider required");
  return value;
}
