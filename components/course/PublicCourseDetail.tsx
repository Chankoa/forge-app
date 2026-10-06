import Link from "next/link";
import { ArrowLeft, ArrowRight, Compass } from "lucide-react";
import { AuthorAttribution } from "./AuthorAttribution";
import { CourseFacts } from "./CoursePresentation";
import { CourseProvenance } from "./CourseProvenance";
import { DomainMetadata } from "./DomainMetadata";
import { courseLevelLabel } from "@/lib/courses/explore-view";
import type { PublicCourseDetail as PublicCourse } from "@/lib/courses/public-course-repository";
import type { ReactNode } from "react";

export function PublicCourseDetail({ course, action }: { course: PublicCourse; action: ReactNode }) {
  const level = courseLevelLabel(course.level);
  const summary = course.subtitle?.trim() || course.description?.trim();
  return <main className="public-course">
    <header className="public-course__hero"><Link className="public-course__back" href="/explore"><ArrowLeft size={16} aria-hidden="true" />Explorer les parcours</Link><div className="public-course__identity"><DomainMetadata domain={course.domain} /><h1>{course.title}</h1>{summary && <p>{summary}</p>}<AuthorAttribution author={course.author} /><div className="public-course__facts"><CourseFacts durationMinutes={course.durationMinutes} />{level && <span>{level}</span>}</div><CourseProvenance provenance={course.provenance} /><div className="public-course__action">{action}</div></div></header>
    <section className="public-course__body" aria-labelledby="public-course-about"><div><p className="eyebrow">À propos du parcours</p><h2 id="public-course-about">Un parcours public Forge</h2>{course.description && <p>{course.description}</p>}</div><aside><Compass size={18} aria-hidden="true" /><strong>Explorer avant de commencer</strong><span>La structure détaillée devient disponible dans votre espace d’apprentissage après inscription.</span></aside></section>
    <Link className="public-course__catalogue-link" href="/explore">Voir d’autres parcours <ArrowRight size={16} aria-hidden="true" /></Link>
  </main>;
}