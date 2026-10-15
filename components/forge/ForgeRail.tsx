"use client";

import { WorkspaceRail } from "@/components/course/WorkspacePanels";
import { useEffect, useRef, useState, useTransition } from "react";
import { BookOpen, MessageCircle, SearchCheck, Sparkles } from "lucide-react";
import { generateForgeAction } from "@/app/app/forge/actions";
import { listForgeSourcesAction, type ForgeSourceOption } from "@/app/app/forge/source-actions";
import type { ForgeAvailability, ForgeIntent, ForgeRailContext, ForgeResponse, ForgeResult } from "@/lib/forge/contracts";
import { forgeResultAfterResponse } from "@/lib/forge/result-state";
import { useForgeProposal } from "./ForgeProposalContext";
import { ForgeProposalDialog } from "./ForgeProposalDialog";
import { ContentIntelligence } from "./ContentIntelligence";
import { CurriculumAnalysis } from "./CurriculumAnalysis";
import { deriveForgeSuggestions } from "@/lib/forge/contextual-suggestions";
import type { CourseDetail } from "@/lib/courses/contracts";
import type { MediaPresentation } from "@/lib/courses/media-contracts";
import { forgeLessonContentEvent, forgeLessonSavedEvent } from "@/lib/forge/lesson-content-event";
import { forgeContextLabels, forgeErrorMessages, forgeProposalStates } from "@/lib/forge/authoring-ux";
import { dispatchToast } from "@/lib/ui/toast";

const learnIntents: Array<{ label: string; value: ForgeIntent }> = [
  { label: "Expliquer", value: "explain" }, { label: "Clarifier", value: "clarify" }, { label: "Reformuler", value: "rephrase" }, { label: "Donner un exemple", value: "example" }, { label: "Me questionner", value: "quiz" },
];
const errors: Record<string, string> = forgeErrorMessages;

type ForgeLessonResource = Pick<MediaPresentation, "id" | "kind" | "title" | "altText" | "caption" | "status">;

function sourceLocationLabel(source: ForgeSourceOption) {
  if (source.type !== "URL" || !source.url) return null;
  try {
    return new URL(source.url).hostname;
  } catch {
    return null;
  }
}

export function ForgeRail({ context, availability, course, lessonResources = [] }: { context: ForgeRailContext; availability: ForgeAvailability; course?: CourseDetail; lessonResources?: ForgeLessonResource[] }) {

  const [pending, startTransition] = useTransition();
  const [activeIntent, setActiveIntent] = useState<ForgeIntent | null>(null);
  const [result, setResult] = useState<ForgeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sources, setSources] = useState<ForgeSourceOption[]>([]);
  const [sourceIds, setSourceIds] = useState<string[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [applying, setApplying] = useState(false);
  const applyingRef = useRef(false);
  const [confirmation, setConfirmation] = useState("");
  const [lastRequest, setLastRequest] = useState<{ intent: ForgeIntent; input?: string; sourceIds: string[] } | null>(null);
  const [activeTab, setActiveTab] = useState<"suggestions" | "analysis" | "resources" | "chat">("suggestions");
  const [chatMessages, setChatMessages] = useState<Array<{ role: "user" | "assistant"; text: string }>>([]);
  const [chatInput, setChatInput] = useState("");
  const { setProposal, applyLessonProposal } = useForgeProposal();

  useEffect(() => {
    if (!context.lessonId) return;
    const onSaved = (event: Event) => {
      if ((event as CustomEvent<{ lessonId: string }>).detail.lessonId !== context.lessonId) return;
      setError(null);
      setConfirmation("");
    };
    window.addEventListener(forgeLessonSavedEvent, onSaved);
    return () => window.removeEventListener(forgeLessonSavedEvent, onSaved);
  }, [context.lessonId]);

  useEffect(() => {
    let active = true;
    const load = () => listForgeSourcesAction({ courseSlug: context.courseSlug, mode: context.mode }).then((options) => { if (active) setSources(options); });
    load();
    window.addEventListener("forge-sources-changed", load);
    return () => { active = false; window.removeEventListener("forge-sources-changed", load); };
  }, [context.courseSlug, context.mode]);


  const run = (intent: ForgeIntent, freeInput?: string, keepCurrent = false, requestedSourceIds = sourceIds, onResponse?: (response: ForgeResult) => void) => startTransition(async () => {
    setActiveIntent(intent); setError(null); setConfirmation(""); if (!keepCurrent) { setResult(null); setProposal(null); }
    try {
      const response: ForgeResponse = await generateForgeAction({ mode: context.mode, intent, courseSlug: context.courseSlug, lessonSlug: context.lessonSlug, sourceIds: requestedSourceIds, input: freeInput });
      setResult((current) => forgeResultAfterResponse(current, response));
      if (!response.ok) { setError(response.error === "invalid_result" ? "La proposition n’a pas pu être générée complètement. Vous pouvez réessayer." : errors[response.error]); return; }
      setLastRequest({ intent, input: freeInput, sourceIds: requestedSourceIds });
      onResponse?.(response.result);
      if (response.result.mode === "edit" && "proposal" in response.result) setDialogOpen(true);
    } catch {
      setError("Forge n’a pas pu terminer la demande. Vous pouvez réessayer.");
    } finally { setActiveIntent(null); }
  });
  useEffect(() => {
    const generate = () => {
      if (context.mode !== "edit" || !context.lessonSlug || pending) return;
      run("generate_content", undefined, false, sourceIds.length ? sourceIds : sources.filter((source) => source.usable).slice(0, 4).map((source) => source.id));
    };
    window.addEventListener(forgeLessonContentEvent, generate);
    return () => window.removeEventListener(forgeLessonContentEvent, generate);
  });
  const proposal = result?.mode === "edit" && "proposal" in result ? result : null;
  const toggleSource = (id: string) => setSourceIds((ids) => ids.includes(id) ? ids.filter((value) => value !== id) : [...ids, id]);
  const usableSources = sources.filter((source) => source.usable);
  const generationSourceIds = sourceIds.length ? sourceIds : usableSources.slice(0, 4).map((source) => source.id);
  const contextLabels = forgeContextLabels(context, sourceIds.length, context.lessonSlug ? usableSources.length : 0);
  const suggestions = deriveForgeSuggestions(context);
  const submitChat = (value: string) => {
    const question = value.trim();
    if (!question || pending) return;
    setActiveTab("chat");
    setChatMessages((current) => [...current, { role: "user", text: question }]);
    setChatInput("");
    run("ask", question, false, sourceIds, (response) => setChatMessages((current) => [...current, { role: "assistant", text: response.text }]));
  };
  const tabs = [
    { id: "suggestions" as const, label: "Suggestions", icon: Sparkles },
    { id: "analysis" as const, label: "Analyse", icon: SearchCheck },
    { id: "resources" as const, label: "Ressources", icon: BookOpen },
    { id: "chat" as const, label: "Chat", icon: MessageCircle },
  ];

  return <WorkspaceRail panel="forge">
      <h2>{context.mode === "learn" ? "Comprendre avec Forge" : context.lessonSlug ? "Forge pour cette leçon" : "Forge pour ce parcours"}</h2><p className="caption">Contexte : {context.lessonTitle ?? context.courseTitle}{context.moduleTitle ? ` · ${context.moduleTitle}` : ""}</p>
      <div className="forge-context-tabs" role="tablist" aria-label="Espaces Forge">
        {tabs.map(({ id, label, icon: Icon }) => <button key={id} id={`forge-tab-${id}`} type="button" role="tab" aria-selected={activeTab === id} aria-controls="forge-panel-content" tabIndex={activeTab === id ? 0 : -1} onKeyDown={(event) => {
          if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
          event.preventDefault();
          const currentIndex = tabs.findIndex((tab) => tab.id === activeTab);
          const nextIndex = event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : (currentIndex + (event.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length;
          setActiveTab(tabs[nextIndex].id);
          requestAnimationFrame(() => document.getElementById(`forge-tab-${tabs[nextIndex].id}`)?.focus());
        }} onClick={() => setActiveTab(id)}><Icon size={15} aria-hidden="true" />{label}</button>)}
      </div>
      <section id="forge-panel-content" className="forge-tab-panel" role="tabpanel" aria-labelledby={`forge-tab-${activeTab}`} tabIndex={0}>
        {activeTab === "suggestions" && <section className="forge-suggestion-list" aria-label="Suggestions contextualisées">
          {context.mode === "learn" && <div className="forge-intents">{learnIntents.filter(({ value }) => value !== "ask").map((item) => <button type="button" key={item.value} disabled={Boolean(pending || availability === "not_configured")} onClick={() => run(item.value)}>{item.label}</button>)}</div>}
          {suggestions.length === 0 && <p className="caption">Aucune suggestion déterministe pour ce contexte. Vous pouvez demander à Forge d’examiner un point précis dans l’onglet Chat.</p>}
          {suggestions.map((suggestion) => <article className="forge-suggestion" key={suggestion.id}>
            <h3>{suggestion.title}</h3><p>{suggestion.explanation}</p>
            <p className="forge-suggestion__evidence">{suggestion.evidence}</p>
            <p className="caption"><strong>Cible :</strong> {suggestion.target}</p>
            <p className="caption"><strong>Changement prévu :</strong> {suggestion.intendedChange}</p>
            <p className="caption"><strong>Application :</strong> {suggestion.application === "local_draft" ? "Brouillon local après examen et application explicites." : "Discussion uniquement ; aucun contenu ne sera modifié."}</p>
            <button type="button" className="button button--secondary" disabled={Boolean(pending || availability === "not_configured")} onClick={() => suggestion.action === "ask"
              ? submitChat(`À propos de ${suggestion.target} : ${suggestion.explanation} ${suggestion.evidence} ${suggestion.intendedChange}`)
              : run(suggestion.action, undefined, false, suggestion.action === "generate_content" ? generationSourceIds : sourceIds)}>{suggestion.actionLabel}</button>
          </article>)}
        </section>}
        {activeTab === "analysis" && <div className="forge-analysis">
          {context.mode === "edit" && context.lessonSlug && context.lessonId
            ? <ContentIntelligence courseSlug={context.courseSlug} lessonSlug={context.lessonSlug} lessonId={context.lessonId} level={context.level} hasContent={context.hasLessonContent ?? false} sourceIds={sourceIds} availability={availability} />
            : context.mode === "edit" && course
              ? <CurriculumAnalysis course={course} />
              : <p className="caption">L’analyse pédagogique est disponible dans un contexte de gestion.</p>}
          {context.mode === "edit" && <section className="forge-context" aria-labelledby="forge-context-title"><h3 id="forge-context-title">Contexte utilisé</h3><ul>{contextLabels.map((label) => <li key={label}>{label}</li>)}</ul></section>}
        </div>}
        {activeTab === "resources" && <section className="forge-resource-list" aria-labelledby="forge-resources-title">
          <h3 id="forge-resources-title">Ressources de ce contexte</h3>
          <p className="caption">Les sources sélectionnées servent de contexte aux demandes à Forge. La gestion complète reste dans Bibliothèque.</p>
          <h4>Sources du parcours</h4>
          {sources.length === 0 ? <p className="caption">Aucune source ajoutée au parcours.</p> : <ul>{sources.map((source) => {
            const location = sourceLocationLabel(source);
            return <li key={source.id}>
              <label><input type="checkbox" checked={sourceIds.includes(source.id)} disabled={!source.usable || pending} onChange={() => toggleSource(source.id)} /><span><strong>{source.title}</strong><small>{source.type}{location ? ` · ${location}` : ""} · {source.usable ? "Disponible pour Forge" : source.reason === "not_ready" ? "Préparation en cours" : "Contenu non exploitable"}</small></span></label>
            </li>;
          })}</ul>}
          <h4>Médias de cette leçon</h4>
          {lessonResources.length === 0 ? <p className="caption">Aucun média référencé dans cette leçon.</p> : <ul>{lessonResources.map((resource) => <li key={resource.id}>
            <span><strong>{resource.title || resource.altText || resource.caption || (resource.kind === "image" ? "Image" : resource.kind === "audio" ? "Audio" : "Vidéo")}</strong><small>{resource.kind === "image" ? "Image" : resource.kind === "audio" ? "Audio" : "Vidéo"} · {resource.status === "ready" ? "Disponible dans la leçon" : "Média indisponible"}</small></span>
          </li>)}</ul>}
        </section>}
        {activeTab === "chat" && <section className="forge-chat" aria-label="Conversation contextuelle avec Forge">
          <p className="caption">Conversation V1 liée à ce contexte, conservée uniquement dans cette session. Une réponse n’applique rien ; toute proposition de modification reste à examiner.</p>
          {chatMessages.length > 0 && <ol className="forge-chat__messages" aria-live="polite">{chatMessages.map((message, index) => <li className={`forge-chat__message forge-chat__message--${message.role}`} key={`${index}:${message.role}`}><strong>{message.role === "user" ? "Vous" : "Forge"}</strong><p>{message.text}</p></li>)}</ol>}
          <form className="forge-chat__form" onSubmit={(event) => { event.preventDefault(); submitChat(chatInput); }}>
            <label htmlFor="forge-chat-input">Votre question</label><textarea id="forge-chat-input" value={chatInput} onChange={(event) => setChatInput(event.target.value)} maxLength={2000} placeholder={context.lessonTitle ? `Que souhaitez-vous comprendre sur « ${context.lessonTitle} » ?` : "Posez une question sur ce parcours..."} />
            <button type="submit" className="button button--secondary" disabled={Boolean(pending || availability === "not_configured" || !chatInput.trim())}>{pending && activeIntent === "ask" ? "Forge répond..." : "Envoyer"}</button>
          </form>
        </section>}
      </section>
      {pending && <p className="forge-pending" role="status" aria-live="polite" aria-busy="true"><span aria-hidden="true" />{activeIntent === "improve" ? context.lessonSlug ? "Forge prépare une amélioration…" : "Forge améliore le parcours…" : activeIntent === "ask" ? "Forge prépare une réponse…" : "Forge prépare une proposition…"}</p>}{error && !dialogOpen && <p className="form-error" role="alert">{error}</p>}{confirmation && <p className="completion-state" role="status">{confirmation}</p>}
      {result && activeTab !== "chat" && <section className="forge-result"><p className="eyebrow">{proposal ? forgeProposalStates.generated : "Réponse Forge"}</p><div className="forge-result__text" tabIndex={0}>{result.text}</div><button type="button" className="button button--secondary" onClick={() => setDialogOpen(true)}>{proposal ? "Examiner la proposition" : "Ouvrir la réponse"}</button>{result.sourcesUsed.length > 0 && <p className="caption">Contexte utilisé · {result.sourcesUsed.map((source) => source.title).join(", ")}</p>}</section>}
      <p className="caption">{availability === "not_configured" ? forgeErrorMessages.not_configured : "Forge ne modifie jamais le contenu sans votre application et sauvegarde explicites."}</p>
      <ForgeProposalDialog result={dialogOpen ? result : null} busy={pending || applying} applying={applying} error={dialogOpen ? error : null} onClose={() => { if (!applyingRef.current) setDialogOpen(false); }} onReject={() => { setDialogOpen(false); setResult(null); setProposal(null); }} onApply={() => { if (!proposal || applyingRef.current) return; applyingRef.current = true; setApplying(true); try { const applied = context.lessonId ? applyLessonProposal(context.lessonId, proposal) : (setProposal(proposal), true); if (!applied) { setError("La modification n'a pas pu être appliquée."); return; } setError(null); setConfirmation(`${forgeProposalStates.applied}. Sauvegardez pour enregistrer.`); if (!context.lessonId) dispatchToast("Modification appliquée au brouillon."); setDialogOpen(false); setResult(null); } catch { setError("La modification n'a pas pu être appliquée."); } finally { applyingRef.current = false; setApplying(false); } }} onRegenerate={() => { if (lastRequest) run(lastRequest.intent, lastRequest.input, true, lastRequest.sourceIds); }} onAdjust={(adjustment) => { if (!lastRequest || !proposal) return; run(lastRequest.intent, `${lastRequest.input ?? ""}\n\nAjustement demandé : ${adjustment}\n\nProposition à améliorer :\n${proposal.proposal.patch.content ?? proposal.proposal.patch.description ?? proposal.text}`, true, lastRequest.sourceIds); }} />
  </WorkspaceRail>;
}
