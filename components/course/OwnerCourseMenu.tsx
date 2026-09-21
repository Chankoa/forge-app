"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { MoreHorizontal, Settings2, Trash2 } from "lucide-react";

export function OwnerCourseMenu({ title, manageHref }: { title: string; manageHref: string }) {
  const [open, setOpen] = useState(false); const root = useRef<HTMLDivElement>(null);
  useEffect(() => { if (!open) return; function keydown(event: KeyboardEvent) { if (event.key === "Escape") { setOpen(false); root.current?.querySelector<HTMLButtonElement>("button")?.focus(); } } function pointer(event: MouseEvent) { if (!root.current?.contains(event.target as Node)) setOpen(false); } document.addEventListener("keydown", keydown); document.addEventListener("mousedown", pointer); return () => { document.removeEventListener("keydown", keydown); document.removeEventListener("mousedown", pointer); }; }, [open]);
  return <div className="owner-course-menu" ref={root}><button type="button" className="icon-button" aria-label={`Actions pour ${title}`} aria-expanded={open} aria-haspopup="menu" onClick={() => setOpen((value) => !value)}><MoreHorizontal size={18} /></button>{open && <div className="owner-course-menu__popover" role="menu"><Link href={manageHref} role="menuitem" onClick={() => setOpen(false)}><Settings2 size={15} />Gérer</Link><button type="button" role="menuitem" disabled title="Suppression indisponible : cascades et RLS non auditées"><Trash2 size={15} />Supprimer</button><small>Suppression indisponible tant que les cascades et RLS ne sont pas vérifiées.</small></div>}</div>;
}
