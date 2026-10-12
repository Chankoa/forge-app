import Link from "next/link";
import { BookOpen, GraduationCap, MapPin, PenLine, Settings, Users } from "lucide-react";
import { ProfileAvatarForm, ProfileBioForm, ProfileDomainsForm, ProfileInfoForm } from "@/components/profile/ProfileForms";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { removeProfileAvatarAction, saveProfileBioAction, saveProfileDomainsAction, saveProfileInfoAction, uploadProfileAvatarAction } from "./actions";
import { getSelfProfile, listProfileDomainOptions } from "@/lib/profiles/self-profile-repository";
import { courseOwnerLabel } from "@/lib/profiles/author-identity";
import { profileCourseSections } from "@/lib/profiles/profile-projections";
import { listMyCourses } from "@/lib/courses/learning-repository";
import { Surface } from "@/components/ui/Surface";

export default async function ProfilePage() {
  const [profile, courses, domainOptions] = await Promise.all([getSelfProfile(), listMyCourses(), listProfileDomainOptions()]);
  if (!profile) return <p className="env-note">Votre profil est indisponible. Actualisez la page ou reconnectez-vous.</p>;
  const name = profile.name?.trim() || "Auteur Forge";
  const { authored, collaborations, learning } = profileCourseSections(courses);
  const selectedDomains = domainOptions.filter((option) => profile.domainIds.includes(option.id));
  return <div className="profile-page">
    <header className="profile-hero">
      <ProfileAvatar name={name} url={profile.avatarUrl} size="lg" />
      <div className="profile-hero__identity"><p className="eyebrow">Votre identité Forge</p><h1>{name}</h1>{profile.headline && <p className="profile-hero__headline">{profile.headline}</p>}{profile.location && <p className="profile-hero__location"><MapPin size={15} aria-hidden="true" />{profile.location}</p>}</div>
      <Link className="profile-hero__settings" href="/app/settings"><Settings size={16} aria-hidden="true" />Paramètres</Link>
    </header>
    <nav className="profile-tabs" aria-label="Sections du profil"><a href="#profile-info">Informations</a><a href="#profile-about">À propos</a><a href="#profile-domains">Domaines</a><Link href="/app/settings">Paramètres</Link></nav>
    <div className="profile-page__grid">
      <Surface className="profile-page__identity" id="profile-info"><h2>Informations</h2><ProfileAvatarForm name={name} avatarUrl={profile.avatarUrl} onUpload={uploadProfileAvatarAction} onRemove={removeProfileAvatarAction} /><ProfileInfoForm name={name} headline={profile.headline ?? ""} location={profile.location ?? ""} onSave={saveProfileInfoAction} /></Surface>
      <div className="profile-page__stack">
        <Surface id="profile-about"><h2>À propos</h2><ProfileBioForm bio={profile.bio ?? ""} onSave={saveProfileBioAction} /></Surface>
        <Surface id="profile-domains"><h2>Domaines</h2>{selectedDomains.length > 0 && <p className="caption">Sélection actuelle : {selectedDomains.map((domain) => domain.name).join(" · ")}</p>}<ProfileDomainsForm options={domainOptions} selected={profile.domainIds} onSave={saveProfileDomainsAction} /></Surface>
        <Surface className="profile-page__summary"><h2>Votre activité</h2><p><PenLine size={16} aria-hidden="true" />{authored.length} parcours créé{authored.length > 1 ? "s" : ""}</p><p><GraduationCap size={16} aria-hidden="true" />{learning.length} parcours suivi{learning.length > 1 ? "s" : ""}</p><p><BookOpen size={16} aria-hidden="true" />{collaborations.length} collaboration{collaborations.length > 1 ? "s" : ""}</p></Surface>
      </div>
    </div>
    <section className="content-section" aria-labelledby="profile-courses-title"><div className="section-heading"><div><p className="eyebrow">Parcours</p><h2 id="profile-courses-title">Parcours créés</h2></div><Link href="/app/courses">Voir tous les parcours</Link></div><div className="profile-page__course-links">{authored.length ? authored.map(({ course }) => <Link key={course.id} href={`/app/courses/${course.slug}`}><PenLine size={15} aria-hidden="true" />{course.title}<span>{courseOwnerLabel(course.author?.displayName)} · Je crée · {course.status === "published" ? "Publié" : course.status === "archived" ? "Archivé" : "Brouillon"}</span></Link>) : <p>Vous n’avez pas encore créé de parcours.</p>}</div></section>
    <section className="content-section" aria-labelledby="profile-collaborations-title"><div className="section-heading"><div><p className="eyebrow"><Users size={15} /> Collaborations</p><h2 id="profile-collaborations-title">Collaborations</h2></div></div><div className="profile-page__course-links">{collaborations.length ? collaborations.map(({ course, collaborationRole }) => <Link key={course.id} href={`/app/courses/${course.slug}`}><Users size={15} aria-hidden="true" />{course.title}<span>{collaborationRole === "editor" ? "Éditeur · Collaboration" : "Lecteur · Partagé avec vous"}{course.author ? ` · Par ${course.author.displayName}` : ""}{course.status === "archived" ? " · Archivé" : ""}</span></Link>) : <p>Aucune collaboration active pour le moment.</p>}</div></section>
  </div>;
}
