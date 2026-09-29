import Link from "next/link";
import { ArrowRight, BookOpen, Compass } from "lucide-react";
import { PublicIntentExperience } from "@/components/forge/PublicIntentExperience";
import { DomainMetadata } from "@/components/course/DomainMetadata";
import { listActiveDomains } from "@/lib/courses/authoring-repository";
import { listMyCourses } from "@/lib/courses/learning-repository";

export default async function AppHome() {
  const [domains, courses] = await Promise.all([listActiveDomains(), listMyCourses()]);
  const continuing = courses.find(({ state }) => state.enrollment && state.percentage > 0 && state.percentage < 100)
    ?? courses.find(({ state }) => state.enrollment && state.percentage < 100)
    ?? courses.find(({ isOwner }) => isOwner)
    ?? courses[0];
  const visible = continuing ? [continuing, ...courses.filter(({ course }) => course.id !== continuing.course.id).slice(0, 3)] : [];
  const lessonHref = (item: typeof courses[number]) => {
    const lessons = item.course.outline.flatMap((module) => module.lessons);
    const lesson = lessons.find((candidate) => candidate.id === item.state.continueLessonId) ?? lessons[0];
    return lesson ? `/app/courses/${item.course.slug}/lessons/${lesson.slug}` : `/app/courses/${item.course.slug}`;
  };
  return <div className="workspace-home workspace-journey">
    <PublicIntentExperience authenticated domains={domains.map(({ name }) => ({ name }))} />
    <section className="workspace-journey__section" aria-labelledby="workspace-courses-title"><div className="workspace-journey__section-heading"><div><p className="eyebrow">Continuer</p><h2 id="workspace-courses-title">Vos parcours</h2></div><Link href="/app/courses">Tous mes parcours <ArrowRight size={16} aria-hidden="true" /></Link></div>
      {visible.length ? <div className="workspace-journey__courses">{visible.map((item) => <article className="workspace-journey__course" key={item.course.id}><div><p className="workspace-journey__course-context">{item.isOwner ? "Je crée" : "J’apprends"}{item.state.enrollment && item.isOwner ? " · J’apprends" : ""}</p><h3>{item.course.title}</h3><DomainMetadata domain={item.course.domain} />{item.state.enrollment && <p className="workspace-journey__course-progress">{item.state.completedLessonIds.size} / {item.course.outline.flatMap((module) => module.lessons).length} leçons terminées</p>}</div><Link className="workspace-journey__course-action" href={item.isOwner ? `/app/courses/${item.course.slug}` : lessonHref(item)}>{item.isOwner ? "Gérer" : item.state.percentage > 0 ? "Continuer" : "Commencer"}<ArrowRight size={15} aria-hidden="true" /></Link></article>)}</div> : <div className="workspace-journey__empty"><p>Aucun parcours lié à votre compte pour le moment.</p><Link href="/app/create">Créer votre premier parcours <ArrowRight size={16} aria-hidden="true" /></Link></div>}
    </section>
    <nav className="workspace-journey__destinations" aria-label="Autres destinations"><Link href="/app/courses"><BookOpen size={17} aria-hidden="true" />Mes parcours</Link><Link href="/app/explore"><Compass size={17} aria-hidden="true" />Explorer les parcours</Link></nav>
  </div>;
}
