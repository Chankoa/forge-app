"use client";

import { useTransition } from "react";
import { ArchiveRestore, ArchiveX } from "lucide-react";

type CourseLifecycleAction = (courseId: string, courseSlug: string) => Promise<void>;

export function CourseLifecycleControls({ courseId, courseSlug, status, archiveAction, restoreAction }: { courseId: string; courseSlug: string; status: string | null; archiveAction?: CourseLifecycleAction; restoreAction?: CourseLifecycleAction }) {
  const [pending, startTransition] = useTransition();
  if (status !== "draft" && status !== "published" && status !== "archived") return null;
  const restore = status === "archived";
  const action = restore ? restoreAction : archiveAction;
  if (!action) return null;
  const run = () => startTransition(async () => {
    await action(courseId, courseSlug);
  });
  return <button type="button" className="button button--secondary" onClick={run} disabled={pending}>{restore ? <ArchiveRestore size={16} /> : <ArchiveX size={16} />}{pending ? "Mise à jour…" : restore ? "Restaurer" : "Archiver"}</button>;
}