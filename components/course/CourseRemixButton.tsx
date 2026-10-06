"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Copy } from "lucide-react";
import { createCourseRemixAction } from "@/app/app/courses/remix-actions";
import { submitCourseRemixOnce } from "@/lib/courses/remix-submit";

export function CourseRemixConfirmationContent({ error }: { error: string | null }) {
  return <div className="course-remix-dialog__body">
    <p className="eyebrow">Remix</p>
    <h2 id="course-remix-title">Remixer ce parcours ?</h2>
    <p>Un nouveau parcours privé sera créé à partir de cette structure et de son contenu. Les sources, ressources, collaborateurs, apprenants et données de progression ne seront pas copiés.</p>
    {error && <p className="form-error" role="alert">{error}</p>}
  </div>;
}

export function CourseRemixButton({ courseId, compact = false }: { courseId: string; compact?: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const submitted = useRef(false);
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const node = dialog.current;
    if (!node) return;
    if (open && !node.open) node.showModal();
    if (!open && node.open) node.close();
  }, [open]);

  const close = () => {
    if (!pending) {
      setError(null);
      setOpen(false);
    }
  };

  const remix = () => {
    if (submitted.current) return;
    startTransition(async () => {
      setError(null);
      const result = await submitCourseRemixOnce(submitted, () => createCourseRemixAction(courseId), (url) => window.location.assign(url));
      if (result && !result.ok) setError(result.error);
    });
  };

  return <>
    <button type="button" className={`button${compact ? " button--secondary" : ""}`} onClick={() => setOpen(true)} disabled={pending}><Copy size={16} />Remixer ce parcours</button>
    <dialog ref={dialog} className="course-remix-dialog" aria-labelledby="course-remix-title" onCancel={(event) => { event.preventDefault(); close(); }} onClose={() => setOpen(false)}>
      <CourseRemixConfirmationContent error={error} />
      <footer>
        <button type="button" className="button button--secondary" onClick={close} disabled={pending}>Annuler</button>
        <button type="button" className="button" onClick={remix} disabled={pending}>{pending ? "Création…" : "Créer le remix"}</button>
      </footer>
    </dialog>
  </>;
}
