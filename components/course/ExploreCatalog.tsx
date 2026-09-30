"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Compass, Search } from "lucide-react";
import { EnrollButton, StartCourseLink } from "@/components/learning/LearningActions";
import { CourseCover, CourseFacts } from "./CoursePresentation";
import { DomainMetadata } from "./DomainMetadata";
import { courseLevelLabel, exploreDomains, selectExploreCourses, type DiscoverableCourse } from "@/lib/courses/explore-view";

function FeaturedCourse({ course }: { course: DiscoverableCourse }) {
  const href = `/app/courses/${course.slug}`;
  return <article className="explore-feature"><CourseCover domain={course.domain} /><div className="explore-feature__body"><DomainMetadata domain={course.domain} /><h3><Link href={href}>{course.title}</Link></h3>{course.description && <p>{course.description}</p>}<div className="explore-feature__meta"><CourseFacts durationMinutes={course.durationMinutes} />{courseLevelLabel(course.level) && <span>{courseLevelLabel(course.level)}</span>}</div><div className="explore-feature__actions"><Link href={href}>Voir le parcours <ArrowRight size={16} aria-hidden="true" /></Link>{course.enrolled ? <StartCourseLink href={href} label="Continuer" /> : <EnrollButton courseId={course.id} courseSlug={course.slug} />}</div></div></article>;
}

function RecentCourse({ course }: { course: DiscoverableCourse }) {
  return <article className="explore-recent__row"><CourseCover domain={course.domain} compact /><div><DomainMetadata domain={course.domain} /><h3>{course.title}</h3>{course.description && <p>{course.description}</p>}</div><div className="explore-feature__meta"><CourseFacts durationMinutes={course.durationMinutes} />{courseLevelLabel(course.level) && <span>{courseLevelLabel(course.level)}</span>}</div><Link href={`/app/courses/${course.slug}`} aria-label={`Voir le parcours ${course.title}`}>Voir le parcours <ArrowRight size={16} aria-hidden="true" /></Link></article>;
}

export function ExploreCatalog({ courses }: { courses: DiscoverableCourse[] }) {
  const [query, setQuery] = useState("");
  const [domain, setDomain] = useState("");
  const domains = exploreDomains(courses);
  const { featured, recent, count } = selectExploreCourses(courses, query, domain);
  return <div className="explore-journey">
    <header className="explore-journey__hero"><div><p className="eyebrow">Découverte</p><h1>Explorer</h1><p>Découvrez les parcours publiés et trouvez un sujet à approfondir.</p></div><label className="explore-journey__search"><Search size={18} aria-hidden="true" /><span className="sr-only">Rechercher un parcours ou un domaine</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher un parcours ou un domaine" /></label></header>
    <nav className="explore-domains" aria-label="Filtrer par domaine"><button type="button" aria-pressed={!domain} onClick={() => setDomain("")}>Tous</button>{domains.map((item) => <button type="button" key={item} aria-pressed={domain === item} onClick={() => setDomain(item)}>{item}</button>)}</nav>
    <p className="explore-journey__count" role="status">{count} parcours trouvé{count > 1 ? "s" : ""}</p>
    <div className="explore-journey__columns"><div className="explore-journey__main">
      <section className="explore-journey__section" aria-labelledby="explore-featured-title"><div className="explore-journey__section-heading"><p className="eyebrow">Parcours publics</p><h2 id="explore-featured-title">À découvrir</h2><p>Quelques parcours publics à explorer.</p></div>{featured.length ? <div className="explore-feature-grid">{featured.map((course) => <FeaturedCourse key={course.id} course={course} />)}</div> : <p className="explore-journey__empty">Aucun parcours ne correspond à cette recherche.</p>}</section>
      <section className="explore-journey__section" aria-labelledby="explore-recent-title"><div className="explore-journey__section-heading"><p className="eyebrow">Dans le catalogue</p><h2 id="explore-recent-title">Autres parcours publiés</h2><p>La suite du catalogue public Forge.</p></div>{recent.length ? <div className="explore-recent">{recent.map((course) => <RecentCourse key={course.id} course={course} />)}</div> : <p className="explore-journey__empty">Aucun autre parcours publié pour cette sélection.</p>}</section>
    </div><aside className="explore-journey__aside" aria-label="Explorer Forge"><section><div className="explore-journey__aside-title"><Compass size={18} aria-hidden="true" /><h2>Domaines à explorer</h2></div>{domains.length ? <nav aria-label="Choisir un domaine">{domains.map((item) => <button type="button" key={item} onClick={() => setDomain(item)} aria-pressed={domain === item}>{item}<ArrowRight size={15} aria-hidden="true" /></button>)}</nav> : <p>Les domaines des parcours publiés apparaîtront ici.</p>}</section><section><h2>Une idée de parcours ?</h2><p>Décrivez votre sujet et construisez un parcours avec Forge.</p><Link href="/app/create">Créer un parcours <ArrowRight size={16} aria-hidden="true" /></Link></section></aside></div>
  </div>;
}
