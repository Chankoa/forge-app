import { listDiscoverableCourses } from "@/lib/courses/explore-repository";
import { Surface } from "@/components/ui/Surface";
import { EnrollButton, StartCourseLink } from "@/components/learning/LearningActions";
import { ExploreCourseCard } from "@/components/course/CoursePresentation";

export default async function ExplorePage() {
  const { courses, envRequired, unavailable } = await listDiscoverableCourses();
  return <><header className="explore-header"><p className="eyebrow">Explorer</p><h1>Des parcours à découvrir.</h1><p>Parcourez les apprentissages publiés par la communauté Forge.</p></header>{envRequired ? <p className="env-note"><strong>ENV REQUIRED.</strong> Configurez les variables Supabase locales pour lire les parcours publiés du backend LearnIt.</p> : unavailable ? <p className="env-note"><strong>SUPABASE READ UNAVAILABLE.</strong> La lecture des parcours publiés est momentanément indisponible. Vérifiez la configuration locale et les accès du projet partagé.</p> : courses.length ? <div className="explore-course-grid">{courses.map((course) => <ExploreCourseCard key={course.id} course={course} action={course.enrolled ? <StartCourseLink href={`/app/courses/${course.slug}`} label="Continuer" /> : <EnrollButton courseId={course.id} courseSlug={course.slug} />} />)}</div> : <Surface className="empty-state">Aucun parcours public à découvrir pour le moment.</Surface>}</>;
}