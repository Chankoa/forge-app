"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { BookOpen, Trash2 } from "lucide-react";
import { deleteLessonResourceAction, getLessonResourcePdfUrlAction, listLessonResourcesAction, uploadLessonResourceAction } from "@/app/app/courses/resource-actions";
import { PdfViewer } from "@/components/forge/PdfViewer";
import { Button } from "@/components/ui/Button";
import { formatFileSize } from "@/lib/forge/source-resources";
import { lessonResourceMessages, type LessonResourceView } from "@/lib/forge/lesson-resources";
import { dispatchToast } from "@/lib/ui/toast";

export const lessonResourceUiMessages = { title: "Supprimer cette ressource ?", fileNotice: "Le fichier associé sera également supprimé.", success: "Ressource supprimée.", error: "Impossible de supprimer cette ressource.", uploaded: "Ressource ajoutée.", empty: "Aucune ressource pédagogique pour cette leçon." };
const changedEvent = "lesson-resources-changed";

function ResourceDeleteDialog({ courseSlug, resource, onClose, onDeleted }: { courseSlug: string; resource: LessonResourceView; onClose: () => void; onDeleted: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { const node = dialog.current; if (node && !node.open) node.showModal(); }, []);
  const close = () => { if (!pending) onClose(); };
  const confirm = () => startTransition(async () => {
    const result = await deleteLessonResourceAction(courseSlug, resource.id);
    if (result.ok) { dispatchToast(lessonResourceUiMessages.success); onDeleted(); return; }
    setError(result.code === "resource_in_use" ? lessonResourceMessages.resource_in_use : lessonResourceUiMessages.error);
    // The row may already be gone when only the file cleanup failed.
    if (result.code === "storage_delete_failed") onDeleted();
  });
  return <dialog ref={dialog} className="course-remix-dialog" aria-labelledby="resource-delete-title" onCancel={(event) => { event.preventDefault(); close(); }} onClose={close}>
    <div className="course-remix-dialog__body"><h2 id="resource-delete-title">{lessonResourceUiMessages.title}</h2><p><strong>{resource.title}</strong></p><p className="caption">{lessonResourceUiMessages.fileNotice}</p>{error && <p className="form-error" role="alert">{error}</p>}</div>
    <footer><button type="button" className="button button--secondary" onClick={close} disabled={pending} autoFocus>Annuler</button><button type="button" className="button" onClick={confirm} disabled={pending}>{pending ? "Suppression…" : "Supprimer"}</button></footer>
  </dialog>;
}

// Pedagogical resources (`resources` table). Learners and the rail get read-only; only the owner editor passes canManage.
export function LessonResourcesPanel({ courseSlug, lessonId, canManage = false, compact = false }: { courseSlug: string; lessonId: string; canManage?: boolean; compact?: boolean }) {
  const [items, setItems] = useState<LessonResourceView[] | null>(null);
  const [reading, setReading] = useState<LessonResourceView | null>(null);
  const [deleting, setDeleting] = useState<LessonResourceView | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const load = useCallback(() => listLessonResourcesAction(courseSlug, lessonId).then(setItems), [courseSlug, lessonId]);
  useEffect(() => { void load(); window.addEventListener(changedEvent, load); return () => window.removeEventListener(changedEvent, load); }, [load]);
  const changed = () => window.dispatchEvent(new Event(changedEvent));
  const upload = () => { if (!file) return; startTransition(async () => {
    const data = new FormData(); data.set("resource", file);
    const result = await uploadLessonResourceAction(courseSlug, lessonId, data);
    if (!result.ok) { setMessage(result.error); return; }
    setMessage(""); setFile(null); if (inputRef.current) inputRef.current.value = ""; dispatchToast(lessonResourceUiMessages.uploaded); changed();
  }); };
  if (items === null) return null;
  if (!canManage && items.length === 0) return compact ? <><h4>Ressources pédagogiques</h4><p className="caption">{lessonResourceUiMessages.empty}</p></> : null;
  const Heading = compact ? "h4" : "h3";
  return <section className={`lesson-resources${compact ? " lesson-resources--compact" : ""}`} aria-labelledby={`lesson-resources-title-${compact ? "rail" : "main"}`}>
    <Heading id={`lesson-resources-title-${compact ? "rail" : "main"}`}>Ressources pédagogiques</Heading>
    {canManage && <p className="caption">Documents PDF visibles par les apprenants inscrits, dans cette leçon.</p>}
    {canManage && <div className="form"><label>Ajouter un PDF<input ref={inputRef} type="file" accept=".pdf,application/pdf" onChange={(event) => { setFile(event.target.files?.[0] ?? null); setMessage(""); }} /></label><Button type="button" onClick={upload} disabled={pending || !file}>{pending ? "Ajout en cours..." : "Ajouter la ressource"}</Button>{message && <p className="form-error" role="alert">{message}</p>}</div>}
    {items.length === 0 ? <p className="caption">{lessonResourceUiMessages.empty}</p> : <ul className="lesson-resources__list">{items.map((resource) => <li key={resource.id}>
      <div className="forge-resource-item"><strong>{resource.title}</strong><span>PDF{formatFileSize(resource.fileSize) ? ` · ${formatFileSize(resource.fileSize)}` : ""}</span></div>
      <div className="resource-actions">
        <button type="button" className="button button--secondary" onClick={() => setReading(resource)} aria-label={`Lire le document ${resource.title}`}><BookOpen size={15} aria-hidden="true" />Lire le document</button>
        {canManage && <button type="button" className="resource-actions__delete" onClick={() => setDeleting(resource)} aria-label={`Supprimer la ressource ${resource.title}`}><Trash2 size={15} aria-hidden="true" />Supprimer la ressource</button>}
      </div>
    </li>)}</ul>}
    {reading && <PdfViewer source={reading} loadUrl={() => getLessonResourcePdfUrlAction(courseSlug, reading.id)} onClose={() => setReading(null)} />}
    {deleting && <ResourceDeleteDialog courseSlug={courseSlug} resource={deleting} onClose={() => setDeleting(null)} onDeleted={() => { setDeleting(null); changed(); }} />}
  </section>;
}
