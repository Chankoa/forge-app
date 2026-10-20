"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { dataUrlToFile } from "@/lib/forge/orchestrator/cover-flow";
import { lessonVisualMessages, type CoverImageResult, type CoverPrompt, type VisualBrief } from "@/lib/forge/orchestrator/media-contracts";
import { generateVisualImageAction, prepareVisualBriefAction, prepareVisualPromptAction } from "@/app/app/forge/cover-workflow-actions";
import { acceptGeneratedLessonImageAction } from "@/app/app/courses/lesson-image-actions";
import type { MediaPresentation } from "@/lib/courses/media-contracts";

type Purpose = "figurative" | "conceptual";
type Busy = null | "direction" | "generate" | "accept";
type Resource = Omit<MediaPresentation, "url" | "durationSeconds">;

export function LessonImageStudio({ courseId, lessonId, onClose, onAccepted }: { courseId: string; lessonId: string; onClose: () => void; onAccepted: (resource: Resource, alt: string, caption: string, file: File) => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [purpose, setPurpose] = useState<Purpose>("figurative");
  const [direction, setDirection] = useState("");
  const [mood, setMood] = useState("");
  const [framing, setFraming] = useState("");
  const [realism, setRealism] = useState("");
  const [brief, setBrief] = useState<{ value: VisualBrief; key: string } | null>(null);
  const [prompt, setPrompt] = useState<CoverPrompt | null>(null);
  const [image, setImage] = useState<CoverImageResult | null>(null);
  const [alt, setAlt] = useState("");
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState("");

  useEffect(() => { const node = dialogRef.current; if (node && !node.open) node.showModal(); }, []);

  const key = JSON.stringify([purpose, direction.trim(), mood.trim(), framing.trim(), realism.trim()]);
  const withOptions = (value: VisualBrief): VisualBrief => ({ ...value, mood: mood.trim() || value.mood, composition: framing.trim() || value.composition, imageStyle: realism.trim() || value.imageStyle });

  async function propose() {
    setBusy("direction"); setError("");
    const result = await prepareVisualBriefAction({ courseId, lessonId, purpose, ...(direction.trim() ? { direction: direction.trim() } : {}) });
    setBusy(null);
    if (result.status !== "success" || !result.data) { setError(result.summary || lessonVisualMessages.brief); return; }
    setDirection(result.data.brief.visualDirection);
    setBrief({ value: result.data.brief, key: JSON.stringify([purpose, result.data.brief.visualDirection.trim(), mood.trim(), framing.trim(), realism.trim()]) });
    setPrompt(null);
  }

  async function renderImage(nextPrompt: CoverPrompt) {
    const result = await generateVisualImageAction({ courseId, lessonId, prompt: nextPrompt.prompt, aspectRatio: nextPrompt.aspectRatio });
    if (result.status !== "success" || !result.data) throw new Error(result.summary || lessonVisualMessages.image);
    setImage(result.data);
  }

  async function generate() {
    setBusy("generate"); setError("");
    try {
      let current = brief && brief.key === key ? brief.value : null;
      if (!current) {
        const result = await prepareVisualBriefAction({ courseId, lessonId, purpose, ...(direction.trim() ? { direction: direction.trim() } : {}) });
        if (result.status !== "success" || !result.data) throw new Error(result.summary || lessonVisualMessages.brief);
        current = result.data.brief;
        setBrief({ value: current, key });
        setPrompt(null);
      }
      let nextPrompt = prompt;
      if (!nextPrompt) {
        const result = await prepareVisualPromptAction({ courseId, lessonId, purpose, brief: withOptions(current) });
        if (result.status !== "success" || !result.data) throw new Error(result.summary || lessonVisualMessages.image);
        nextPrompt = result.data.prompt;
        setPrompt(nextPrompt);
        setAlt(nextPrompt.altText);
      }
      await renderImage(nextPrompt);
    } catch (caught) { setError(caught instanceof Error ? caught.message : lessonVisualMessages.image); }
    setBusy(null);
  }

  async function regenerate() {
    if (!prompt) return;
    setBusy("generate"); setError("");
    try { await renderImage(prompt); } catch (caught) { setError(caught instanceof Error ? caught.message : lessonVisualMessages.image); }
    setBusy(null);
  }

  async function accept() {
    if (!image) return;
    const file = dataUrlToFile(image.previewUrl, image.mimeType, "forge-illustration");
    if (!file) { setError(lessonVisualMessages.unusable); return; }
    if (!alt.trim()) { setError(lessonVisualMessages.alt); return; }
    setBusy("accept"); setError("");
    const form = new FormData();
    form.set("file", file); form.set("altText", alt.trim()); form.set("caption", caption.trim());
    const result = await acceptGeneratedLessonImageAction(courseId, lessonId, form);
    setBusy(null);
    if (!result.ok) { setError(result.message); return; }
    onAccepted({ id: result.resource.id, kind: "image", title: result.resource.title, altText: result.resource.altText, caption: result.resource.caption } as Resource, alt.trim(), caption.trim(), file);
    onClose();
  }

  const working = busy !== null;
  const status = busy === "direction" ? "Forge prépare une direction…" : busy === "generate" ? "Forge génère l’image…" : busy === "accept" ? "Enregistrement de l’image…" : "";
  return <dialog ref={dialogRef} className="lesson-image-studio" aria-labelledby="lesson-image-studio-title" onClose={onClose}>
    <div className="lesson-image-studio__panel">
      <header><h3 id="lesson-image-studio-title"><Sparkles size={17} aria-hidden="true" /> Créer une image avec Forge</h3><button type="button" aria-label="Fermer" onClick={onClose}><X size={17} aria-hidden="true" /></button></header>
      <p className="caption">Le contexte de la leçon est utilisé automatiquement. Rien n’est ajouté au contenu avant votre validation.</p>
      {!image && <div className="lesson-image-studio__form">
        <fieldset className="lesson-image-studio__types" disabled={working}><legend>Type</legend>
          <button type="button" aria-pressed={purpose === "figurative"} onClick={() => setPurpose("figurative")}>Figurative</button>
          <button type="button" aria-pressed={purpose === "conceptual"} onClick={() => setPurpose("conceptual")}>Conceptuelle</button>
        </fieldset>
        <label>Direction visuelle<textarea value={direction} maxLength={600} rows={4} disabled={working} placeholder="Décrivez la scène ou l’idée à représenter, ou laissez Forge proposer une direction." onChange={(event) => setDirection(event.target.value)} /></label>
        <Button type="button" variant="secondary" disabled={working} onClick={propose}>Proposer une direction</Button>
        <details className="lesson-image-studio__options"><summary>Options</summary>
          <label>Ambiance<input value={mood} maxLength={120} disabled={working} onChange={(event) => setMood(event.target.value)} /></label>
          <label>Cadrage<input value={framing} maxLength={300} disabled={working} onChange={(event) => setFraming(event.target.value)} /></label>
          <label>Niveau de réalisme<input value={realism} maxLength={160} disabled={working} placeholder="Photographique, illustré…" onChange={(event) => setRealism(event.target.value)} /></label>
        </details>
        <div className="lesson-image-studio__actions"><Button type="button" disabled={working} onClick={generate}>{busy === "generate" ? "Génération…" : "Générer"}</Button><Button type="button" variant="secondary"         disabled={working} onClick={onClose}>Annuler</Button></div>
      </div>}
      {image && <div className="lesson-image-studio__preview">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image.previewUrl} alt={alt.trim() ? `Aperçu de l’image générée : ${alt.trim()}` : "Aperçu de l’image générée"} />
        <label>Texte alternatif (obligatoire)<textarea value={alt} maxLength={250} rows={2} required disabled={working} onChange={(event) => setAlt(event.target.value)} /></label>
        <label>Légende (facultative)<input value={caption} maxLength={300} disabled={working} onChange={(event) => setCaption(event.target.value)} /></label>
        <div className="lesson-image-studio__actions">
          <Button type="button" disabled={working || !alt.trim()} onClick={accept}>Utiliser cette image</Button>
          <Button type="button" variant="secondary" disabled={working} onClick={regenerate}>Régénérer</Button>
          <Button type="button" variant="secondary" disabled={working} onClick={() => { setImage(null); setError(""); }}>Modifier la direction</Button>
          <Button type="button" variant="secondary" disabled={working}           onClick={onClose}>Annuler</Button>
        </div>
      </div>}
      <p className="caption" role="status" aria-live="polite">{status}</p>
      {error && <p className="form-error" role="alert">{error}</p>}
    </div>
  </dialog>;
}
