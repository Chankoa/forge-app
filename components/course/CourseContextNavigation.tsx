import Link from "next/link";
import type { CourseCapabilities } from "@/lib/capabilities/course-capabilities";
import { getCourseContextLinks } from "@/lib/courses/context-navigation";
import { ArrowLeft, BookOpen, LayoutDashboard, PenLine, Upload } from "lucide-react";

const icons = { "Vue d'ensemble": LayoutDashboard, "Apprendre": BookOpen, "Modifier": PenLine, "Publication": Upload };

export function CourseContextNavigation({ courseSlug, capabilities, lessonSlug, learnLessonSlug, activeMode }: { courseSlug: string; capabilities: CourseCapabilities; lessonSlug?: string; learnLessonSlug?: string; activeMode: "view" | "learn" | "edit" | "publication" }) {
  const activeLabel = activeMode === "view" ? "Vue d'ensemble" : activeMode === "learn" ? "Apprendre" : activeMode === "edit" ? "Modifier" : "Publication";
  return <div className="course-context-navigation"><Link className="course-back-link" href="/app/courses"><ArrowLeft size={15} /> Mes parcours</Link><nav className="mode-switch" aria-label="Contexte du parcours">{getCourseContextLinks(courseSlug, capabilities, lessonSlug, learnLessonSlug).map((link) => { const Icon = icons[link.label]; return <Link aria-current={link.label === activeLabel ? "page" : undefined} href={link.href} key={link.label}><Icon size={15} />{link.label}</Link>; })}</nav></div>;
}
