"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Eye, MoreHorizontal, Settings2 } from "lucide-react";

export function CourseOverflowMenu({ title, previewHref, manageHref }: { title: string; previewHref?: string; manageHref?: string }) {
  const [open, setOpen] = useState(false); const root = useRef<HTMLDivElement>(null);
  useEffect(() => { if (!open) return; function keydown(event: KeyboardEvent) { if (event.key === "Escape") { setOpen(false); root.current?.querySelector<HTMLButtonElement>("button")?.focus(); } } function pointer(event: MouseEvent) { if (!root.current?.contains(event.target as Node)) setOpen(false); } document.addEventListener("keydown", keydown); document.addEventListener("mousedown", pointer); return () => { document.removeEventListener("keydown", keydown); document.removeEventListener("mousedown", pointer); }; }, [open]);
  return <div className="owner-course-menu course-row-menu" ref={root}>
    <button type="button" className="icon-button" aria-label={`Autres actions pour ${title}`} aria-expanded={open} aria-haspopup="menu" onClick={() => setOpen((value) => !value)}><MoreHorizontal size={18} aria-hidden="true" /></button>
    {open && <div className="owner-course-menu__popover" role="menu">{manageHref && <Link href={manageHref} role="menuitem" onClick={() => setOpen(false)}><Settings2 size={15} aria-hidden="true" />Gérer</Link>}{previewHref && <Link href={previewHref} role="menuitem" onClick={() => setOpen(false)}><Eye size={15} aria-hidden="true" />Aperçu</Link>}</div>}
  </div>;
}

export function OwnerCourseMenu({ title, manageHref }: { title: string; manageHref: string }) {
  return <CourseOverflowMenu title={title} manageHref={manageHref} />;
}
