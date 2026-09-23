import Link from "next/link";
import type { CourseCapabilities } from "@/lib/capabilities/course-capabilities";
import { getCourseContextLinks } from "@/lib/courses/context-navigation";
import { ArrowLeft, BookOpen, Eye, LayoutDashboard, PenLine, Upload } from "lucide-react";
import { EnrollButton } from "@/components/learning/LearningActions";

const icons = { "Vue d'ensemble": LayoutDashboard, "Apprendre": BookOpen, "Prévisualiser": Eye, "Modifier": PenLine, "Publication": Upload };

export function CourseContextNavigation({ courseId, courseSlug, enrollable, capabilities, lessonSlug, learnLessonSlug, activeMode }: { courseId: string; courseSlug: string; enrollable: boolean; capabilities: CourseCapabilities; lessonSlug?: string; learnLessonSlug?: string; activeMode: "view" | "learn" | "preview" | "edit" | "publication" }) {
  const activeLabel = activeMode === "view" ? "Vue d'ensemble" : activeMode === "learn" ? "Apprendre" : activeMode === "preview" ? "Prévisualiser" : activeMode === "edit" ? "Modifier" : "Publication";
  const links = getCourseContextLinks(courseSlug, capabilities, lessonSlug, learnLessonSlug);
  return <div className="course-context-navigation"><Link className="course-back-link" href="/app/courses"><ArrowLeft size={15} /> Mes parcours</Link><nav className="mode-switch" aria-label="Contexte du parcours">{links.flatMap((link) => { const Icon = icons[link.label]; const element = <Link aria-current={link.label === activeLabel ? "page" : undefined} href={link.href} key={link.label}><Icon size={15} />{link.label}</Link>; return link.label === "Vue d'ensemble" && enrollable && !capabilities.canLearn ? [element, <EnrollButton key="enroll" courseId={courseId} courseSlug={courseSlug} />] : [element]; })}</nav></div>;
}
