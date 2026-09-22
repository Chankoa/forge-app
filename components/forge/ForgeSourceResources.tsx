"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { addForgeUrlSourceAction, listForgeSourcesAction, uploadForgeSourceAction, type ForgeSourceOption } from "@/app/app/forge/source-actions";
import { Button } from "@/components/ui/Button";

export function ForgeSourceResources({ courseSlug }: { courseSlug: string }) {
  const [sources, setSources] = useState<ForgeSourceOption[]>([]);
  const [message, setMessage] = useState("");
  const [kind, setKind] = useState<"file" | "url">("file");
  const [url, setUrl] = useState("");
  const [phase, setPhase] = useState<"idle" | "validating" | "fetching" | "processing" | "ready" | "failed">("idle");
  const [file, setFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const load = () => listForgeSourcesAction({ courseSlug, mode: "edit" }).then(setSources);
  useEffect(() => { listForgeSourcesAction({ courseSlug, mode: "edit" }).then(setSources); }, [courseSlug]);
  const finished = async () => { await load(); window.dispatchEvent(new Event("forge-sources-changed")); };
  const upload = () => { if (!file) return; startTransition(async () => { const data = new FormData(); data.set("source", file); const result = await uploadForgeSourceAction(courseSlug, data); setMessage(result.ok ? "Source prête" : result.error); if (result.ok) { setFile(null); if (inputRef.current) inputRef.current.value = ""; await finished(); } }); };
  const addUrl = () => { setPhase("validating"); setMessage(""); let parsed: URL; try { parsed = new URL(url); if (!["http:", "https:"].includes(parsed.protocol)) throw new Error(); } catch { setPhase("failed"); setMessage("URL non valide"); return; }
    startTransition(async () => { setPhase("fetching"); const result = await addForgeUrlSourceAction(courseSlug, url); setPhase(result.ok ? "ready" : "failed"); setMessage(result.ok ? "Source prête" : result.error); if (result.ok) { setUrl(""); await finished(); } });
  };
  return <section className="forge-resource-panel"><h3>Sources du parcours</h3><p className="caption">Ajoutez un fichier TXT ou MD, ou une page Web publique. Les sources prêtes sont sélectionnables dans Forge.</p>
    <div className="forge-source-kind" role="group" aria-label="Type de source"><button type="button" className={kind === "file" ? "is-active" : ""} aria-pressed={kind === "file"} onClick={() => { setKind("file"); setMessage(""); }}>Fichier</button><button type="button" className={kind === "url" ? "is-active" : ""} aria-pressed={kind === "url"} onClick={() => { setKind("url"); setMessage(""); }}>URL</button></div>
    {kind === "file" ? <div className="form"><label>Ajouter un fichier TXT ou MD<input ref={inputRef} name="source" type="file" accept=".txt,.md,text/plain,text/markdown" onChange={(event) => { setFile(event.target.files?.[0] ?? null); setMessage(""); }} /></label>{file && <p className="caption">Fichier sélectionné : {file.name} ({file.type || "type détecté par extension"}) - {Math.ceil(file.size / 1024)} Ko</p>}<Button type="button" onClick={upload} disabled={Boolean(pending || !file)}>{pending ? "Ajout en cours..." : "Ajouter la source"}</Button></div>
      : <div className="form forge-url-form"><label htmlFor="forge-source-url">URL publique</label><input id="forge-source-url" type="url" inputMode="url" placeholder="https://..." value={url} maxLength={2048} onChange={(event) => { setUrl(event.target.value); setPhase("idle"); setMessage(""); }} /><Button type="button" onClick={addUrl} disabled={pending || !url.trim()}>{pending ? "Ajout en cours..." : "Ajouter la source"}</Button></div>}
    {kind === "url" && ["validating", "fetching", "processing"].includes(phase) && <p className="caption" role="status">{phase === "validating" ? "Validation de l’URL..." : phase === "fetching" ? "Récupération de la page..." : "Extraction du texte..."}</p>}
    {message && <p className={message === "Source prête" ? "completion-state" : "form-error"} role="status">{message}</p>}
    <ul className="forge-resource-list">{sources.map((source) => <li key={source.id}><strong>{source.title}</strong>{source.url && <span className="forge-resource-url" title={source.url}>{source.url}</span>}<span>{source.type} - {source.usable ? "Disponible pour Forge" : source.reason === "not_ready" ? "Préparation en cours" : "Contenu non exploitable par Forge"}</span></li>)}</ul></section>;
}
