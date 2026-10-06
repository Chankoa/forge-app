import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PublicCourseDetail } from "@/components/course/PublicCourseDetail";
import { CourseRemixButton } from "@/components/course/CourseRemixButton";
import { PublicShell } from "@/components/shell/PublicShell";
import { getAuthoringRelationship } from "@/lib/courses/authoring-repository";
import { courseEditPath } from "@/lib/courses/context-navigation";
import { canOfferPublicCourseRemix } from "@/lib/courses/remix";
import { getPublicCourseDetail } from "@/lib/courses/public-course-repository";

type Props = { params: Promise<{ courseSlug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const course = await getPublicCourseDetail((await params).courseSlug);
  return course ? { title: `${course.title} | Forge`, description: course.subtitle ?? course.description ?? "Parcours public Forge", alternates: { canonical: `/courses/${course.slug}` } } : { title: "Parcours introuvable | Forge" };
}

export default async function PublicCoursePage({ params }: Props) {
  const course = await getPublicCourseDetail((await params).courseSlug);
  if (!course) notFound();
  const relationship = await getAuthoringRelationship(course.id);
  const next = encodeURIComponent(`/courses/${course.slug}`);
  const remixable = canOfferPublicCourseRemix({ isAuthenticated: relationship.isAuthenticated, isOwner: relationship.isOwner, status: "published", visibility: "public", hasPublicAuthor: Boolean(course.author) });
  const action = !relationship.isAuthenticated ? <div className="public-course__actions"><Link className="button" href={`/login?next=${next}`}>Se connecter pour commencer</Link><Link className="button button--secondary" href={`/login?next=${next}`}>Se connecter pour remixer</Link></div>
    : relationship.isOwner ? <Link className="button" href={courseEditPath(course.slug)}>Gérer le parcours</Link>
    : relationship.membershipStatus === "active" && relationship.membershipRole === "editor" ? <Link className="button" href={`/app/courses/${course.slug}`}>J’édite ce parcours</Link>
    : relationship.membershipStatus === "active" && relationship.membershipRole === "viewer" ? <Link className="button button--secondary" href={`/app/courses/${course.slug}`}>Ouvrir en lecture</Link>
    : remixable ? <CourseRemixButton courseId={course.id} />
    : <Link className="button" href={`/app/courses/${course.slug}`}>Commencer le parcours</Link>;
  return <PublicShell><PublicCourseDetail course={course} action={action} /></PublicShell>;
}