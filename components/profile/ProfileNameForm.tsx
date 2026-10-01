"use client";

import { useState, useTransition } from "react";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/Button";

type SaveProfileName = (formData: FormData) => Promise<{ name: string }>;

export function ProfileNameForm({ name, onSave }: { name: string; onSave: SaveProfileName }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const submit = (formData: FormData) => startTransition(async () => {
    try { const result = await onSave(formData); setMessage(`Profil enregistré pour ${result.name}.`); setError(false); }
    catch (cause) { setMessage(cause instanceof Error ? cause.message : "Votre profil n'a pas pu être sauvegardé."); setError(true); }
  });
  return <form className="form authoring-form" action={submit}>
    <label>Nom affiché<input name="name" defaultValue={name} required minLength={2} maxLength={120} disabled={pending} /></label>
    {message && <p className={error ? "form-error" : "completion-state"} role="status">{message}</p>}
    <Button type="submit" disabled={pending}><Save size={16} />{pending ? "Enregistrement…" : "Enregistrer le profil"}</Button>
  </form>;
}