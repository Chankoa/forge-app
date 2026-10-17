"use client";

import { useRef, useState, useTransition } from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { removeCourseCoverAction, setCourseCoverAction } from "@/app/app/courses/cover-actions";
import { coverGuidance, validateCourseCoverUpload, type CoverPresentation } from "@/lib/courses/cover-contracts";
import { CourseCover } from "./CourseCoverVisual";
import dynamic from "next/dynamic";
import { Sparkles } from "lucide-react";
const CoverForgeEntry = dynamic(() => import("./CoverForgeStudio").then((module) => module.CoverForgeEntry), { ssr: false });
import { uploadOperationError } from "@/lib/uploads/upload-feedback";
import { dispatchToast } from "@/lib/ui/toast";

export function CourseCoverManager({ courseId, cover, domain }: { courseId: string; cover?: CoverPresentation | null; domain?: string | null }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const uploading = useRef(false);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const [studio, setStudio] = useState(false);
  const run = (task: () => Promise<unknown>, success: string, upload = false) => startTransition(async () => {
    try {
      const result = await task();
      const cleanupWarning = result && typeof result === "object" && "cleanupWarning" in result && typeof result.cleanupWarning === "string"
        ? result.cleanupWarning
        : null;
      setMessage(cleanupWarning ?? "");
      setError(false);
      if (!cleanupWarning) dispatchToast(success);
      router.refresh();
    }
    catch { setMessage(upload ? uploadOperationError("cover") : "L’image de couverture n’a pas pu être supprimée."); setError(true); }
    finally { if (upload) { uploading.current = false; if (input.current) input.current.value = ""; } }
  });
  const onFile = (file: File | undefined) => {
    if (!file) return;
    if (uploading.current) return;
    const validation = validateCourseCoverUpload(file.type, file.size);
    if (!validation.ok) { setMessage(validation.error); setError(true); return; }
    uploading.current = true;
    setMessage("");
    const data = new FormData();
    data.set("cover", file);
    run(() => setCourseCoverAction(courseId, data), "Image de couverture enregistrée.", true);
  };
  return <section className="owner-overview__section course-cover-manager" aria-labelledby="overview-cover-title">
    <div className="owner-overview__section-heading"><div><p className="eyebrow">Identité visuelle</p><h2 id="overview-cover-title">Image de couverture</h2></div></div>
    <div className="course-cover-manager__body">
      {cover?.url ? <div className="course-cover-manager__preview"><CourseCover image={cover} domain={domain} /></div> : <div className="course-cover-manager__preview course-cover-manager__preview--empty">Aucune image : un visuel Forge est affiché par défaut.</div>}
      <div className="course-cover-manager__actions">
        <p className="caption">{coverGuidance}</p>
        <input ref={input} id="course-cover-input" className="sr-only" aria-label="Choisir une image de couverture" tabIndex={-1} type="file" accept="image/jpeg,image/png,image/webp" disabled={pending} onChange={(event) => onFile(event.target.files?.[0])} />
        <div>
          <Button type="button" variant="secondary" disabled={pending} onClick={() => input.current?.click()}><ImagePlus size={16} aria-hidden="true" />{pending ? "Traitement…" : cover ? "Remplacer" : "Ajouter une image"}</Button>
          {cover && <Button type="button" variant="ghost" disabled={pending} onClick={() => run(() => removeCourseCoverAction(courseId), "Image de couverture supprimée.")}><Trash2 size={16} aria-hidden="true" />Supprimer</Button>}
          {!studio && <Button type="button" variant="secondary" disabled={pending} onClick={() => setStudio(true)}><Sparkles size={16} aria-hidden="true" />Créer avec Forge</Button>}
        </div>
        {studio && <CoverForgeEntry courseId={courseId} onDone={() => setStudio(false)} />}
        {pending && <p className="caption" role="status">Traitement en cours…</p>}
        {message && <p className={error ? "form-error" : "completion-state"} role="status">{message}</p>}
      </div>
    </div>
  </section>;
}
