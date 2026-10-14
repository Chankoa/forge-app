"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Eye, MoreHorizontal, Settings2 } from "lucide-react";
import { positionCourseOverflowMenu } from "@/lib/courses/overflow-menu";

export function CourseOverflowMenu({ title, previewHref, manageHref }: { title: string; previewHref?: string; manageHref?: string }) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  function updatePosition() {
    if (!trigger.current) return;
    setPosition(positionCourseOverflowMenu(trigger.current.getBoundingClientRect(), { width: window.innerWidth, height: window.innerHeight }));
  }
  function toggleMenu() {
    if (open) { setOpen(false); return; }
    updatePosition();
    setOpen(true);
  }
  useEffect(() => {
    if (!open) return;
    function keydown(event: KeyboardEvent) { if (event.key === "Escape") { setOpen(false); trigger.current?.focus(); } }
    function pointer(event: MouseEvent) { if (!root.current?.contains(event.target as Node)) setOpen(false); }
    document.addEventListener("keydown", keydown);
    document.addEventListener("mousedown", pointer);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => { document.removeEventListener("keydown", keydown); document.removeEventListener("mousedown", pointer); window.removeEventListener("resize", updatePosition); window.removeEventListener("scroll", updatePosition, true); };
  }, [open]);
  return <div className="owner-course-menu course-row-menu" ref={root}>
    <button ref={trigger} type="button" className="icon-button" aria-label={`Autres actions pour ${title}`} aria-expanded={open} aria-haspopup="menu" onClick={toggleMenu}><MoreHorizontal size={18} aria-hidden="true" /></button>
    {open && position && <div className="owner-course-menu__popover" role="menu" style={position}>{manageHref && <Link href={manageHref} role="menuitem" onClick={() => setOpen(false)}><Settings2 size={15} aria-hidden="true" />Gérer</Link>}{previewHref && <Link href={previewHref} role="menuitem" onClick={() => setOpen(false)}><Eye size={15} aria-hidden="true" />Aperçu</Link>}</div>}
  </div>;
}

export function OwnerCourseMenu({ title, manageHref }: { title: string; manageHref: string }) {
  return <CourseOverflowMenu title={title} manageHref={manageHref} />;
}
