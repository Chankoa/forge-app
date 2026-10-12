"use client";

import { useRef, useState, useTransition } from "react";
import { ImagePlus, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ProfileAvatar } from "./ProfileAvatar";

type Feedback = { message: string; error: boolean };
const failure = (cause: unknown, fallback: string): Feedback => ({ message: cause instanceof Error ? cause.message : fallback, error: true });

function FeedbackLine({ feedback }: { feedback: Feedback | null }) {
  return feedback ? <p className={feedback.error ? "form-error" : "completion-state"} role="status">{feedback.message}</p> : null;
}

export function ProfileInfoForm({ name, headline, location, onSave }: { name: string; headline: string; location: string; onSave: (formData: FormData) => Promise<{ name: string }> }) {
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const submit = (formData: FormData) => startTransition(async () => {
    try { const result = await onSave(formData); setFeedback({ message: `Profil enregistré pour ${result.name}.`, error: false }); }
    catch (cause) { setFeedback(failure(cause, "Votre profil n'a pas pu être sauvegardé.")); }
  });
  return <form className="form authoring-form" action={submit}>
    <label>Nom affiché<input name="name" defaultValue={name} required minLength={2} maxLength={120} disabled={pending} /></label>
    <label>Titre ou rôle<input name="headline" defaultValue={headline} maxLength={120} placeholder="Créateur de parcours · Design, numérique…" disabled={pending} /></label>
    <label>Lieu<input name="location" defaultValue={location} maxLength={120} placeholder="Ville ou région" disabled={pending} /></label>
    <FeedbackLine feedback={feedback} />
    <Button type="submit" disabled={pending}><Save size={16} aria-hidden="true" />{pending ? "Enregistrement…" : "Enregistrer"}</Button>
  </form>;
}

export function ProfileBioForm({ bio, onSave }: { bio: string; onSave: (formData: FormData) => Promise<unknown> }) {
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const submit = (formData: FormData) => startTransition(async () => {
    try { await onSave(formData); setFeedback({ message: "Présentation enregistrée.", error: false }); }
    catch (cause) { setFeedback(failure(cause, "Votre présentation n'a pas pu être sauvegardée.")); }
  });
  return <form className="form authoring-form" action={submit}>
    <label>Présentation<textarea name="bio" defaultValue={bio} rows={5} maxLength={1200} placeholder="Quelques lignes sur votre parcours et vos intérêts." disabled={pending} /></label>
    <p className="caption">Texte brut, 1 200 caractères maximum.</p>
    <FeedbackLine feedback={feedback} />
    <Button type="submit" disabled={pending}><Save size={16} aria-hidden="true" />{pending ? "Enregistrement…" : "Enregistrer la présentation"}</Button>
  </form>;
}

export function ProfileDomainsForm({ options, selected, onSave }: { options: Array<{ id: string; name: string }>; selected: string[]; onSave: (ids: string[]) => Promise<unknown> }) {
  const [pending, startTransition] = useTransition();
  const [ids, setIds] = useState<string[]>(selected);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const toggle = (id: string) => setIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  const save = () => startTransition(async () => {
    try { await onSave(ids); setFeedback({ message: "Domaines enregistrés.", error: false }); }
    catch (cause) { setFeedback(failure(cause, "Vos domaines n'ont pas pu être mis à jour.")); }
  });
  if (!options.length) return <p className="caption">Aucun domaine n’est disponible pour le moment.</p>;
  return <div className="profile-domains">
    <ul className="profile-domains__list" aria-label="Domaines disponibles">{options.map((option) => <li key={option.id}><button type="button" aria-pressed={ids.includes(option.id)} disabled={pending} onClick={() => toggle(option.id)}>{option.name}</button></li>)}</ul>
    <FeedbackLine feedback={feedback} />
    <Button type="button" disabled={pending} onClick={save}><Save size={16} aria-hidden="true" />{pending ? "Enregistrement…" : "Enregistrer les domaines"}</Button>
  </div>;
}

export function ProfileAvatarForm({ name, avatarUrl, onUpload, onRemove }: { name: string; avatarUrl: string | null; onUpload: (formData: FormData) => Promise<{ avatarUrl: string; cleanupWarning?: string | null }>; onRemove: () => Promise<{ cleanupWarning?: string | null }> }) {
  const input = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [url, setUrl] = useState(avatarUrl);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const upload = (file: File | undefined) => {
    if (!file) return;
    const data = new FormData();
    data.set("avatar", file);
    startTransition(async () => {
      try { const result = await onUpload(data); setUrl(result.avatarUrl); setFeedback({ message: result.cleanupWarning ?? "Photo de profil mise à jour.", error: false }); }
      catch (cause) { setFeedback(failure(cause, "Le téléversement a échoué.")); }
    });
    if (input.current) input.current.value = "";
  };
  const remove = () => startTransition(async () => {
    try { const result = await onRemove(); setUrl(null); setFeedback({ message: result.cleanupWarning ?? "Photo supprimée.", error: false }); }
    catch (cause) { setFeedback(failure(cause, "La photo n'a pas pu être supprimée.")); }
  });
  return <div className="profile-avatar-form">
    <ProfileAvatar name={name} url={url} size="lg" />
    <div>
      <p className="caption">JPEG, PNG ou WebP, 2 Mo maximum.</p>
      <input ref={input} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" aria-label="Choisir une photo de profil" tabIndex={-1} disabled={pending} onChange={(event) => upload(event.target.files?.[0])} />
      <div className="profile-avatar-form__actions">
        <Button type="button" variant="secondary" disabled={pending} onClick={() => input.current?.click()}><ImagePlus size={16} aria-hidden="true" />Changer la photo</Button>
        {url && <Button type="button" variant="ghost" disabled={pending} onClick={remove}><Trash2 size={16} aria-hidden="true" />Supprimer la photo</Button>}
      </div>
      <FeedbackLine feedback={feedback} />
    </div>
  </div>;
}
