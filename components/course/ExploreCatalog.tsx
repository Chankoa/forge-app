"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Gauge, Search } from "lucide-react";
import { EnrollButton, StartCourseLink } from "@/components/learning/LearningActions";
import { CourseCover, CourseFacts } from "./CoursePresentation";
import { DomainMetadata } from "./DomainMetadata";
import { AuthorAttribution } from "./AuthorAttribution";
import { CourseOverflowMenu } from "./OwnerCourseMenu";
import { courseLevelLabel, exploreDomains, selectExploreCourses, type DiscoverableCourse } from "@/lib/courses/explore-view";

function FeaturedCourse({ course, publicView }: { course: DiscoverableCourse; publicView: boolean }) {
  const href = `${publicView ? "/courses" : "/app/courses"}/${course.slug}`;
  return <article className="explore-feature"><CourseCover image={course.cover} domain={course.domain} /><div className="explore-feature__body"><DomainMetadata domain={course.domain} /><h3><Link href={href}>{course.title}</Link></h3>{course.description && <p>{course.description}</p>}<AuthorAttribution author={course.author} /><div className="explore-feature__meta"><CourseFacts durationMinutes={course.durationMinutes} />{courseLevelLabel(course.level) && <span><Gauge size={14} aria-hidden="true" />{courseLevelLabel(course.level)}</span>}</div><div className="explore-feature__actions">{publicView ? <Link className="button" href={href}>Voir le parcours <ArrowRight size={16} aria-hidden="true" /></Link> : course.enrolled ? <StartCourseLink href={href} label="Continuer" /> : <EnrollButton courseId={course.id} courseSlug={course.slug} />}<CourseOverflowMenu title={course.title} previewHref={href} /></div></div></article>;
}

function RecentCourse({ course, publicView }: { course: DiscoverableCourse; publicView: boolean }) {
  const href = `${publicView ? "/courses" : "/app/courses"}/${course.slug}`;
  return <article className="explore-recent__row"><CourseCover image={course.cover} domain={course.domain} compact /><div className="explore-recent__identity"><DomainMetadata domain={course.domain} /><h3>{course.title}</h3>{course.description && <p>{course.description}</p>}<AuthorAttribution author={course.author} /></div><div className="explore-feature__meta"><CourseFacts durationMinutes={course.durationMinutes} />{courseLevelLabel(course.level) && <span><Gauge size={14} aria-hidden="true" />{courseLevelLabel(course.level)}</span>}</div><div className="explore-recent__actions"><Link className="button" href={href} aria-label={`Voir le parcours ${course.title}`}>Voir <ArrowRight size={16} aria-hidden="true" /></Link><CourseOverflowMenu title={course.title} previewHref={href} /></div></article>;
}

export function ExploreCatalog({ courses, publicView = false }: { courses: DiscoverableCourse[]; publicView?: boolean }) {
  const [query, setQuery] = useState("");
  const [domain, setDomain] = useState("");
  const domains = exploreDomains(courses);
  const { featured, recent, count } = selectExploreCourses(courses, query, domain);
  return <div className="explore-journey">
    <header className="explore-journey__hero"><div><p className="eyebrow">Découverte</p><h1>Explorer</h1><p>Découvrez les parcours publiés et trouvez un sujet à approfondir.</p></div><label className="explore-journey__search"><Search size={18} aria-hidden="true" /><span className="sr-only">Rechercher un parcours ou un domaine</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher un parcours ou un domaine" /></label></header>
    <nav className="explore-domains" aria-label="Filtrer par domaine"><button type="button" aria-pressed={!domain} onClick={() => setDomain("")}>Tous</button>{domains.map((item) => <button type="button" key={item} aria-pressed={domain === item} onClick={() => setDomain(item)}>{item}</button>)}</nav>
    <p className="explore-journey__count" role="status">{count} parcours trouvé{count > 1 ? "s" : ""}</p>
    <div className="explore-journey__columns"><div className="explore-journey__main">
      <section className="explore-journey__section" aria-labelledby="explore-featured-title"><div className="explore-journey__section-heading"><p className="eyebrow">Parcours publics</p><h2 id="explore-featured-title">À découvrir</h2><p>Quelques parcours publics à explorer.</p></div>{featured.length ? <div className="explore-feature-grid">{featured.map((course) => <FeaturedCourse key={course.id} course={course} publicView={publicView} />)}</div> : <p className="explore-journey__empty">Aucun parcours ne correspond à cette recherche.</p>}</section>
      <section className="explore-journey__section" aria-labelledby="explore-recent-title"><div className="explore-journey__section-heading"><p className="eyebrow">Dans le catalogue</p><h2 id="explore-recent-title">Autres parcours publiés</h2><p>La suite du catalogue public Forge.</p></div>{recent.length ? <div className="explore-recent">{recent.map((course) => <RecentCourse key={course.id} course={course} publicView={publicView} />)}</div> : <p className="explore-journey__empty">Aucun autre parcours publié pour cette sélection.</p>}</section>
    </div></div>
  </div>;
}
