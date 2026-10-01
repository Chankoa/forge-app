import { CourseLibrary } from "@/components/course/CourseLibrary";
import { listMyCourses } from "@/lib/courses/learning-repository";
import { Surface } from "@/components/ui/Surface";
import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";
import { knownCourseDuration } from "@/lib/courses/presentation";

export default async function CoursesPage() {
  const courses = await listMyCourses();
  const items = courses.map(({ course, state, isOwner, collaborationRole }) => {
    const lessons = course.outline.flatMap((module) => module.lessons);
    const lesson = lessons.find((item) => item.id === state.continueLessonId) ?? lessons[0];
    return { id: course.id, slug: course.slug, title: course.title, description: course.description, domain: course.domain, status: course.status, moduleCount: course.outline.length, lessonCount: lessons.length, durationMinutes: knownCourseDuration(course), lessonSlug: lesson?.slug ?? null, enrolled: Boolean(state.enrollment), isOwner, collaborationRole, author: course.author, percentage: state.percentage, completedCount: state.completedLessonIds.size };
  });
  return <><header className="library-header"><div><p className="eyebrow">Votre espace</p><h1>Mes parcours</h1><p>Retrouvez les parcours que vous apprenez et ceux que vous créez.</p></div><Link className="button button--primary" href="/app/create"><Plus size={16} aria-hidden="true" />Créer un parcours</Link></header>{items.length ? <CourseLibrary courses={items} /> : <Surface className="empty-state"><p>Aucun parcours lié à votre compte pour le moment.</p><Link href="/app/create">Créer un parcours <ArrowRight size={16} aria-hidden="true" /></Link></Surface>}</>;
}
