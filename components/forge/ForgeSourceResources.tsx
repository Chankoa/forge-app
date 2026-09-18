"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { listForgeSourcesAction, uploadForgeSourceAction, type ForgeSourceOption } from "@/app/app/forge/source-actions";
import { Button } from "@/components/ui/Button";

export function ForgeSourceResources({ courseSlug }: { courseSlug: string }) {
  const [sources, setSources] = useState<ForgeSourceOption[]>([]);
  const [message, setMessage] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const load = () => listForgeSourcesAction({ courseSlug, mode: "edit" }).then(setSources);
  useEffect(() => { listForgeSourcesAction({ courseSlug, mode: "edit" }).then(setSources); }, [courseSlug]);
  const upload = () => { if (!file) return; startTransition(async () => { const data = new FormData(); data.set("source", file); const result = await uploadForgeSourceAction(courseSlug, data); setMessage(result.ok ? "Source ajoutée et prête pour Forge." : result.error); if (result.ok) { setFile(null); if (inputRef.current) inputRef.current.value = ""; await load(); window.dispatchEvent(new Event("forge-sources-changed")); } }); };
  return <section className="forge-resource-panel"><h3>Sources du parcours</h3><p className="caption">Les sources TXT et MD prêtes sont sélectionnables dans Forge. Les PDF sans texte extrait restent non exploitables.</p><div className="form"><label>Ajouter un fichier TXT ou MD<input ref={inputRef} name="source" type="file" accept=".txt,.md,text/plain,text/markdown" onChange={(event) => { const selected = event.target.files?.[0] ?? null; setFile(selected); setMessage(""); }} /></label>{file && <p className="caption">Fichier sélectionné : {file.name} ({file.type || "type détecté par extension"}) - {Math.ceil(file.size / 1024)} Ko</p>}<Button type="button" onClick={upload} disabled={Boolean(pending || !file)}>{pending ? "Ajout en cours..." : "Ajouter la source"}</Button></div>{message && <p className={message.includes("ajoutée") ? "completion-state" : "form-error"} role="status">{message}</p>}<ul className="forge-resource-list">{sources.map((source) => <li key={source.id}><strong>{source.title}</strong><span>{source.type} - {source.usable ? "Disponible pour Forge" : source.reason === "not_ready" ? "Préparation en cours" : "Contenu non exploitable par Forge"}</span></li>)}</ul></section>;
}