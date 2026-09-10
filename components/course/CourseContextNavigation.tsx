import Link from "next/link";
import type { CourseCapabilities } from "@/lib/capabilities/course-capabilities";
import { getCourseContextLinks } from "@/lib/courses/context-navigation";

export function CourseContextNavigation({ courseSlug, capabilities, lessonSlug, activeMode }: { courseSlug: string; capabilities: CourseCapabilities; lessonSlug?: string; activeMode: "view" | "learn" | "edit" | "publication" }) {
  const activeLabel = activeMode === "view" ? "Vue d'ensemble" : activeMode === "learn" ? "Apprendre" : activeMode === "edit" ? "Modifier" : "Publication";
  return <div className="course-context-navigation"><Link className="course-back-link" href="/app/courses">← Mes parcours</Link><nav className="mode-switch" aria-label="Contexte du parcours">{getCourseContextLinks(courseSlug, capabilities, lessonSlug).map((link) => <Link aria-current={link.label === activeLabel ? "page" : undefined} href={link.href} key={link.label}>{link.label}</Link>)}</nav></div>;
}