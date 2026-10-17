import { Button } from "@/components/ui/Button";
import type { CoverFlowState } from "@/lib/forge/orchestrator/cover-flow";
export type CoverStudioHandlers = {
  onBrief: () => void; onPrompt: () => void; onImage: () => void; onAccept: () => void; onCancel: () => void; onAdjust: () => void;
  onEdit: (field: "subject" | "visualDirection" | "mood", value: string) => void; onInstruction: (value: string) => void;
};

const quickAdjustments = ["Plus éditorial", "Moins futuriste", "Sans personnage", "Plus technique", "Composition plus abstraite"];

// Presentational: renders any flow state without side effects, so it can be tested statically.
export function CoverStudioView({ state, handlers }: { state: CoverFlowState; handlers: CoverStudioHandlers }) {
  const busy = state.busy !== null;
  const { brief, prompt, image } = state;
  return <div className="cover-studio" role="region" aria-label="Créer une couverture avec Forge">
    {state.step === "brief" && <div className="cover-studio__step">
      <h3>1. Direction visuelle</h3>
      {!brief && <p className="caption">Forge prépare une direction visuelle à partir du titre, du résumé et des modules du parcours.</p>}
      {!brief && <Button type="button" disabled={busy} onClick={handlers.onBrief}>{state.busy === "brief" ? "Préparation…" : "Préparer la direction visuelle"}</Button>}
      {brief && <>
        <label>Sujet<textarea rows={2} value={brief.subject} disabled={busy} onChange={(event) => handlers.onEdit("subject", event.target.value)} /></label>
        <label>Direction<textarea rows={3} value={brief.visualDirection} disabled={busy} onChange={(event) => handlers.onEdit("visualDirection", event.target.value)} /></label>
        <label>Ambiance<input value={brief.mood} disabled={busy} onChange={(event) => handlers.onEdit("mood", event.target.value)} /></label>
        <p className="caption">Concepts : {brief.keyConcepts.join(", ")}{brief.avoid.length ? ` · À éviter : ${brief.avoid.join(", ")}` : ""}</p>
        <label>Ajuster la direction<input value={state.instruction} placeholder="Ex. Plus éditorial" disabled={busy} onChange={(event) => handlers.onInstruction(event.target.value)} /></label>
        <div className="cover-studio__chips">{quickAdjustments.map((item) => <button key={item} type="button" className="cover-studio__chip" disabled={busy} onClick={() => handlers.onInstruction(item)}>{item}</button>)}</div>
        <div className="cover-studio__actions">
          <Button type="button" variant="secondary" disabled={busy || !state.instruction.trim()} onClick={handlers.onBrief}>{state.busy === "brief" ? "Révision…" : "Réviser la direction"}</Button>
          <Button type="button" disabled={busy} onClick={handlers.onPrompt}>{state.busy === "prompt" ? "Rédaction…" : "Générer le prompt"}</Button>
        </div>
      </>}
    </div>}
    {state.step === "prompt" && prompt && <div className="cover-studio__step">
      <h3>2. Prompt d’image</h3>
      <p className="cover-studio__prompt">{prompt.prompt}</p>
      <p className="caption">Style : {prompt.styleNotes}</p>
      <p className="caption">Texte alternatif suggéré (non enregistré) : {prompt.altText}</p>
      <div className="cover-studio__actions">
        <Button type="button" disabled={busy} onClick={handlers.onImage}>{state.busy === "image" ? "Génération de l’image…" : "Générer l’image"}</Button>
        <Button type="button" variant="secondary" disabled={busy} onClick={handlers.onPrompt}>Régénérer le prompt</Button>
        <Button type="button" variant="ghost" disabled={busy} onClick={handlers.onAdjust}>Modifier la direction</Button>
      </div>
    </div>}
    {state.step === "image" && image && <div className="cover-studio__step">
      <h3>3. Aperçu</h3>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="cover-studio__preview" src={image.previewUrl} alt={prompt?.altText ?? "Aperçu de la couverture générée"} />
      <p className="caption">Aperçu temporaire : rien n’est enregistré tant que vous n’avez pas choisi d’utiliser cette image.</p>
      <div className="cover-studio__actions">
        <Button type="button" disabled={busy} onClick={handlers.onAccept}>{state.busy === "accept" ? "Enregistrement…" : "Utiliser cette image"}</Button>
        <Button type="button" variant="secondary" disabled={busy} onClick={handlers.onImage}>{state.busy === "image" ? "Génération…" : "Régénérer"}</Button>
        <Button type="button" variant="ghost" disabled={busy} onClick={handlers.onAdjust}>Modifier la direction</Button>
      </div>
    </div>}
    {busy && <p className="caption" role="status">Forge travaille…</p>}
    {state.error && <p className="form-error" role="alert">{state.error}</p>}
    <div className="cover-studio__footer"><Button type="button" variant="ghost" disabled={state.busy === "accept"} onClick={handlers.onCancel}>Annuler</Button></div>
  </div>;
}

