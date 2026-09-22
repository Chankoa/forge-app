import { CourseLibrary } from "@/components/course/CourseLibrary";
import { listMyCourses } from "@/lib/courses/learning-repository";
import { Surface } from "@/components/ui/Surface";

export default async function CoursesPage() {
  const courses = await listMyCourses();
  const items = courses.map(({ course, state, isOwner }) => {
    const lessons = course.outline.flatMap((module) => module.lessons);
    const lesson = lessons.find((item) => item.id === state.continueLessonId) ?? lessons[0];
    return { id: course.id, slug: course.slug, title: course.title, description: course.description, domain: course.domain, status: course.status, lessonCount: lessons.length, durationMinutes: course.durationMinutes ?? lessons.reduce((total, item) => total + (item.durationMinutes ?? 0), 0), lessonSlug: lesson?.slug ?? null, enrolled: Boolean(state.enrollment), isOwner, percentage: state.percentage, completedCount: state.completedLessonIds.size };
  });
  return <><header className="library-header"><p className="eyebrow">Mes parcours</p><h1>Votre bibliothèque de parcours.</h1><p>Retrouvez ce que vous apprenez et ce que vous créez, avec la prochaine action utile.</p></header>{items.length ? <CourseLibrary courses={items} /> : <Surface className="empty-state">Aucun parcours pour le moment.</Surface>}</>;
}