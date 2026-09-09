import Link from "next/link";
import type { CourseCapabilities } from "@/lib/capabilities/course-capabilities";
import { courseOverviewPath, getCourseContextLinks } from "@/lib/courses/context-navigation";

export function CourseContextNavigation({ courseSlug, capabilities, lessonSlug }: { courseSlug: string; capabilities: CourseCapabilities; lessonSlug?: string }) {
  return <div className="course-context-navigation"><Link className="course-back-link" href={courseOverviewPath(courseSlug)}>← Retour au parcours</Link><nav className="mode-switch" aria-label="Contexte du parcours">{getCourseContextLinks(courseSlug, capabilities, lessonSlug).map((link) => <Link href={link.href} key={link.label}>{link.label}</Link>)}</nav></div>;
}