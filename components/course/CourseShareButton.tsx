"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Copy, ExternalLink, Share2 } from "lucide-react";
import { dispatchToast } from "@/lib/ui/toast";

export function CourseShareButton({ sharePath, publicationHref }: { sharePath: string | null; publicationHref: string }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (event: KeyboardEvent | MouseEvent) => {
      if (event instanceof KeyboardEvent && event.key === "Escape") setOpen(false);
      if (event instanceof MouseEvent && root.current && !root.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", close);
    document.addEventListener("mousedown", close);
    return () => { document.removeEventListener("keydown", close); document.removeEventListener("mousedown", close); };
  }, []);

  const copy = async () => {
    if (!sharePath) return;
    try {
      await navigator.clipboard.writeText(new URL(sharePath, window.location.origin).toString());
      dispatchToast("Lien copié.");
      setOpen(false);
    } catch {
      dispatchToast("Le lien n’a pas pu être copié.", "neutral");
    }
  };

  return <div className="course-share" ref={root}>
    <button type="button" className="course-share__trigger" aria-expanded={open} aria-haspopup="dialog" onClick={() => setOpen((current) => !current)}><Share2 size={16} aria-hidden="true" />Partager</button>
    {open && <div className="course-share__popover" role="dialog" aria-label="Partager le parcours">
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
