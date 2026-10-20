"use client";

import { useEffect, useRef, useState } from "react";
import { ExternalLink, X } from "lucide-react";
import { formatFileSize } from "@/lib/forge/source-resources";

export const pdfViewerMessages = { failure: "Le document ne peut pas être affiché.", loading: "Chargement du document…", openInTab: "Ouvrir dans un nouvel onglet", close: "Fermer" };

export type PdfViewerSource = { id: string; title: string; fileSize?: number };
export type PdfUrlLoader = () => Promise<{ ok: true; url: string } | { ok: false }>;

// A fresh signed URL is requested on every open; it is kept in memory only.
export function PdfViewer({ source, loadUrl, onClose }: { source: PdfViewerSource; loadUrl: PdfUrlLoader; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [state, setState] = useState<{ phase: "loading" } | { phase: "ready"; url: string } | { phase: "failed" }>({ phase: "loading" });

  useEffect(() => {
    const node = dialog.current;
    if (node && !node.open) node.showModal();
    let active = true;
    loadUrl()
      .then((result) => { if (active) setState(result.ok ? { phase: "ready", url: result.url } : { phase: "failed" }); })
      .catch(() => { if (active) setState({ phase: "failed" }); });
    return () => { active = false; };
    // loadUrl is a fresh closure each render; only the resource identity should retrigger loading.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source.id]);

  const size = formatFileSize(source.fileSize);
  const url = state.phase === "ready" ? state.url : null;
  return <dialog ref={dialog} className="pdf-viewer" aria-labelledby="pdf-viewer-title" onCancel={(event) => { event.preventDefault(); onClose(); }} onClose={onClose}>
    <header className="pdf-viewer__header">
      <div className="pdf-viewer__title"><h2 id="pdf-viewer-title">{source.title}</h2><p className="caption">PDF{size ? ` · ${size}` : ""}</p></div>
      <div className="pdf-viewer__actions">
        {url && <a className="button button--secondary" href={url} target="_blank" rel="noopener noreferrer"><ExternalLink size={16} aria-hidden="true" />{pdfViewerMessages.openInTab}</a>}
        <button type="button" className="button button--secondary" onClick={onClose} autoFocus><X size={16} aria-hidden="true" />{pdfViewerMessages.close}</button>
      </div>
    </header>
    <div className="pdf-viewer__body">
      {state.phase === "loading" && <p className="caption" role="status">{pdfViewerMessages.loading}</p>}
      {state.phase === "failed" && <p className="form-error" role="alert">{pdfViewerMessages.failure}</p>}
      {url && <iframe className="pdf-viewer__frame" src={url} title={`Document : ${source.title}`} onError={() => setState({ phase: "failed" })} />}
    </div>
  </dialog>;
}
