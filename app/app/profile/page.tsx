import Link from "next/link";
import { BookOpen, GraduationCap, PenLine, UserRound, Users } from "lucide-react";
import { ProfileNameForm } from "@/components/profile/ProfileNameForm";
import { saveProfileNameAction } from "./actions";
import { getSelfProfile } from "@/lib/profiles/self-profile-repository";
import { authorInitials } from "@/lib/profiles/author-identity";
import { profileCourseSections, publicAuthorDomains } from "@/lib/profiles/profile-projections";
import { listMyCourses } from "@/lib/courses/learning-repository";
import { Surface } from "@/components/ui/Surface";

export default async function ProfilePage() {
  const [profile, courses] = await Promise.all([getSelfProfile(), listMyCourses()]);
  if (!profile) return <p className="env-note">Votre profil est indisponible. Actualisez la page ou reconnectez-vous.</p>;
  const name = profile.name?.trim() || "Auteur Forge";
  const { authored, collaborations, learning } = profileCourseSections(courses);
  const domains = publicAuthorDomains(courses);
  return <div className="profile-page">
    <header className="library-header"><div><p className="eyebrow">Votre identité Forge</p><h1>{name}</h1><p>Votre identité d’auteur reste distincte de vos paramètres de compte et de sécurité.</p></div><span className="profile-avatar" aria-label={`Initiales de ${name}`}><UserRound size={20} aria-hidden="true" /><strong>{authorInitials(name)}</strong></span></header>
    <div className="profile-page__grid">
      <Surface className="profile-page__identity"><h2>Identité publique</h2><ProfileNameForm name={name} onSave={saveProfileNameAction} /></Surface>
      <Surface className="profile-page__summary"><h2>Votre activité</h2><p><PenLine size={16} aria-hidden="true" />{authored.length} parcours créé{authored.length > 1 ? "s" : ""}</p><p><GraduationCap size={16} aria-hidden="true" />{learning.length} parcours suivi{learning.length > 1 ? "s" : ""}</p><p><BookOpen size={16} aria-hidden="true" />{domains.length ? domains.join(" · ") : "Les domaines de vos parcours publics apparaîtront ici."}</p></Surface>
    </div>
    <section className="content-section" aria-labelledby="profile-courses-title"><div className="section-heading"><div><p className="eyebrow">Parcours</p><h2 id="profile-courses-title">Parcours créés</h2></div><Link href="/app/courses">Voir tous les parcours</Link></div><div className="profile-page__course-links">{authored.length ? authored.map(({ course }) => <Link key={course.id} href={`/app/courses/${course.slug}`}><PenLine size={15} aria-hidden="true" />{course.title}<span>{course.status === "published" ? "Publié" : course.status === "archived" ? "Archivé" : "Brouillon"}</span></Link>) : <p>Vous n’avez pas encore créé de parcours.</p>}</div></section>
    <section className="content-section" aria-labelledby="profile-collaborations-title"><div className="section-heading"><div><p className="eyebrow"><Users size={15} /> Collaborations</p><h2 id="profile-collaborations-title">Collaborations</h2></div></div><div className="profile-page__course-links">{collaborations.length ? collaborations.map(({ course, collaborationRole }) => <Link key={course.id} href={`/app/courses/${course.slug}`}><Users size={15} aria-hidden="true" />{course.title}<span>{collaborationRole === "editor" ? "Éditeur · Collaboration" : "Lecteur · Partagé avec vous"}{course.author ? ` · Par ${course.author.displayName}` : ""}{course.status === "archived" ? " · Archivé" : ""}</span></Link>) : <p>Aucune collaboration active pour le moment.</p>}</div></section>
  </div>;
}