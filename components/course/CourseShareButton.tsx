"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { Copy, ExternalLink, Share2 } from "lucide-react";
import { dispatchToast } from "@/lib/ui/toast";

export function CourseShareButton({ sharePath, publicationHref }: { sharePath: string | null; publicationHref: string }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const popover = useRef<HTMLDivElement>(null);
  const popoverId = useId();

  const close = (restoreFocus = false) => {
    setOpen(false);
    if (restoreFocus) requestAnimationFrame(() => trigger.current?.focus());
  };

  useEffect(() => {
    const closePopover = (event: KeyboardEvent | MouseEvent) => {
      if (event instanceof KeyboardEvent && event.key === "Escape") close(true);
      if (event instanceof MouseEvent && root.current && !root.current.contains(event.target as Node)) close();
    };
    document.addEventListener("keydown", closePopover);
    document.addEventListener("mousedown", closePopover);
    return () => { document.removeEventListener("keydown", closePopover); document.removeEventListener("mousedown", closePopover); };
  }, []);

  useEffect(() => {
    if (!open) return;
    popover.current?.querySelector<HTMLElement>('button:not(:disabled), a[href]')?.focus();
  }, [open]);

  const copy = async () => {
    if (!sharePath) return;
    try {
      await navigator.clipboard.writeText(new URL(sharePath, window.location.origin).toString());
      dispatchToast("Lien copié.");
      close(true);
    } catch {
      dispatchToast("Le lien n’a pas pu être copié.", "neutral");
    }
  };

  return <div className="course-share" ref={root}>
    <button ref={trigger} type="button" className="course-share__trigger" aria-controls={open ? popoverId : undefined} aria-expanded={open} aria-haspopup="dialog" onClick={() => setOpen((current) => !current)}><Share2 size={16} aria-hidden="true" />Partager</button>
    {open && <div ref={popover} id={popoverId} className="course-share__popover" role="dialog" aria-label="Partager le parcours">
      {sharePath ? <>
        <p>Parcours public</p>
        <button type="button" onClick={copy}><Copy size={15} aria-hidden="true" />Copier le lien</button>
        <Link href={sharePath} target="_blank" rel="noreferrer" onClick={() => setOpen(false)}><ExternalLink size={15} aria-hidden="true" />Ouvrir le parcours</Link>
      </> : <>
        <p>Publiez ce parcours pour obtenir un lien public.</p>
        <Link href={publicationHref} onClick={() => setOpen(false)}>Gérer la publication</Link>
      </>}
    </div>}
  </div>;
}
