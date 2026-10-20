"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import type { CourseDeletionEligibility } from "@/lib/courses/course-management";
import { courseDeletionBlockerMessage } from "@/lib/courses/course-management";
import { deleteDraftCourseAction } from "@/app/app/create/actions";
import { dispatchToast } from "@/lib/ui/toast";

export function CourseDeletionPanel({ courseId, title, eligibility }: { courseId: string; title: string; eligibility: CourseDeletionEligibility }) {
  const [confirming, setConfirming] = useState(false);
  const [message, setMessage] = useState(eligibility.allowed ? "" : courseDeletionBlockerMessage(eligibility.blocker));
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const remove = () => startTransition(async () => {
    try {
      const result = await deleteDraftCourseAction(courseId);
      if (!result.ok) {
        setMessage(courseDeletionBlockerMessage(result.blocker));
        setConfirming(false);
        return;
      }
      dispatchToast("Parcours supprimé.");
      router.replace("/app/courses");
      router.refresh();
    } catch {
      setMessage("Ce parcours ne peut plus être supprimé.");
      setConfirming(false);
    }
  });

  return <section className="course-danger-zone" aria-labelledby="delete-course-title">
    <p className="eyebrow">Suppression</p>
    <h3 id="delete-course-title">Supprimer ce parcours</h3>
    <p>Cette action supprime définitivement ce brouillon et son contenu.</p>
    {eligibility.allowed ? (confirming ? <div className="course-danger-zone__confirm" role="alert">
      <p>Vous allez supprimer définitivement «&nbsp;{title}&nbsp;». Cette action est irréversible.</p>
      <div><button type="button" className="button button--secondary" disabled={pending} onClick={() => setConfirming(false)}>Annuler</button><button type="button" className="button course-danger-zone__delete" disabled={pending} onClick={remove}><Trash2 size={16} aria-hidden="true" />{pending ? "Suppression…" : "Supprimer définitivement"}</button></div>
    </div> : <button type="button" className="button course-danger-zone__delete" onClick={() => setConfirming(true)}><Trash2 size={16} aria-hidden="true" />Supprimer définitivement</button>) : <p className="course-danger-zone__blocked" role="status">{message}</p>}
  </section>;
}
