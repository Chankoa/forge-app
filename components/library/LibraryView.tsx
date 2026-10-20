"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { BookOpen, ExternalLink, FileText, Film, Globe, Image as ImageIcon, Music, Search, Sparkles, Trash2 } from "lucide-react";
import { deleteLibraryMediaAction, getLibraryMediaPreviewAction, getLibraryThumbnailsAction } from "@/app/app/library/actions";
import { deleteLessonResourceAction, getLessonResourcePdfUrlAction } from "@/app/app/courses/resource-actions";
import { deleteForgeSourceAction, getSourcePdfUrlAction } from "@/app/app/forge/source-actions";
import { PdfViewer } from "@/components/forge/PdfViewer";
import { formatFileSize } from "@/lib/forge/source-resources";
import { defaultLibraryFilters, filterLibraryItems, isImageThumbnailCandidate, libraryCourseHref, libraryEmptyMessage, libraryKindLabels, libraryLessonHref, libraryMessages, libraryTabCounts, libraryTabLabels, type LibraryFilters, type LibraryItem, type LibraryTab } from "@/lib/library/library-items";
import { dispatchToast } from "@/lib/ui/toast";

const PAGE = 24;
const date = (value: string | null) => (value ? new Date(value).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) : "—");
const sourceStatusLabel: Record<string, string> = { ready: "Prête pour Forge", pending: "En préparation", error: "Lecture impossible" };

function KindIcon({ item }: { item: LibraryItem }) {
  const Icon = item.kind === "source" ? (item.sourceKind === "url" ? Globe : Sparkles) : item.kind === "resource" ? (item.isPdf ? FileText : BookOpen) : item.mediaKind === "audio" ? Music : item.mediaKind === "video" ? Film : ImageIcon;
  return <Icon size={18} aria-hidden="true" />;
}

function statusPill(item: LibraryItem) {
  if (item.kind === "media") return item.status !== "ready" ? { label: "Indisponible", tone: "warn" } : item.referenced ? { label: "Référencé", tone: "ok" } : { label: "Non référencé", tone: "muted" };
  if (item.kind === "source") return { label: sourceStatusLabel[item.status] ?? item.status, tone: item.status === "ready" ? "ok" : item.status === "error" ? "warn" : "muted" };
  return { label: item.visibility, tone: "muted" };
}

function Modal({ label, onClose, children, wide = false }: { label: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { const node = dialog.current; if (node && !node.open) node.showModal(); }, []);
  return <dialog ref={dialog} className={`course-remix-dialog lib-dialog${wide ? " lib-dialog--wide" : ""}`} aria-label={label} onCancel={(event) => { event.preventDefault(); onClose(); }} onClose={onClose}>{children}</dialog>;
}

function Context({ item }: { item: LibraryItem }) {
  const lessonHref = libraryLessonHref(item);
  return <span className="lib-context"><Link href={libraryCourseHref(item)}>{item.courseTitle}</Link>{item.moduleTitle && <> <span aria-hidden="true">›</span> {item.moduleTitle}</>}{item.lessonTitle && <> <span aria-hidden="true">›</span> {lessonHref ? <Link href={lessonHref}>{item.lessonTitle}</Link> : item.lessonTitle}</>}</span>;
}

function ImagePreview({ item, onClose }: { item: LibraryItem; onClose: () => void }) {
  const [url, setUrl] = useState<string | null | undefined>(undefined);
  useEffect(() => { let on = true; getLibraryMediaPreviewAction(item.id).then((r) => { if (on) setUrl(r.ok ? r.url : null); }).catch(() => on && setUrl(null)); return () => { on = false; }; }, [item.id]);
  const lessonHref = libraryLessonHref(item);
  return <Modal label={`Aperçu : ${item.title}`} onClose={onClose} wide>
    <div className="course-remix-dialog__body lib-preview">
      <div className="lib-preview__frame">{url === undefined ? <p className="caption">Chargement…</p> : url ? <img src={url} alt={item.altText ?? item.title} /> : <p className="caption">Le média ne peut pas être affiché.</p>}</div>
      <h2>{item.title}</h2>
      <dl className="lib-meta">
        <div><dt>Texte alternatif</dt><dd>{item.altText || "—"}</dd></div>
        {item.caption && <div><dt>Légende</dt><dd>{item.caption}</dd></div>}
        <div><dt>Parcours</dt><dd><Link href={libraryCourseHref(item)}>{item.courseTitle}</Link></dd></div>
        <div><dt>Leçon</dt><dd>{item.lessonTitle ? (lessonHref ? <Link href={lessonHref}>{item.lessonTitle}</Link> : item.lessonTitle) : "—"}</dd></div>
        <div><dt>État</dt><dd>{item.referenced ? `Référencé dans ${item.referenceCount} leçon${item.referenceCount > 1 ? "s" : ""}` : "Non référencé"}</dd></div>
      </dl>
    </div>
    <footer><button type="button" className="button button--secondary" onClick={onClose} autoFocus>Fermer</button></footer>
  </Modal>;
}

function SourceInspect({ item, onClose }: { item: LibraryItem; onClose: () => void }) {
  return <Modal label={`Source : ${item.title}`} onClose={onClose}>
    <div className="course-remix-dialog__body">
      <h2>{item.title}</h2>
      <dl className="lib-meta">
        <div><dt>Type</dt><dd>{item.typeLabel}</dd></div>
        <div><dt>Parcours</dt><dd><Link href={libraryCourseHref(item)}>{item.courseTitle}</Link></dd></div>
        <div><dt>Statut Forge</dt><dd>{sourceStatusLabel[item.status] ?? item.status}</dd></div>
        <div><dt>Visibilité</dt><dd>{item.visibility}</dd></div>
        <div><dt>Ajoutée le</dt><dd>{date(item.createdAt)}</dd></div>
      </dl>
      {item.url && <p><a href={item.url} target="_blank" rel="noopener noreferrer">Ouvrir le lien <ExternalLink size={14} aria-hidden="true" /></a></p>}
    </div>
    <footer><button type="button" className="button button--secondary" onClick={onClose} autoFocus>Fermer</button></footer>
  </Modal>;
}

function DeleteDialog({ item, onClose, onDeleted }: { item: LibraryItem; onClose: () => void; onDeleted: (id: string) => void }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const blocked = item.kind === "media" && item.referenced === true;
  const confirm = () => start(async () => {
    const result = item.kind === "media" ? await deleteLibraryMediaAction(item.id) : item.kind === "resource" ? await deleteLessonResourceAction(item.courseSlug, item.id) : await deleteForgeSourceAction(item.courseSlug, item.id);
    if (result.ok) { dispatchToast("Élément supprimé."); onDeleted(item.id); return; }
    setError(result.error);
    if (result.code === "storage_delete_failed") onDeleted(item.id);
  });
  return <Modal label="Supprimer" onClose={() => !pending && onClose()}>
    <div className="course-remix-dialog__body">
      <h2>Supprimer cet élément ?</h2>
      <p><strong>{item.title}</strong></p>
      <p className="caption">{item.kind === "media" ? (blocked ? libraryMessages.referencedBlocked : libraryMessages.unreferencedConfirm) : "Le fichier associé sera également supprimé."}</p>
      {error && <p className="form-error" role="alert">{error}</p>}
    </div>
    <footer><button type="button" className="button button--secondary" onClick={onClose} disabled={pending} autoFocus>Annuler</button><button type="button" className="button" onClick={confirm} disabled={pending || blocked}>{pending ? "Suppression…" : "Supprimer"}</button></footer>
  </Modal>;
}

type Overlay = { type: "preview" | "pdf" | "inspect" | "delete"; item: LibraryItem } | null;

export function LibraryView({ items: initial, courses }: { items: LibraryItem[]; courses: { id: string; title: string }[] }) {
  const [items, setItems] = useState(initial);
  const [filters, setFilters] = useState<LibraryFilters>(defaultLibraryFilters);
  const [visible, setVisible] = useState(PAGE);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const [overlay, setOverlay] = useState<Overlay>(null);
  const requested = useRef(new Set<string>());
  const update = (patch: Partial<LibraryFilters>) => { setFilters((f) => ({ ...f, ...patch })); setVisible(PAGE); };

  const counts = useMemo(() => libraryTabCounts(items), [items]);
  const filtered = useMemo(() => filterLibraryItems(items, filters), [items, filters]);
  const shown = useMemo(() => filtered.slice(0, visible), [filtered, visible]);

  // Thumbnails are resolved lazily for the visible page only, in one batched signing call.
  useEffect(() => {
    const ids = shown.filter((i) => isImageThumbnailCandidate(i) && !requested.current.has(i.id)).map((i) => i.id);
    if (!ids.length) return;
    ids.forEach((id) => requested.current.add(id));
    getLibraryThumbnailsAction(ids).then((urls) => setThumbs((t) => ({ ...t, ...urls }))).catch(() => undefined);
  }, [shown]);

  const tabs = Object.keys(libraryTabLabels) as LibraryTab[];
  const close = () => setOverlay(null);

  return <>
    <header className="lib-header"><div><p className="eyebrow">Votre espace</p><h1>Bibliothèque</h1><p>{libraryMessages.subtitle}</p></div></header>
    <section className="lib-controls" aria-label="Filtres">
      <label className="lib-search"><Search size={16} aria-hidden="true" /><input type="search" value={filters.query} onChange={(e) => update({ query: e.target.value })} placeholder="Rechercher un titre, un fichier, un parcours…" aria-label="Rechercher dans la bibliothèque" /></label>
      <div className="lib-tabs" role="tablist" aria-label="Type d’élément">{tabs.map((tab) => <button key={tab} type="button" role="tab" aria-selected={filters.tab === tab} className={filters.tab === tab ? "is-active" : ""} onClick={() => update({ tab, referenced: tab === "media" || tab === "all" ? filters.referenced : "all" })}>{libraryTabLabels[tab]} <span>{counts[tab]}</span></button>)}</div>
      <div className="lib-selects">
        <label>Parcours<select value={filters.courseId} onChange={(e) => update({ courseId: e.target.value })}><option value="all">Tous les parcours</option>{courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}</select></label>
        {(filters.tab === "all" || filters.tab === "media") && <label>Médias<select value={filters.referenced} onChange={(e) => update({ referenced: e.target.value as LibraryFilters["referenced"] })}><option value="all">Tous</option><option value="referenced">Référencés</option><option value="unreferenced">Non référencés</option></select></label>}
      </div>
    </section>
    {shown.length === 0 ? <p className="lib-empty">{libraryEmptyMessage(items.length, filters)}</p> : <ul className="lib-list">{shown.map((item) => {
      const pill = statusPill(item);
      const thumb = thumbs[item.id];
      const lessonHref = libraryLessonHref(item);
      return <li key={`${item.kind}-${item.id}`} className="lib-row" data-kind={item.kind}>
        <div className="lib-row__icon">{thumb ? <img src={thumb} alt="" /> : <KindIcon item={item} />}</div>
        <div className="lib-row__main"><strong>{item.title}</strong><span className="lib-row__sub"><Context item={item} /></span></div>
        <div className="lib-row__type"><span>{libraryKindLabels[item.kind]}</span><small>{item.typeLabel}{item.fileSize ? ` · ${formatFileSize(item.fileSize)}` : ""}</small></div>
        <div className="lib-row__status"><span className={`lib-pill lib-pill--${pill.tone}`}>{pill.label}</span></div>
        <div className="lib-row__date">{date(item.createdAt)}</div>
        <div className="lib-row__actions">
          {item.kind === "media" && item.mediaKind === "image" && item.storageBacked && <button type="button" className="button button--secondary button--small" onClick={() => setOverlay({ type: "preview", item })}>Aperçu</button>}
          {item.isPdf && <button type="button" className="button button--secondary button--small" onClick={() => setOverlay({ type: "pdf", item })}>Lire</button>}
          {item.kind === "source" && <button type="button" className="button button--secondary button--small" onClick={() => setOverlay({ type: "inspect", item })}>Inspecter</button>}
          {item.kind === "resource" && item.url && <a className="button button--secondary button--small" href={item.url} target="_blank" rel="noopener noreferrer">Ouvrir</a>}
          <Link className="button button--secondary button--small" href={lessonHref ?? libraryCourseHref(item)}>{lessonHref ? "Ouvrir la leçon" : "Ouvrir le parcours"}</Link>
          {item.canDelete && <button type="button" className="button button--secondary button--small lib-row__delete" aria-label={`Supprimer ${item.title}`} onClick={() => setOverlay({ type: "delete", item })}><Trash2 size={14} aria-hidden="true" /></button>}
        </div>
      </li>;
    })}</ul>}
    <footer className="lib-footer"><span>{filtered.length} élément{filtered.length > 1 ? "s" : ""}</span>{filtered.length > shown.length && <button type="button" className="button button--secondary button--small" onClick={() => setVisible((v) => v + PAGE)}>Afficher plus</button>}</footer>
    {overlay?.type === "preview" && <ImagePreview item={overlay.item} onClose={close} />}
    {overlay?.type === "inspect" && <SourceInspect item={overlay.item} onClose={close} />}
    {overlay?.type === "delete" && <DeleteDialog item={overlay.item} onClose={close} onDeleted={(id) => { setItems((list) => list.filter((i) => i.id !== id)); close(); }} />}
    {overlay?.type === "pdf" && <PdfViewer source={{ id: overlay.item.id, title: overlay.item.title, fileSize: overlay.item.fileSize ?? undefined }} loadUrl={() => overlay.item.kind === "source" ? getSourcePdfUrlAction(overlay.item.courseSlug, overlay.item.id) : getLessonResourcePdfUrlAction(overlay.item.courseSlug, overlay.item.id)} onClose={close} />}
  </>;
}
