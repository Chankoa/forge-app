"use client";

import { useState, useTransition } from "react";
import { ArchiveRestore, ArchiveX } from "lucide-react";

type CourseLifecycleAction = (courseId: string, courseSlug: string) => Promise<void>;

export function CourseLifecycleControls({ courseId, courseSlug, status, archiveAction, restoreAction }: { courseId: string; courseSlug: string; status: string | null; archiveAction?: CourseLifecycleAction; restoreAction?: CourseLifecycleAction }) {
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");
  if (status !== "draft" && status !== "published" && status !== "archived") return null;
  const restore = status === "archived";
  const action = restore ? restoreAction : archiveAction;
  if (!action) return null;
  const run = () => startTransition(async () => {
    try {
      await action(courseId, courseSlug);
      setConfirming(false);
    } catch {
      setError(restore ? "Le parcours n’a pas pu être restauré." : "Le parcours n’a pas pu être archivé.");
    }
  });
  if (!confirming) return <button type="button" className="button button--secondary" onClick={() => { setError(""); setConfirming(true); }} disabled={pending}>{restore ? <ArchiveRestore size={16} /> : <ArchiveX size={16} />}{restore ? "Restaurer" : "Archiver"}</button>;
  return <section className="course-lifecycle-confirm" aria-label={restore ? "Confirmer la restauration" : "Confirmer l’archivage"}>
    <p>{restore ? "Restaurez ce parcours pour le rendre à nouveau disponible selon son statut précédent." : "Archiver retire le parcours de l’Explorer et suspend l’accès des apprenants. Vous pourrez le restaurer ensuite."}</p>
    <div><button type="button" className="button button--secondary" disabled={pending} onClick={() => setConfirming(false)}>Annuler</button><button type="button" className="button button--secondary" disabled={pending} onClick={run}>{restore ? <ArchiveRestore size={16} /> : <ArchiveX size={16} />}{pending ? "Mise à jour…" : restore ? "Confirmer la restauration" : "Confirmer l’archivage"}</button></div>
    {error && <p className="form-error" role="alert">{error}</p>}
  </section>;
}
