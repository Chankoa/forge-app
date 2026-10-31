"use client";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { Eye, MoreHorizontal, Settings2 } from "lucide-react";
import { adjacentMenuItem, positionCourseOverflowMenu } from "@/lib/courses/overflow-menu";

export function CourseOverflowMenu({ title, previewHref, manageHref }: { title: string; previewHref?: string; manageHref?: string }) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const menuId = useId();
  function updatePosition() {
    if (!trigger.current) return;
    setPosition(positionCourseOverflowMenu(trigger.current.getBoundingClientRect(), { width: window.innerWidth, height: window.innerHeight }));
  }
  function toggleMenu() {
    if (open) { setOpen(false); return; }
    updatePosition();
    setOpen(true);
  }
  function openMenu() {
    if (open) return;
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
  useEffect(() => {
    if (!open) return;
    menu.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
  }, [open]);
  function moveFocus(event: React.KeyboardEvent<HTMLDivElement>) {
    const items = Array.from(menu.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);
    const index = items.indexOf(event.target as HTMLElement);
    const next = adjacentMenuItem(index, event.key, items.length);
    if (next === index) return;
    event.preventDefault();
    items[next]?.focus();
  }
  return <div className="owner-course-menu course-row-menu" ref={root}>
    <button ref={trigger} type="button" className="icon-button" aria-label={`Autres actions pour ${title}`} aria-controls={open ? menuId : undefined} aria-expanded={open} aria-haspopup="menu" onKeyDown={(event) => { if (event.key === "ArrowDown") { event.preventDefault(); openMenu(); } }} onClick={toggleMenu}><MoreHorizontal size={18} aria-hidden="true" /></button>
    {open && position && <div ref={menu} id={menuId} className="owner-course-menu__popover" role="menu" style={position} onKeyDown={moveFocus}>{manageHref && <Link href={manageHref} role="menuitem" onClick={() => setOpen(false)}><Settings2 size={15} aria-hidden="true" />Gérer</Link>}{previewHref && <Link href={previewHref} role="menuitem" onClick={() => setOpen(false)}><Eye size={15} aria-hidden="true" />Aperçu</Link>}</div>}
  </div>;
}

export function OwnerCourseMenu({ title, manageHref }: { title: string; manageHref: string }) {
  return <CourseOverflowMenu title={title} manageHref={manageHref} />;
}
