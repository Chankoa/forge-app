"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { BookOpen, Trash2 } from "lucide-react";
import { deleteForgeSourceAction, getSourcePdfUrlAction, type ForgeSourceOption } from "@/app/app/forge/source-actions";
import { sourceResourceMessages } from "@/lib/forge/source-resources";
import { dispatchToast } from "@/lib/ui/toast";
import { PdfViewer } from "@/components/forge/PdfViewer";

export const sourceDeleteMessages = { title: "Supprimer cette source ?", fileNotice: "Le fichier associé sera également supprimé.", success: "Source supprimée.", error: "Impossible de supprimer cette source." };

function SourceDeleteDialog({ courseSlug, source, onClose, onDeleted }: { courseSlug: string; source: ForgeSourceOption; onClose: () => void; onDeleted: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { const node = dialog.current; if (node && !node.open) node.showModal(); }, []);
  const close = () => { if (!pending) onClose(); };
  const confirm = () => startTransition(async () => {
    const result = await deleteForgeSourceAction(courseSlug, source.id);
    if (result.ok) { dispatchToast(sourceDeleteMessages.success); onDeleted(); return; }
    setError(result.code === "resource_in_use" ? sourceResourceMessages.resource_in_use : sourceDeleteMessages.error);
    // The row may already be gone when only the file cleanup failed.
    if (result.code === "storage_delete_failed") onDeleted();
  });
  return <dialog ref={dialog} className="course-remix-dialog" aria-labelledby="source-delete-title" onCancel={(event) => { event.preventDefault(); close(); }} onClose={close}>
    <div className="course-remix-dialog__body"><h2 id="source-delete-title">{sourceDeleteMessages.title}</h2><p><strong>{source.title}</strong></p>{source.hasFile && <p className="caption">{sourceDeleteMessages.fileNotice}</p>}{error && <p className="form-error" role="alert">{error}</p>}</div>
    <footer><button type="button" className="button button--secondary" onClick={close} disabled={pending} autoFocus>Annuler</button><button type="button" className="button" onClick={confirm} disabled={pending}>{pending ? "Suppression…" : "Supprimer"}</button></footer>
  </dialog>;
}

// Actions for Forge sources (working context). Pedagogical resources use LessonResourcesPanel.
export function SourceResourceActions({ courseSlug, source, canDelete = false, onDeleted }: { courseSlug: string; source: ForgeSourceOption; canDelete?: boolean; onDeleted?: () => void }) {
  const [viewer, setViewer] = useState(false);
  const [confirming, setConfirming] = useState(false);
  if (!source.pdf && !canDelete) return null;
  return <div className="resource-actions">
    {source.pdf && <button type="button" className="button button--secondary" onClick={() => setViewer(true)} aria-label={`Lire le document ${source.title}`}><BookOpen size={15} aria-hidden="true" />Lire le document</button>}
    {canDelete && <button type="button" className="resource-actions__delete" onClick={() => setConfirming(true)} aria-label={`Supprimer la source ${source.title}`}><Trash2 size={15} aria-hidden="true" />Supprimer la source</button>}
    {viewer && <PdfViewer source={source} loadUrl={() => getSourcePdfUrlAction(courseSlug, source.id)} onClose={() => setViewer(false)} />}
    {confirming && <SourceDeleteDialog courseSlug={courseSlug} source={source} onClose={() => setConfirming(false)} onDeleted={() => { setConfirming(false); onDeleted?.(); }} />}
  </div>;
}
