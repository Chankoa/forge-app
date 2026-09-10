"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { listForgeSourcesAction, uploadForgeSourceAction, type ForgeSourceOption } from "@/app/app/forge/source-actions";
import { Button } from "@/components/ui/Button";

export function ForgeSourceResources({ courseSlug }: { courseSlug: string }) {
  const [sources, setSources] = useState<ForgeSourceOption[]>([]);
  const [message, setMessage] = useState("");
  const [file, setFile] = useState<{ name: string; type: string } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const load = () => listForgeSourcesAction({ courseSlug, mode: "edit" }).then(setSources);
  useEffect(() => { listForgeSourcesAction({ courseSlug, mode: "edit" }).then(setSources); }, [courseSlug]);
  return <section className="forge-resource-panel"><h3>Sources du parcours</h3><p className="caption">Les sources TXT et MD prêtes sont sélectionnables dans Forge. Les PDF sans texte extrait restent non exploitables.</p><form ref={formRef} className="form" action={(data) => startTransition(async () => { const result = await uploadForgeSourceAction(courseSlug, data); setMessage(result.ok ? "Source ajoutée et prête pour Forge." : result.error); if (result.ok) { setFile(null); formRef.current?.reset(); load(); } })}><label>Ajouter un fichier TXT ou MD<input name="source" type="file" accept=".txt,.md,text/plain,text/markdown" required onChange={(event) => { const selected = event.target.files?.[0]; setFile(selected ? { name: selected.name, type: selected.type || "type non renseigné" } : null); }} /></label>{file && <p className="caption">Fichier sélectionné : {file.name} ({file.type})</p>}<Button type="submit" disabled={Boolean(pending || !file)}>{pending ? "Ajout en cours..." : "Ajouter la source"}</Button></form>{message && <p className={message.includes("ajoutée") ? "completion-state" : "form-error"} role="status">{message}</p>}<ul className="forge-resource-list">{sources.map((source) => <li key={source.id}><strong>{source.title}</strong><span>{source.type} - {source.usable ? "Disponible pour Forge" : source.reason === "not_ready" ? "Préparation en cours" : "Contenu non exploitable par Forge"}</span></li>)}</ul></section>;
}